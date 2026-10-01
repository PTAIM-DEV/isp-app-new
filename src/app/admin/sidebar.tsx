'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAdmin } from './actions';
import { Home, Users, DollarSign, Settings, Wrench, MessageSquare, Package, MapPin, Shield, LogOut, Bell, UserCircle, CreditCard, ChevronDown, ChevronRight, ChevronLeft, FileText, Calendar, TrendingUp, Contact, Link2, Wifi, Server, AlertTriangle } from 'lucide-react';

interface SidebarProps {
    role?: string; // Optional for compatibility
    permissions?: string[];
}

export default function Sidebar({ role, permissions = [] }: SidebarProps) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login'; // Should not happen if layout handles it, but keep for safety

    // State for collapsible menus
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        billing: false,
        technicians: false,
        hotspot: false,
    });

    // Sidebar collapse state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Auto-expand menus if on related pages
    useEffect(() => {
        if (pathname.startsWith('/admin/billing')) {
            setExpandedMenus(prev => ({ ...prev, billing: true }));
        }
        if (pathname.startsWith('/admin/technicians')) {
            setExpandedMenus(prev => ({ ...prev, technicians: true }));
        }
        if (pathname.startsWith('/admin/hotspot')) {
            setExpandedMenus(prev => ({ ...prev, hotspot: true }));
        }
    }, [pathname]);

    const toggleMenu = (menu: string) => {
        if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
            setTimeout(() => {
                setExpandedMenus(prev => ({
                    ...prev,
                    [menu]: true,
                }));
            }, 100);
            return;
        }

        setExpandedMenus(prev => ({
            ...prev,
            [menu]: !prev[menu],
        }));
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    if (isLoginPage) return null;

    // RBAC / Permission Checks
    const isAdmin = role === 'ADMIN'; // Admin always has full access regardless of permissions list (fail-safe)

    // Modules (matches ModuleType in permissions.ts)
    const canSeeUsers = isAdmin || permissions.includes('users');
    const canSeeBilling = isAdmin || permissions.includes('billing');
    const canSeeTechnicians = isAdmin || permissions.includes('noc'); // NOC usually manages techs
    const canSeeHotspot = isAdmin || permissions.includes('noc') || permissions.includes('billing'); // Joint access? Or specific 'hotspot' module? Let's use NOC/Billing overlap for now or specific
    // Actually better to check specific modules if we had them. Currently mapping NOC -> Technicians.
    const canSeeNoc = isAdmin || permissions.includes('noc');
    const canSeeLeads = isAdmin || permissions.includes('leads');
    const canSeeCustomers = isAdmin || permissions.includes('customers');
    const canSeeSettings = isAdmin || permissions.includes('settings');

    const canSeeHotspotMenu = isAdmin || canSeeNoc || canSeeBilling; // Broaden availability or add specific module later

    return (
        <div
            className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-md min-h-screen flex flex-col transition-all duration-300 ease-in-out z-20 sticky top-0 h-screen`}
        >
            <div className={`p-6 flex items-center justify-between h-20 ${isSidebarCollapsed ? 'px-4 justify-center' : ''}`}>
                {!isSidebarCollapsed && (
                    <h1 className="text-2xl font-bold text-indigo-600 truncate">ISP Admin</h1>
                )}
                <button
                    onClick={toggleSidebar}
                    className={`p-1 rounded-md hover:bg-gray-100 text-gray-500 ${isSidebarCollapsed ? '' : 'ml-auto'}`}
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isSidebarCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
            </div>

            <nav className="mt-2 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {/* Overview */}
                <div className={`px-6 mb-2 mt-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Overview</h2>
                </div>
                <SimpleLink href="/admin" icon={Home} label="Dashboard" pathname={pathname} collapsed={isSidebarCollapsed} />
                <SimpleLink href="/admin/attention" icon={AlertTriangle} label="Action Center" pathname={pathname} collapsed={isSidebarCollapsed} />

                {/* User Management - NEW */}
                {canSeeUsers && (
                    <SimpleLink href="/admin/users" icon={Users} label="User Management" pathname={pathname} collapsed={isSidebarCollapsed} />
                )}

                {/* Customer Management */}
                <div className={`px-6 mt-6 mb-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'hidden' : 'opacity-100'}`}>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Customer Management</h2>
                </div>

                <SimpleLink href="/admin/leads" icon={UserCircle} label="Leads" pathname={pathname} collapsed={isSidebarCollapsed} />
                <SimpleLink href="/admin/customers" icon={Users} label="Customers" pathname={pathname} collapsed={isSidebarCollapsed} />
                <SimpleLink href="/admin/contacts" icon={Contact} label="Kontak" pathname={pathname} collapsed={isSidebarCollapsed} />

                {/* Billing & Payments */}
                {canSeeBilling && (
                    <>
                        <div className={`px-6 mt-6 mb-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'hidden' : 'opacity-100'}`}>
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Billing & Payments</h2>
                        </div>
                        <CollapsibleMenu
                            icon={DollarSign}
                            label="Billing"
                            isOpen={expandedMenus.billing}
                            toggle={() => toggleMenu('billing')}
                            collapsed={isSidebarCollapsed}
                            isActive={pathname.startsWith('/admin/billing')}
                        >
                            <SubLink href="/admin/billing" label="Tagihan & Invoice" pathname={pathname} />
                            <SubLink href="/admin/billing/revenue-report" label="Laporan Revenue" icon={FileText} pathname={pathname} />
                            <SubLink href="/admin/billing/receivables" label="Buku Piutang" icon={DollarSign} pathname={pathname} />
                            <SubLink href="/admin/billing/transactions" label="Riwayat Transaksi" pathname={pathname} />
                            <SubLink href="/admin/billing/reminders" label="Reminder Logs" icon={Bell} pathname={pathname} />
                            <SubLink href="/admin/billing/unmatched-payments" label="Sync Manual Payment" icon={Link2} pathname={pathname} />
                        </CollapsibleMenu>

                        <SimpleLink href="/admin/payment-flows" icon={CreditCard} label="Payment Flows" pathname={pathname} collapsed={isSidebarCollapsed} />
                        <SimpleLink href="/admin/promos" icon={DollarSign} label="Promo Codes" pathname={pathname} collapsed={isSidebarCollapsed} />
                    </>
                )}

                {/* Operations */}
                <div className={`px-6 mt-6 mb-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'hidden' : 'opacity-100'}`}>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Operations</h2>
                </div>

                {canSeeTechnicians && (
                    <CollapsibleMenu
                        icon={Wrench}
                        label="Technicians"
                        isOpen={expandedMenus.technicians}
                        toggle={() => toggleMenu('technicians')}
                        collapsed={isSidebarCollapsed}
                        isActive={pathname.startsWith('/admin/technicians')}
                    >
                        <SubLink href="/admin/technicians" label="Data Teknisi" pathname={pathname} ExactMatch={true} />
                        <SubLink href="/admin/technicians/schedule" label="Manajemen Jadwal" icon={Calendar} pathname={pathname} />
                        <SubLink href="/admin/technicians/kpi" label="KPI Dashboard" icon={TrendingUp} pathname={pathname} />
                    </CollapsibleMenu>
                )}

                {/* Hotspot Management - MOVED TO OPERATIONS */}
                {canSeeHotspot && (
                    <CollapsibleMenu
                        icon={Wifi}
                        label="Hotspot Manager"
                        isOpen={expandedMenus.hotspot}
                        toggle={() => toggleMenu('hotspot')}
                        collapsed={isSidebarCollapsed}
                        isActive={pathname.startsWith('/admin/hotspot')}
                    >
                        <SubLink href="/admin/hotspot/servers" label="Servers" icon={Server} pathname={pathname} />
                        <SubLink href="/admin/hotspot/packages" label="Packages" icon={Package} pathname={pathname} />
                        <SubLink href="/admin/hotspot/vouchers" label="Vouchers" icon={Wifi} pathname={pathname} />
                        <SubLink href="/admin/hotspot/monitor" label="Monitor" icon={TrendingUp} pathname={pathname} />
                        <SubLink href="/admin/hotspot/sales" label="Sales & Reports" icon={DollarSign} pathname={pathname} />
                        <SubLink href="/admin/hotspot/komisi" label="Komisi" icon={CreditCard} pathname={pathname} />
                    </CollapsibleMenu>
                )}

                {/* Communication */}
                <div className={`px-6 mt-6 mb-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'hidden' : 'opacity-100'}`}>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Communication</h2>
                </div>
                {/* Chatbox placed above Bot Config */}
                <SimpleLink href="/admin/whatsapp/chats" icon={MessageSquare} label="Live Chat" pathname={pathname} collapsed={isSidebarCollapsed} />
                <SimpleLink href="/admin/whatsapp" icon={Settings} label="Bot Configuration" pathname={pathname} collapsed={isSidebarCollapsed} />

                {/* System */}
                {canSeeSettings && (
                    <>
                        <div className={`px-6 mt-6 mb-2 transition-opacity duration-200 ${isSidebarCollapsed ? 'hidden' : 'opacity-100'}`}>
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">System</h2>
                        </div>
                        {/* Moved Sales & Packages here */}
                        <SimpleLink href="/admin/sales" icon={Users} label="Sales" pathname={pathname} collapsed={isSidebarCollapsed} />
                        <SimpleLink href="/admin/packages" icon={Package} label="Paket Layanan" pathname={pathname} collapsed={isSidebarCollapsed} />

                        <SimpleLink href="/admin/settings/locations" icon={MapPin} label="Locations" pathname={pathname} collapsed={isSidebarCollapsed} />
                        <SimpleLink href="/admin/settings/roles" icon={Shield} label="Role Permissions" pathname={pathname} collapsed={isSidebarCollapsed} />
                        <SimpleLink href="/admin/security" icon={Shield} label="Security" pathname={pathname} collapsed={isSidebarCollapsed} />
                        <SimpleLink href="/admin/settings" icon={Settings} label="Settings" pathname={pathname} collapsed={isSidebarCollapsed} />
                    </>
                )}

                <div className="h-10"></div>
            </nav>

            <div className="p-4 border-t bg-gray-50 bg-opacity-50">
                <button
                    onClick={() => logoutAdmin()}
                    className={`flex items-center w-full px-2 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title="Logout"
                >
                    <LogOut className={`${isSidebarCollapsed ? '' : 'mr-3'} h-5 w-5`} />
                    {!isSidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
}

// Reuse helper components
function SimpleLink({ href, icon: Icon, label, pathname, collapsed }: any) {
    const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
    return (
        <Link
            href={href}
            className={`flex items-center px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap 
                ${isActive ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : ''}
                ${collapsed ? 'justify-center px-2' : ''}
            `}
            title={collapsed ? label : undefined}
        >
            <Icon className={`${collapsed ? '' : 'mr-3'} h-5 w-5 shrink-0`} />
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}

function CollapsibleMenu({ icon: Icon, label, isOpen, toggle, collapsed, children, isActive }: any) {
    return (
        <div>
            <button
                onClick={toggle}
                className={`w-full flex items-center justify-between px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap
                    ${isActive ? 'text-indigo-600' : ''}
                    ${collapsed ? 'justify-center px-2' : ''}
                `}
                title={collapsed ? label : undefined}
            >
                <div className={`flex items-center ${collapsed ? 'justify-center w-full' : ''}`}>
                    <Icon className={`${collapsed ? '' : 'mr-3'} h-5 w-5 shrink-0`} />
                    {!collapsed && <span className="truncate">{label}</span>}
                </div>
                {!collapsed && (
                    isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />
                )}
            </button>
            {!collapsed && isOpen && (
                <div className="bg-gray-50 overflow-hidden transition-all duration-300">
                    {children}
                </div>
            )}
        </div>
    );
}

function SubLink({ href, label, icon: Icon, pathname, ExactMatch = false }: any) {
    const isActive = ExactMatch ? pathname === href : pathname.includes(href);
    return (
        <Link
            href={href}
            className={`flex items-center pl-12 pr-6 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors
                ${isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : ''}
            `}
        >
            {Icon && <Icon className="mr-2 h-4 w-4 shrink-0" />}
            <span className="truncate">{label}</span>
        </Link>
    );
}
