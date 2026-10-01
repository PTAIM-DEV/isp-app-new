'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, Tag, MessageSquare, Edit, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Contact {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    notes: string | null;
    tags: string[];
    source: string | null;
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    chat: {
        id: string;
        name: string | null;
        jid: string;
    } | null;
}

interface ContactsListProps {
    initialContacts: Contact[];
}

export default function ContactsList({ initialContacts }: ContactsListProps) {
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = !search || 
            contact.name.toLowerCase().includes(search.toLowerCase()) ||
            contact.phone.includes(search) ||
            (contact.email && contact.email.toLowerCase().includes(search.toLowerCase()));
        
        const matchesStatus = !statusFilter || contact.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus kontak ini?')) {
            return;
        }

        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete contact');
            }

            setContacts(contacts.filter(c => c.id !== id));
        } catch (error) {
            alert('Gagal menghapus kontak');
        }
    };

    return (
        <div>
            {/* Search and Filter */}
            <div className="mb-4 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Cari kontak..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    <option value="">Semua Status</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Tidak Aktif</option>
                    <option value="CONVERTED">Terkonversi</option>
                </select>
            </div>

            {/* Contacts Grid */}
            {filteredContacts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>Tidak ada kontak ditemukan</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredContacts.map((contact) => (
                        <div
                            key={contact.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatDate(contact.updatedAt)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {contact.chat && (
                                        <Link
                                            href={`/admin/whatsapp/chats/${contact.chat.id}`}
                                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                            title="Buka Chat"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => handleDelete(contact.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center text-gray-600">
                                    <Phone className="w-4 h-4 mr-2" />
                                    <span>{contact.phone}</span>
                                </div>
                                {contact.email && (
                                    <div className="flex items-center text-gray-600">
                                        <Mail className="w-4 h-4 mr-2" />
                                        <span>{contact.email}</span>
                                    </div>
                                )}
                                {contact.address && (
                                    <div className="flex items-start text-gray-600">
                                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">{contact.address}</span>
                                    </div>
                                )}
                                {contact.tags.length > 0 && (
                                    <div className="flex items-start flex-wrap gap-1">
                                        <Tag className="w-4 h-4 mr-1 mt-0.5 text-gray-400" />
                                        {contact.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {contact.notes && (
                                    <div className="text-gray-600 text-xs mt-2 line-clamp-2">
                                        {contact.notes}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <span
                                    className={`inline-block px-2 py-1 text-xs rounded ${
                                        contact.status === 'ACTIVE'
                                            ? 'bg-green-100 text-green-700'
                                            : contact.status === 'CONVERTED'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {contact.status === 'ACTIVE'
                                        ? 'Aktif'
                                        : contact.status === 'CONVERTED'
                                        ? 'Terkonversi'
                                        : 'Tidak Aktif'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

