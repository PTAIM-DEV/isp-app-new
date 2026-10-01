import { PaymentFlowForm } from '../payment-flow-form';
import Link from 'next/link';

export default function NewPaymentFlowPage() {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Tambah Payment Flow</h2>
                <Link href="/admin/payment-flows" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Kembali
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                <PaymentFlowForm />
            </div>
        </div>
    );
}
