'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, X, Loader2, Phone, Clock, User } from 'lucide-react';

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

interface Task {
    id: string;
    type: 'INSTALLATION' | 'MAINTENANCE';
    scheduledDate: string | null;
    status: string;
    priority: string;
    technician?: { id: string; name: string } | null;
    customer: { name: string; phone: string };
}

interface ScheduleCalendarProps {
    technicians: any[];
    customers: any[];
}

export function ScheduleCalendar({ technicians, customers }: ScheduleCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTechnician, setSelectedTechnician] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        loadTasks();
    }, [currentDate, selectedTechnician, selectedStatus]);

    async function loadTasks() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedTechnician) params.append('technicianId', selectedTechnician);
            if (selectedStatus) params.append('status', selectedStatus);

            const startDate = startOfMonth(currentDate).toISOString();
            const endDate = endOfMonth(currentDate).toISOString();
            params.append('startDate', startDate);
            params.append('endDate', endDate);

            const res = await fetch(`/api/admin/technicians/tasks?${params.toString()}`);
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
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
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
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Buat Tugas
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <Filter className="w-4 h-4 mr-2 text-gray-400" />
                        <select
                            value={selectedTechnician}
                            onChange={(e) => setSelectedTechnician(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        >
                            <option value="">Semua Teknisi</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>{tech.name}</option>
                            ))}
                        </select>
                    </div>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                        <option value="">Semua Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed</option>
                    </select>
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
                        {daysInMonth.map((day, idx) => {
                            const dayTasks = getTasksForDate(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isCurrentDay = isToday(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`min-h-24 border border-gray-200 rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'
                                        } ${isCurrentDay ? 'ring-2 ring-indigo-500' : ''} ${dayTasks.length > 0 ? 'hover:ring-2 hover:ring-indigo-300' : ''
                                        }`}
                                    onClick={() => {
                                        if (dayTasks.length > 0) {
                                            setSelectedDate(day);
                                            setSelectedDateTasks(dayTasks);
                                        } else if (isCurrentMonth) {
                                            // If date is empty, open create modal with pre-filled date
                                            setSelectedDate(day);
                                            setShowCreateModal(true);
                                        }
                                    }}
                                >
                                    <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-indigo-600' : 'text-gray-700'
                                        }`}>
                                        {formatDate(day, 'd')}
                                    </div>
                                    <div className="space-y-1">
                                        {dayTasks.slice(0, 2).map(task => (
                                            <div
                                                key={task.id}
                                                className={`text-xs p-1 rounded border ${getPriorityColor(task.priority)}`}
                                                title={`${task.type} - ${task.customer.name}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Could navigate to task detail if needed
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

            {/* Create Task Modal */}
            {showCreateModal && (
                <CreateTaskModal
                    technicians={technicians}
                    customers={customers}
                    defaultDate={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedDate(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setSelectedDate(null);
                        loadTasks();
                    }}
                />
            )}

            {/* Task Detail Modal for Selected Date */}
            {selectedDate && selectedDateTasks.length > 0 && (
                <TaskDetailModal
                    date={selectedDate}
                    tasks={selectedDateTasks}
                    technicians={technicians}
                    onClose={() => {
                        setSelectedDate(null);
                        setSelectedDateTasks([]);
                    }}
                    onEdit={(task) => {
                        setEditingTask(task);
                    }}
                    onTaskUpdated={() => {
                        loadTasks();
                        // Reload tasks for selected date
                        const dayTasks = getTasksForDate(selectedDate);
                        setSelectedDateTasks(dayTasks);
                    }}
                />
            )}

            {/* Edit Task Modal */}
            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    technicians={technicians}
                    onClose={() => setEditingTask(null)}
                    onSuccess={() => {
                        setEditingTask(null);
                        loadTasks();
                        // Reload tasks for selected date if modal is open
                        if (selectedDate) {
                            const dayTasks = getTasksForDate(selectedDate);
                            setSelectedDateTasks(dayTasks);
                        }
                    }}
                />
            )}
        </div>
    );
}

