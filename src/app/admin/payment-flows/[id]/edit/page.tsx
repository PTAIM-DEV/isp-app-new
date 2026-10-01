import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PaymentFlowForm } from '../../payment-flow-form';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPaymentFlowPage({ params }: PageProps) {
    const { id } = await params;

    const paymentFlow = await prisma.paymentFlow.findUnique({
        where: { id },
    });

    if (!paymentFlow) {
        notFound();
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Payment Flow</h2>
                <Link href="/admin/payment-flows" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Kembali
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                <PaymentFlowForm initialData={paymentFlow} />
            </div>
        </div>
    );
}
