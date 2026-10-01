import { Role } from '@prisma/client';

export const MODULES = {
    DASHBOARD: 'dashboard',
    USERS: 'users',
    LEADS: 'leads',
    CUSTOMERS: 'customers',
    BILLING: 'billing',
    NOC: 'noc',
    SETTINGS: 'settings',
} as const;

export type ModuleType = typeof MODULES[keyof typeof MODULES];

export const MODULE_LABELS: Record<ModuleType, string> = {
    [MODULES.DASHBOARD]: 'Dashboard',
    [MODULES.USERS]: 'User Management',
    [MODULES.LEADS]: 'Sales & Leads',
    [MODULES.CUSTOMERS]: 'Customer List',
    [MODULES.BILLING]: 'Billing & Finance',
    [MODULES.NOC]: 'Network Operations (NOC)',
    [MODULES.SETTINGS]: 'System Settings',
};

// Default permissions for initialization
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, ModuleType[]> = {
    ADMIN: Object.values(MODULES), // All
    FINANCE: [MODULES.DASHBOARD, MODULES.BILLING, MODULES.CUSTOMERS, MODULES.LEADS],
    NOC: [MODULES.DASHBOARD, MODULES.NOC, MODULES.CUSTOMERS],
    SALES: [MODULES.DASHBOARD, MODULES.LEADS, MODULES.CUSTOMERS],
    TECHNICIAN: [MODULES.DASHBOARD, MODULES.NOC], // Field tasks usually in NOC/Tasks
    LEAD: [],
    CUSTOMER: [],
    RESELLER: [MODULES.DASHBOARD, MODULES.CUSTOMERS, MODULES.BILLING],
};

export function hasPermission(userPermissions: string[], module: string): boolean {
    return userPermissions.includes(module);
}
