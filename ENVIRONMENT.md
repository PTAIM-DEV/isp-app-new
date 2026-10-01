# Environment Setup Documentation

> **Context untuk AI Agent**: File ini menjelaskan setup environment khusus proyek ISP App untuk membantu pemahaman konteks development.

## 🏗️ Infrastructure Overview

### Development Environment
- **Local Machine**: MacOS
- **Local Workspace**: `/Users/ITCloud/Downloads/Projects/isp-app`
- **Setup Type**: Remote folder mounted to local (SSHFS/similar)
- **Remote Server**: `gotable` (accessible via SSH)
- **Remote Path**: `/home/gastra/projects/isp-app`

### Database
- **Type**: PostgreSQL
- **Location**: Running on **remote server** (`gotable`)
- **Database Name**: `isp_app`
- **Host**: `localhost:5432` (from server perspective)
- **Connection**: Configured in `.env` file on remote server

### Key Components
- **Framework**: Next.js 16.0.7 (Turbopack)
- **ORM**: Prisma (v6.19.0)
- **Database**: PostgreSQL
- **Queue System**: BullMQ with Redis
- **WhatsApp**: Baileys integration
- **Payment Gateway**: Xendit

## 🔧 Critical Workflows

### Running Database Migrations

**❌ WRONG (will fail - database not accessible locally):**
```bash
npx prisma migrate deploy
```

**✅ CORRECT (run on remote server):**
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma migrate deploy"'
```

**Alternative: Using `prisma db push` for quick schema sync:**
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma db push"'
```

### Checking Migration Status
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma migrate status"'
```

### Running Scripts
Scripts that need database access must be run on the remote server:
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx tsx scripts/your-script.ts"'
```

### Accessing Remote Environment Variables
The `.env` file exists on the **remote server** at `/home/gastra/projects/isp-app/.env`

To load environment variables when running commands via SSH:
```bash
set -a && source .env && set +a
```

## 📁 Project Structure

```
isp-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration history
│   └── prisma.config.ts       # Prisma configuration
├── src/
│   ├── app/                   # Next.js app directory
│   ├── lib/                   # Shared utilities
│   └── middleware.ts          # Next.js middleware
├── scripts/                   # Utility scripts (need SSH to run)
├── worker/                    # Background job workers
└── .env                       # Environment variables (on remote)
```

## ⚠️ Common Pitfalls

### 1. Database Connection
- Database is NOT accessible from local machine directly
- All Prisma commands MUST be run via SSH to `gotable`
- Always source `.env` before running Prisma commands remotely

### 2. Empty Migration Directories
If you encounter error `P3015` (migration file not found):
- Check for empty migration directories
- Delete empty directories: `rm -rf prisma/migrations/[empty-dir-name]`
- Use `prisma db push` to sync schema without creating migration

### 3. Environment Variable Loading
Prisma doesn't auto-load `.env` in remote sessions. Use:
```bash
set -a && source .env && set +a
```

## 🚀 Quick Reference Commands

### SSH into Server
```bash
ssh gotable
cd projects/isp-app
```

### Sync Schema to Database
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma db push"'
```

### Generate Prisma Client
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma generate"'
```

### Check Database Status
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma migrate status"'
```

### View Prisma Studio (Database GUI)
```bash
ssh gotable 'bash -c "cd projects/isp-app && set -a && source .env && set +a && npx prisma studio"'
```

## 📝 Development Notes

### For AI Agents
When asked to:
- **Run migrations**: Use SSH commands to `gotable` server
- **Check database**: Connect via SSH, not local Prisma
- **Run scripts**: Execute on remote server if they access database
- **Debug schema issues**: Remember schema sync happens on remote DB

### File Editing
- ✅ Files can be edited locally (mounted folder)
- ✅ Changes sync to remote automatically
- ❌ Commands requiring DB access must run remotely

### Testing Changes
1. Edit files locally
2. Files sync to remote
3. Run commands via SSH for database operations
4. View results in browser (dev server running on remote)

## 🔗 Related Documentation
- [Prisma Schema](./prisma/schema.prisma)
- [Environment Template](./env.template)
- [Package.json](./package.json)

---

**Last Updated**: 2025-12-17  
**Maintainer**: Development Team  
**Purpose**: Context documentation for AI agents and developers
