'use client';

import { useState } from 'react';

export type TimeRange = '1D' | '7D' | '14D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

interface DashboardTimeFilterProps {
    selectedRange: TimeRange;
    onRangeChange: (range: TimeRange) => void;
}

export function DashboardTimeFilter({ selectedRange, onRangeChange }: DashboardTimeFilterProps) {
    const ranges: TimeRange[] = ['1D', '7D', '14D', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'];

    return (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Periode:</span>
            {ranges.map((range) => (
                <button
                    key={range}
                    onClick={() => onRangeChange(range)}
                    className={`
                        px-3 py-1 text-sm font-medium rounded-md transition-colors
                        ${selectedRange === range
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                    `}
                >
                    {range}
                </button>
            ))}
        </div>
    );
}

