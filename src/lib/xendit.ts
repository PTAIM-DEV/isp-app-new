import axios from 'axios';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;

const xenditClient = axios.create({
    baseURL: 'https://api.xendit.co',
    headers: {
        'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
    },
});

interface XenditInvoiceParams {
    externalId: string;
    amount: number;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    nik?: string;
    itemName: string;
    itemPrice: number;
    itemQuantity: number;
    provinceName?: string;
    cityName?: string;
    postalCode?: string;
    fees?: { type: string; value: number }[];
}

export async function createInvoice(params: XenditInvoiceParams) {
    try {
        // Calculate total amount including fees
        const subtotal = params.itemPrice * params.itemQuantity;
        const feesTotal = params.fees?.reduce((acc, fee) => acc + fee.value, 0) || 0;
        const totalAmount = params.amount; // Use passed amount which should be total

        const payload = {
            external_id: params.externalId,
            amount: totalAmount,
            description: params.description,
            invoice_duration: 864000, // 10 days (10 * 24 * 60 * 60 seconds)
            customer: {
                given_names: params.customerName,
                ...(params.nik && { NIK: params.nik }),
                email: params.customerEmail,
                mobile_number: params.customerPhone,
                addresses: [
                    {
                        country: "Indonesia",
                        state: params.provinceName || "Sulawesi Utara",
                        city: params.cityName || "Kab Minut",
                        postal_code: params.postalCode || "95370",
                        street_line1: params.customerAddress,
                    },
                ],
            },
            customer_notification_preference: {
                invoice_paid: ["whatsapp", "email"],
            },
            currency: "IDR",
            items: [
                {
                    name: params.itemName,
                    quantity: params.itemQuantity,
                    price: params.itemPrice,
                    category: "Broadband",
                    url: "https://gastra.net.id",
                },
            ],
            fees: params.fees || [],
            payment_methods: [
                "QRIS",
                "BNI",
                "BRI",
                "MANDIRI",
                "PERMATA",
                "CIMB",
                "BJB",
                "BSS",
                "INDOMARET",
            ],
            metadata: {
                store_branch: "MINUT",
            },
        };

        console.log('[Xendit] Creating invoice:', JSON.stringify(payload, null, 2));

        const response = await xenditClient.post('/v2/invoices', payload);

        console.log('[Xendit] Invoice created successfully:', response.data.id);

        return response.data;
    } catch (error: any) {
        console.error('Xendit Create Invoice Error:', error.response?.data || error.message);
        throw error;
    }
}

export async function getInvoice(invoiceId: string) {
    try {
        const response = await xenditClient.get(`/v2/invoices/${invoiceId}`);
        return response.data;
    } catch (error) {
        console.error('Xendit Get Invoice Error:', error);
        throw error;
    }
}
