'use client';

import { useState, useEffect } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight, MapPin, Clock, User, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Task {
    id: string;
    type: 'INSTALLATION' | 'MAINTENANCE';
    scheduledDate: string | null;
    status: string;
    priority: string;
    customer: {
        name: string;
        phone: string;
        address?: string;
    };
}

interface TechnicianScheduleClientProps {
    technician: {
        id: string;
        name: string;
    };
}

// Helper functions for date manipulation
function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function eachDayOfInterval({ start, end }: { start: Date; end: Date }): Date[] {
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

function isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function formatDate(date: Date, formatStr: string): string {
    if (formatStr === 'MMMM yyyy') {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (formatStr === 'd') {
        return date.getDate().toString();
    }
    return date.toLocaleDateString('id-ID');
}

export function TechnicianScheduleClient({ technician }: TechnicianScheduleClientProps) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        loadTasks();
    }, [currentDate, selectedStatus]);

    async function loadTasks() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedStatus) params.append('status', selectedStatus);
            
            const startDate = startOfMonth(currentDate).toISOString();
            const endDate = endOfMonth(currentDate).toISOString();
            params.append('startDate', startDate);
            params.append('endDate', endDate);

            const res = await fetch(`/api/technician/tasks?${params.toString()}`);
            const data = await res.json();
            setTasks(data);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoading(false);
        }
    }

    const getTasksForDate = (date: Date) => {
        return tasks.filter(task => {
            if (!task.scheduledDate) return false;
            return isSameDay(new Date(task.scheduledDate), date);
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-100 text-red-800 border-red-300';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
            case 'PENDING': return 'bg-gray-100 text-gray-800';
            case 'FAILED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">Jadwal Saya</h1>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    viewMode === 'calendar'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Kalender
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    viewMode === 'list'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <List className="w-4 h-4 inline mr-1" />
                                Daftar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filter */}
                <div className="mb-6 flex items-center space-x-4">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                        <option value="">Semua Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed</option>
                    </select>
                </div>

                {viewMode === 'calendar' ? (
                    /* Calendar View */
                    <div className="bg-white rounded-lg shadow">
                        {/* Calendar Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={previousMonth}
                                        className="p-2 hover:bg-gray-100 rounded-md"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h3 className="text-xl font-semibold">
                                        {formatDate(currentDate, 'MMMM yyyy')}
                                    </h3>
                                    <button
                                        onClick={nextMonth}
                                        className="p-2 hover:bg-gray-100 rounded-md"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={goToToday}
                                        className="ml-4 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                                    >
                                        Hari Ini
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-6">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <p className="mt-2 text-gray-500">Memuat jadwal...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-7 gap-2">
                                    {/* Day Headers */}
                                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                            {day}
                                        </div>
                                    ))}

                                    {/* Calendar Days */}
                                    {daysInMonth.map((day) => {
                                        const dayTasks = getTasksForDate(day);
                                        const isCurrentMonth = isSameMonth(day, currentDate);
                                        const isCurrentDay = isToday(day);

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`min-h-24 border border-gray-200 rounded-lg p-2 cursor-pointer hover:bg-gray-50 ${
                                                    !isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'
                                                } ${isCurrentDay ? 'ring-2 ring-indigo-500' : ''}`}
                                                onClick={() => {
                                                    if (dayTasks.length > 0) {
                                                        setViewMode('list');
                                                        setCurrentDate(day);
                                                    }
                                                }}
                                            >
                                                <div className={`text-sm font-medium mb-1 ${
                                                    isCurrentDay ? 'text-indigo-600' : 'text-gray-700'
                                                }`}>
                                                    {formatDate(day, 'd')}
                                                </div>
                                                <div className="space-y-1">
                                                    {dayTasks.slice(0, 2).map(task => (
                                                        <div
                                                            key={task.id}
                                                            className={`text-xs p-1 rounded border ${getPriorityColor(task.priority)}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/technician/tasks/${task.id}`);
                                                            }}
                                                        >
                                                            <div className="font-medium truncate">{task.customer.name}</div>
                                                            <div className={`inline-block px-1 rounded text-xs ${getStatusColor(task.status)}`}>
                                                                {task.status}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {dayTasks.length > 2 && (
                                                        <div className="text-xs text-gray-500">
                                                            +{dayTasks.length - 2} lagi
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* List View */
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Daftar Tugas</h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <p className="mt-2 text-gray-500">Memuat tugas...</p>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">Tidak ada tugas untuk periode ini.</p>
                                </div>
                            ) : (
                                tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="p-6 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => router.push(`/technician/tasks/${task.id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {task.type === 'INSTALLATION' ? 'Instalasi' : 'Maintenance'}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">{task.customer.name}</h3>
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <div className="flex items-center">
                                                        <Phone className="w-4 h-4 mr-2" />
                                                        {task.customer.phone}
                                                    </div>
                                                    {task.customer.address && (
                                                        <div className="flex items-center">
                                                            <MapPin className="w-4 h-4 mr-2" />
                                                            {task.customer.address}
                                                        </div>
                                                    )}
                                                    {task.scheduledDate && (
                                                        <div className="flex items-center">
                                                            <Clock className="w-4 h-4 mr-2" />
                                                            {new Date(task.scheduledDate).toLocaleString('id-ID', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/technician/tasks/${task.id}`);
                                                }}
                                                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                            >
                                                {task.status === 'PENDING' ? 'Mulai' : task.status === 'IN_PROGRESS' ? 'Lanjutkan' : 'Lihat Detail'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

