'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, User, LogOut, MapPin, Phone, TrendingUp } from 'lucide-react';
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

interface TechnicianDashboardClientProps {
    technician: {
        id: string;
        name: string;
        phone: string;
        email?: string | null;
        photoUrl?: string | null;
    };
}

export function TechnicianDashboardClient({ technician }: TechnicianDashboardClientProps) {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayTasks, setTodayTasks] = useState<Task[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
    const [completedThisMonth, setCompletedThisMonth] = useState(0);

    useEffect(() => {
        loadTasks();
    }, []);

    async function loadTasks() {
        try {
            setLoading(true);
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Get today's tasks
            const todayRes = await fetch('/api/technician/tasks?status=PENDING&startDate=' + today.toISOString().split('T')[0]);
            const todayData = await todayRes.json();
            setTodayTasks(todayData.filter((task: Task) => {
                if (!task.scheduledDate) return false;
                const taskDate = new Date(task.scheduledDate);
                return taskDate.toDateString() === today.toDateString();
            }));

            // Get upcoming tasks (next 7 days)
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            const upcomingRes = await fetch(`/api/technician/tasks?status=PENDING&startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}`);
            const upcomingData = await upcomingRes.json();
            setUpcomingTasks(upcomingData.filter((task: Task) => {
                if (!task.scheduledDate) return false;
                const taskDate = new Date(task.scheduledDate);
                return taskDate > today;
            }));

            // Get completed tasks this month
            const completedRes = await fetch(`/api/technician/tasks?status=COMPLETED&startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`);
            const completedData = await completedRes.json();
            setCompletedThisMonth(completedData.length);

            setTasks([...todayData, ...upcomingData, ...completedData]);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        try {
            await fetch('/technician/logout', { method: 'POST' });
            router.push('/technician/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-100 text-red-800 border-red-300';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {technician.photoUrl ? (
                                <img 
                                    src={technician.photoUrl} 
                                    alt={technician.name}
                                    className="h-10 w-10 rounded-full mr-3 object-cover"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                    <User className="w-6 h-6 text-indigo-600" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Selamat Datang, {technician.name}
                                </h1>
                                <p className="text-sm text-gray-500">{technician.phone}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Clock className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Tugas Hari Ini</p>
                                <p className="text-2xl font-bold text-gray-900">{todayTasks.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Selesai Bulan Ini</p>
                                <p className="text-2xl font-bold text-gray-900">{completedThisMonth}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Tugas Mendatang</p>
                                <p className="text-2xl font-bold text-gray-900">{upcomingTasks.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Tasks */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-lg font-medium text-gray-900">Tugas Hari Ini</h2>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/technician/schedule')}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Lihat Jadwal →
                            </button>
                            <button
                                onClick={() => router.push('/technician/kpi')}
                                className="text-sm text-green-600 hover:text-green-800"
                            >
                                KPI & Performa →
                            </button>
                        </div>
                    </div>
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                <p className="mt-2 text-gray-500">Memuat tugas...</p>
                            </div>
                        ) : todayTasks.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                Belum ada tugas untuk hari ini.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {todayTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => router.push(`/technician/tasks/${task.id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {task.type === 'INSTALLATION' ? 'Instalasi' : 'Maintenance'}
                                                    </span>
                                                </div>
                                                <h3 className="font-medium text-gray-900">{task.customer.name}</h3>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone className="w-4 h-4 mr-2" />
                                                        {task.customer.phone}
                                                    </div>
                                                    {task.customer.address && (
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <MapPin className="w-4 h-4 mr-2" />
                                                            {task.customer.address}
                                                        </div>
                                                    )}
                                                    {task.scheduledDate && (
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(task.scheduledDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                                                Mulai
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

