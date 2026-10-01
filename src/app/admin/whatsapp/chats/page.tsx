import { MessageSquare } from 'lucide-react';

export default function ChatsPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp Web untuk ISP</h2>
            <p className="text-sm max-w-md">
                Kirim dan terima pesan tanpa perlu menghubungkan telepon Anda.
                Gunakan WhatsApp di hingga 4 perangkat tertaut dan 1 telepon sekaligus.
            </p>
            <div className="mt-8 text-xs text-gray-400 flex items-center">
                <span className="mr-1">🔒</span> Terenkripsi secara end-to-end
            </div>
        </div>
    );
}
