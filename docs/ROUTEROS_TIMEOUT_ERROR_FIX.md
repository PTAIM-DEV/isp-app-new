# Fix: RosException Timeout UncaughtException

## Masalah

Error `RosException: Timed out after 5000 seconds` terjadi berulang kali sebagai uncaughtException:
```
RosException: Timed out after 5000 seconds
    at ignore-listed frames {
  errno: 'SOCKTMOUT'
}
⨯ uncaughtException: RosException: Timed out after 5000 seconds
```

## Root Cause

1. **Timeout di routeros-client library** tidak di-handle dengan baik
2. Error menjadi **uncaughtException** karena tidak di-catch
3. Connection yang timeout tidak di-cleanup, menyebabkan error berulang
4. Error handling di `safeWrite` dan `connect` tidak menangani `SOCKTMOUT` errno

## Solusi yang Diimplementasikan

### 1. Enhanced Error Handling di `safeWrite()`

```typescript
catch (error: any) {
  // Handle timeout errors
  if (error.errno === 'SOCKTMOUT' || 
      error.message?.includes('Timed out') ||
      error.message?.includes('timeout') ||
      error.name === 'RosException' && error.errno === 'SOCKTMOUT') {
    console.error(`[RouterOS] Timeout error for command ${command}:`, {
      errno: error.errno,
      message: error.message
    });
    // Wrap timeout error dengan message yang lebih jelas
    throw new Error(`RouterOS operation timeout: ${command} - ${error.message || 'Connection timeout'}`);
  }
  // ... other error handling
}
```

### 2. Enhanced Error Handling di `connect()`

```typescript
try {
  await conn.connect();
} catch (connectError: any) {
  // Handle timeout during connection
  if (connectError.errno === 'SOCKTMOUT' || 
      connectError.message?.includes('Timed out') ||
      connectError.name === 'RosException' && connectError.errno === 'SOCKTMOUT') {
    console.error(`[RouterOS] Connection timeout for server ${serverId}:`, {
      host: config.host,
      port: config.port,
      timeout: config.timeout,
      errno: connectError.errno
    });
    
    // Update error status
    await prisma.mikrotikServer.update({
      where: { id: serverId },
      data: {
        connectionStatus: 'ERROR',
        errorMessage: `Connection timeout: ${connectError.message || 'Unable to connect within timeout period'}`
      }
    });
    
    throw new Error(`Connection timeout to ${config.host}:${config.port} - ${connectError.message || 'Connection timeout'}`);
  }
  throw connectError;
}
```

### 3. Connection Cleanup di `getConnection()`

```typescript
if (conn && conn.connected) {
  try {
    await this.safeWrite(conn, '/system/identity/print', []);
    return conn;
  } catch (error: any) {
    // Connection is dead or timeout, remove it
    console.warn(`[RouterOS] Connection test failed for server ${serverId}, removing connection:`, {
      error: error.message,
      errno: error.errno
    });
    
    // Clean up dead connection
    try {
      if (conn && conn.connected) {
        await conn.close();
      }
    } catch (closeError) {
      // Ignore close errors
    }
    
    this.connections.delete(serverId);
    conn = undefined;
  }
}
```

### 4. Connection Cleanup di `getHotspotUser()` dan `removeHotspotUser()`

```typescript
try {
  const users = await this.safeWrite(conn, '/ip/hotspot/user/print', [
    `?name=${username}`
  ]);
  // ... process users
} catch (error: any) {
  // If timeout or connection error, mark connection as dead
  if (error.errno === 'SOCKTMOUT' || 
      error.message?.includes('timeout') ||
      error.message?.includes('Connection timeout')) {
    console.error(`[RouterOS] Timeout during getHotspotUser for ${username}, removing connection:`, {
      serverId,
      error: error.message
    });
    // Remove dead connection
    this.connections.delete(serverId);
    try {
      if (conn && conn.connected) {
        await conn.close();
      }
    } catch (closeError) {
      // Ignore close errors
    }
  }
  throw error;
}
```

## Hasil

1. ✅ **Timeout errors di-catch dengan baik** - tidak lagi menjadi uncaughtException
2. ✅ **Connection cleanup** - connection yang timeout dihapus dari pool
3. ✅ **Better error messages** - error message lebih jelas dan informatif
4. ✅ **Server status update** - server status di-update ke ERROR jika timeout
5. ✅ **Logging detail** - semua timeout error di-log dengan detail

## Log yang Akan Muncul

### Sebelum (uncaughtException):
```
RosException: Timed out after 5000 seconds
⨯ uncaughtException: RosException: Timed out after 5000 seconds
```

### Sesudah (handled error):
```
[RouterOS] Timeout error for command /ip/hotspot/user/print: {
  errno: 'SOCKTMOUT',
  message: 'Timed out after 5000 seconds'
}
[RouterOS] Timeout during getHotspotUser for user1, removing connection: {
  serverId: 'abc123',
  error: 'RouterOS operation timeout: /ip/hotspot/user/print - Timed out after 5000 seconds'
}
[DELETE VOUCHER] Timeout or error during MikroTik check (7013ms): {
  error: 'MikroTik check timeout',
  server: 'test',
  host: '210.211.21.30'
}
```

## Best Practices

1. **Always catch timeout errors** - jangan biarkan menjadi uncaughtException
2. **Cleanup dead connections** - hapus connection yang timeout dari pool
3. **Update server status** - update status ke ERROR jika timeout
4. **Log dengan detail** - log semua timeout dengan context yang jelas
5. **Graceful degradation** - tetap lanjutkan operasi meskipun timeout

## Monitoring

Monitor log untuk:
- `[RouterOS] Timeout error` - frequency timeout errors
- `[RouterOS] Connection timeout` - connection issues
- `[RouterOS] Timeout during` - operation-specific timeouts

Jika timeout sering terjadi:
1. Check server MikroTik status
2. Check network connectivity
3. Consider increasing timeout value
4. Check server load

