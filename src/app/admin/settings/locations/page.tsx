'use client';

import { useState } from 'react';
import { MapPin, Building2, Map } from 'lucide-react';
import ProvinceTab from './province-tab';
import CityTab from './city-tab';
import DistrictTab from './district-tab';
import VillageTab from './village-tab';

export default function LocationSettingsPage() {
    const [activeTab, setActiveTab] = useState<'provinces' | 'cities' | 'districts' | 'villages'>('provinces');

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Location Master Data</h1>
                <p className="text-gray-500">Manage coverage areas: Provinces, Cities, and Districts.</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('provinces')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'provinces'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Map className="w-4 h-4" />
                        Provinces
                    </button>
                    <button
                        onClick={() => setActiveTab('cities')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'cities'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Cities / Kabupaten
                    </button>
                    <button
                        onClick={() => setActiveTab('districts')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'districts'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <MapPin className="w-4 h-4" />
                        Districts / Kecamatan
                    </button>
                    <button
                        onClick={() => setActiveTab('villages')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'villages'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <MapPin className="w-4 h-4" />
                        Villages / Kelurahan
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'provinces' && <ProvinceTab />}
                    {activeTab === 'cities' && <CityTab />}
                    {activeTab === 'districts' && <DistrictTab />}
                    {activeTab === 'villages' && <VillageTab />}
                </div>
            </div>
        </div>
    );
}
