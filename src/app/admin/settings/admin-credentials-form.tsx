'use client';

import { useState } from 'react';
import { updateAdminCredentials } from './actions';
import { Loader2, Save } from 'lucide-react';

interface AdminCredentialsFormProps {
    initialUsername?: string;
    initialPassword?: string;
}

export function AdminCredentialsForm({ initialUsername = 'ispapp', initialPassword = '' }: AdminCredentialsFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setMessage('');

        const res = await updateAdminCredentials(formData);

        if (res.success) {
            setMessage('Credentials updated successfully');
        } else {
            setMessage(res.error || 'Failed to update');
        }

        setIsLoading(false);
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700">Admin Username</label>
                <input
                    type="text"
                    name="username"
                    defaultValue={initialUsername}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Admin Password</label>
                <input
                    type="text" // Show password for easier editing, or password type if preferred. User asked for "setting to change user and password".
                    name="password"
                    defaultValue={initialPassword}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="Enter new password"
                />
            </div>

            {message && (
                <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="-ml-1 mr-2 h-5 w-5" />
                            Update Credentials
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
