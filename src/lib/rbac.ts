export type UserRole = 'admin' | 'manager' | 'staff'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理者',
  manager: 'マネージャー',
  staff: 'スタッフ',
}

export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageSettings: true,
    canDeleteVouchers: true,
    canExportData: true,
    canViewAllBranches: true,
    canManageMFA: true,
    canCreateInvoices: true,
    canCreateEstimates: true,
    canManageJournal: true,
    canManageCustomers: true,
    canManageVehicleInspections: true,
    canViewAccounting: true,
  },
  manager: {
    canManageUsers: false,
    canManageSettings: true,
    canDeleteVouchers: true,
    canExportData: true,
    canViewAllBranches: false,
    canManageMFA: true,
    canCreateInvoices: true,
    canCreateEstimates: true,
    canManageJournal: true,
    canManageCustomers: true,
    canManageVehicleInspections: true,
    canViewAccounting: true,
  },
  staff: {
    canManageUsers: false,
    canManageSettings: false,
    canDeleteVouchers: false,
    canExportData: false,
    canViewAllBranches: false,
    canManageMFA: true,
    canCreateInvoices: true,
    canCreateEstimates: true,
    canManageJournal: false,
    canManageCustomers: true,
    canManageVehicleInspections: true,
    canViewAccounting: false,
  },
} as const

export type Permission = keyof typeof ROLE_PERMISSIONS.admin

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false
}

export function getRolePermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff
}
