import { SalesForm } from '../sales-form';

export default function NewSalesPage() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Tambah Sales Baru</h2>
            <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                <SalesForm />
            </div>
        </div>
    );
}











