import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import WhatsAppConnection from './whatsapp-status';
import SettingsForm from './settings-form';

export default function WhatsAppPage() {
    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bot Configuration</h1>
                    <p className="text-sm text-gray-500">Manage your WhatsApp connection and settings</p>
                </div>
                <Link
                    href="/admin/whatsapp/chats"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Buka Chatbox
                </Link>
            </div>

            <SettingsForm />
        </div>
    );
}

