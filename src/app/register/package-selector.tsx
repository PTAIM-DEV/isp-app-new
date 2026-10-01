'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';

interface Package {
    id: string;
    name: string;
    speed: string;
    price: number;
    description: string | null;
    features: string;
    isActive: boolean;
    isRecommended: boolean;
}

interface PackageSelectorProps {
    packages: Package[];
    onSelect: (packageId: string) => void;
    selectedId?: string;
}

export function PackageSelector({ packages, onSelect, selectedId }: PackageSelectorProps) {
    const [selected, setSelected] = useState<string | undefined>(selectedId);

    function handleSelect(id: string) {
        setSelected(id);
        onSelect(id);
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pilih Paket Layanan
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packages.map((pkg) => {
                        const features = JSON.parse(pkg.features || '[]');
                        const isSelected = selected === pkg.id;

                        return (
                            <div
                                key={pkg.id}
                                onClick={() => handleSelect(pkg.id)}
                                className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${isSelected
                                    ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-indigo-300'
                                    }`}
                            >
                                {/* Selected Badge */}
                                {isSelected && (
                                    <div className="absolute -top-3 -right-3 bg-indigo-600 text-white rounded-full p-2 shadow-lg">
                                        <Check className="h-4 w-4" />
                                    </div>
                                )}

                                {/* Recommended Badge */}
                                {pkg.isRecommended && (
                                    <div className="absolute -top-3 -left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                        <span>⭐</span>
                                        <span>REKOMENDASI</span>
                                    </div>
                                )}

                                {/* Package Name */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        {pkg.name}
                                    </h3>
                                    <div className="flex items-baseline gap-2">
                                        <Zap className="h-5 w-5 text-yellow-500" />
                                        <span className="text-2xl font-extrabold text-indigo-600">
                                            {pkg.speed}
                                        </span>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-4 pb-4 border-b border-gray-200">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm text-gray-500">Rp</span>
                                        <span className="text-3xl font-bold text-gray-900">
                                            {pkg.price.toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-sm text-gray-500">/bulan</span>
                                    </div>
                                </div>

                                {/* Description */}
                                {pkg.description && (
                                    <p className="text-sm text-gray-600 mb-4">
                                        {pkg.description}
                                    </p>
                                )}

                                {/* Features */}
                                {features.length > 0 && (
                                    <ul className="space-y-2">
                                        {features.map((feature: string, idx: number) => (
                                            <li key={idx} className="flex items-start text-sm">
                                                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-700">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Select Button */}
                                <button
                                    type="button"
                                    className={`mt-6 w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {isSelected ? 'Terpilih' : 'Pilih Paket'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {packages.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500">Belum ada paket layanan tersedia.</p>
                        <p className="text-sm text-gray-400 mt-1">Silakan hubungi admin untuk informasi lebih lanjut.</p>
                    </div>
                )}
            </div>

            {selected && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 flex items-center">
                        <Check className="h-4 w-4 mr-2" />
                        Paket <strong className="mx-1">{packages.find(p => p.id === selected)?.name}</strong> telah dipilih
                    </p>
                </div>
            )}
        </div>
    );
}
