const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
};

const getAuthHeaders = (): any => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(token && { 'x-auth-token': token }),
    };
};

export const EvolutionService = {
    async createInstance(instanceName: string) {
        const response = await fetch(`${BASE_URL}/whatsapp/instance/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                instanceName
            })
        });

        if (!response.ok) {
            // Backend handles creation logic, but if it returns 409 we might ignore it?
            // Controller returns whatsappService.createInstance() result.
            // If backend throws error, it comes here as 500 or 400.
            const errorData = await response.json().catch(() => ({}));
            // If 403/409 from Evolution, backend might pass it through or throw.
            // Let's assume standard error handling.
            if (response.status === 403 || response.status === 409) {
                return { status: 'exists' };
            }
            throw new Error(errorData.message || 'Failed to create instance');
        }

        return response.json();
    },

    async connectInstance(instanceName: string): Promise<ConnectValidResponse> {
        const response = await fetch(`${BASE_URL}/whatsapp/instance/connect/${instanceName}?t=${Date.now()}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            cache: 'no-store'
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to fetch connection QR code: ${err}`);
        }

        let data = await response.json();

        // Retry logic should ideally be on backend or simplified here.
        // If backend returns data immediately, we check it.
        // If the backend is just a proxy, we might need to poll here still if 'count' is 0.
        // But let's assume simple pass-through for now. 

        let retries = 10;
        while (retries > 0) {
            if (data.base64) {
                return { code: data.base64, pairingCode: data.pairingCode };
            } else if (data.qrcode && data.qrcode.base64) {
                return { code: data.qrcode.base64, pairingCode: data.pairingCode };
            } else if (data.code) {
                // Format { code: 'base64...' }
                return { code: data.code, pairingCode: data.pairingCode };
            }

            if (data.count === 0) {
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 2000));
                const retryResponse = await fetch(`${BASE_URL}/whatsapp/instance/connect/${instanceName}?t=${Date.now()}`, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                    cache: 'no-store'
                });
                if (retryResponse.ok) {
                    data = await retryResponse.json();
                }
                retries--;
            } else {
                break;
            }
        }

        console.error("Invalid QR Code response:", data);
        throw new Error("Instance created but QR Code could not be generated.");
    },

    async fetchInstance(instanceName: string): Promise<EvolutionInstance> {
        const response = await fetch(`${BASE_URL}/whatsapp/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            return { instanceName, status: 'close' };
        }

        const data = await response.json();
        // Backend returns: { instance, state: '...' } or just data from Evolution.
        // Service.getConnectionStatus returns { state } or evolution data.
        return {
            instanceName: instanceName,
            status: data.instance?.state || data.state || 'close'
        };
    },

    async logoutInstance(instanceName: string) {
        await fetch(`${BASE_URL}/whatsapp/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
    },

    async fetchChats(instanceName: string) {
        const response = await fetch(`${BASE_URL}/whatsapp/chat/findChats/${instanceName}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch chats');
        return response.json();
    },

    async fetchMessages(instanceName: string, remoteJid: string) {
        // This was refactored in previous thought to hit local backend. 
        // Path: /whatsapp/messages/:jid
        const encodedJid = encodeURIComponent(remoteJid);
        const response = await fetch(`${BASE_URL}/whatsapp/messages/${encodedJid}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) return [];

        const localMessages = await response.json();

        return localMessages.map((msg: any) => ({
            key: {
                id: msg.id.toString(),
                fromMe: msg.sender === 'admin' || msg.sender === 'bot',
                remoteJid: msg.remoteJid
            },
            message: {
                conversation: msg.content
            },
            messageTimestamp: new Date(msg.timestamp).getTime() / 1000,
            pushName: msg.sender,
            raw: msg.raw
        })).reverse();
    },

    async sendMessage(instanceName: string, remoteJid: string, text: string) {
        const response = await fetch(`${BASE_URL}/whatsapp/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                number: remoteJid,
                text: text
            }) // Backend expects body with number/text
        });

        if (!response.ok) throw new Error('Failed to send message');
        return response.json();
    }
};