// Task Detail Modal Component
function TaskDetailModal({
    date,
    tasks,
    technicians,
    onClose,
    onEdit,
    onTaskUpdated
}: {
    date: Date;
    tasks: Task[];
    technicians: any[];
    onClose: () => void;
    onEdit: (task: Task) => void;
    onTaskUpdated: () => void;
}) {
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

    const formatDateStr = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        Tugas pada {formatDateStr(date)}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4 text-sm text-gray-600">
                        Total: {tasks.length} tugas
                    </div>
                    <div className="space-y-4">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
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
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {task.customer.name}
                                        </h3>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <Phone className="w-4 h-4 mr-2" />
                                                {task.customer.phone}
                                            </div>
                                            {task.scheduledDate && (
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    {new Date(task.scheduledDate).toLocaleTimeString('id-ID', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            )}
                                            {task.technician && (
                                                <div className="flex items-center">
                                                    <User className="w-4 h-4 mr-2" />
                                                    Teknisi: {task.technician.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                        <button
                                            onClick={() => onEdit(task)}
                                            className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

// Create Task Modal Component
function CreateTaskModal({
    technicians,
    customers,
    defaultDate,
    onClose,
    onSuccess
}: {
    technicians: any[];
    customers: any[];
    defaultDate?: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        customerId: '',
        technicianId: '',
        scheduledDate: defaultDate || '',
        scheduledTime: '',
        taskType: 'ROUTINE',
        priority: 'NORMAL',
        description: '',
        locationNotes: '',
        picName: '',
        picPhone: '',
        teamName: '',
    });

    const selectedCustomer = customers.find(c => c.id === formData.customerId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime || '09:00'}`);

            const res = await fetch('/api/admin/technicians/tasks/create-maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: formData.customerId,
                    technicianId: formData.technicianId || null,
                    scheduledDate: scheduledDateTime.toISOString(),
                    taskType: formData.taskType,
                    priority: formData.priority,
                    description: formData.description || null,

                    locationNotes: formData.locationNotes || null,
                    picName: formData.picName || null,
                    picPhone: formData.picPhone || null,
                    teamName: formData.teamName || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal membuat tugas');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Gagal membuat tugas');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Buat Tugas Maintenance</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pelanggan <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.customerId}
                            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                        >
                            <option value="">Pilih Pelanggan</option>
                            {customers.map(customer => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name} - {customer.phone}
                                </option>
                            ))}
                        </select>

                        {selectedCustomer && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
                                <p><strong>Alamat:</strong> {selectedCustomer.address || '-'}</p>
                                <p><strong>Plan:</strong> {selectedCustomer.subscription?.planName || '-'}</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama PIC (Opsional)
                            </label>
                            <input
                                type="text"
                                value={formData.picName}
                                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder={selectedCustomer?.name || "Nama Kontak"}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                No. HP PIC (Opsional)
                            </label>
                            <input
                                type="text"
                                value={formData.picPhone}
                                onChange={(e) => setFormData({ ...formData, picPhone: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder={selectedCustomer?.phone || "08xxx"}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Teknisi (Opsional)
                            </label>
                            <select
                                value={formData.technicianId}
                                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">Tidak Ditugaskan</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama Tim (Opsional)
                            </label>
                            <input
                                type="text"
                                value={formData.teamName}
                                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="Contoh: Tim A"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.scheduledDate}
                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Waktu
                            </label>
                            <input
                                type="time"
                                value={formData.scheduledTime}
                                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Jenis Tugas <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.taskType}
                                onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="ROUTINE">Rutin</option>
                                <option value="REPAIR">Perbaikan</option>
                                <option value="UPGRADE">Upgrade</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prioritas <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="LOW">Rendah</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">Tinggi</option>
                                <option value="URGENT">Mendesak</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Deskripsi
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="Jelaskan tugas yang perlu dilakukan..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Catatan Lokasi
                        </label>
                        <textarea
                            value={formData.locationNotes}
                            onChange={(e) => setFormData({ ...formData, locationNotes: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="Catatan khusus tentang lokasi..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Buat Tugas'
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}

// Edit Task Modal Component
function EditTaskModal({
    task,
    technicians,
    onClose,
    onSuccess
}: {
    task: Task;
    technicians: any[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        technicianId: task.technician?.id || '',
        status: task.status,
        scheduledDate: task.scheduledDate ? new Date(task.scheduledDate).toISOString().split('T')[0] : '',
        scheduledTime: task.scheduledDate ? new Date(task.scheduledDate).toTimeString().slice(0, 5) : '',
        priority: task.priority,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const scheduledDateTime = formData.scheduledDate
                ? new Date(`${formData.scheduledDate}T${formData.scheduledTime || '09:00'}`)
                : null;

            const res = await fetch(`/api/admin/technicians/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technicianId: formData.technicianId || null,
                    status: formData.status,
                    scheduledDate: scheduledDateTime ? scheduledDateTime.toISOString() : null,
                    priority: formData.priority,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal mengupdate tugas');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Gagal mengupdate tugas');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Edit Tugas</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Task Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-2">
                            <div>
                                <p className="text-sm text-gray-500">Pelanggan</p>
                                <p className="font-medium text-gray-900">{task.customer.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Jenis Tugas</p>
                                <p className="text-gray-900">{task.type === 'INSTALLATION' ? 'Instalasi' : 'Maintenance'}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teknisi
                        </label>
                        <select
                            value={formData.technicianId}
                            onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">Tidak Ditugaskan</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>{tech.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prioritas <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="LOW">Rendah</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">Tinggi</option>
                                <option value="URGENT">Mendesak</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal
                            </label>
                            <input
                                type="date"
                                value={formData.scheduledDate}
                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Waktu
                            </label>
                            <input
                                type="time"
                                value={formData.scheduledTime}
                                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

