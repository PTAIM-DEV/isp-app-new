'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function BackButton() {
    const [backUrl, setBackUrl] = useState('/admin/customers');

    useEffect(() => {
        // Ambil URL dari sessionStorage yang disimpan oleh customers-list
        const savedUrl = sessionStorage.getItem('customers-list-url');
        if (savedUrl) {
            setBackUrl(savedUrl);
        } else {
            // Fallback: coba ambil dari referrer
            const referrer = document.referrer;
            if (referrer && referrer.includes('/admin/customers')) {
                try {
                    const referrerUrl = new URL(referrer);
                    const urlWithParams = referrerUrl.search 
                        ? `/admin/customers${referrerUrl.search}` 
                        : '/admin/customers';
                    setBackUrl(urlWithParams);
                } catch (e) {
                    // Jika error, gunakan default
                    setBackUrl('/admin/customers');
                }
            }
        }
    }, []);

    return (
        <Link href={backUrl} className="text-indigo-600 hover:text-indigo-900">
            &larr; Kembali
        </Link>
    );
}

