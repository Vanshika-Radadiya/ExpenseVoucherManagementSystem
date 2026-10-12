export type UserRole = 'EMPLOYEE' | 'DIRECTOR' | 'ACCOUNTS'

export type VoucherStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'

export interface User {
  id: string
  email: string
  fullName: string
  employeeId: string | null
  role: UserRole
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: number
}

export interface VoucherEvent {
  id: string
  type: string
  createdAt: string
  fromStatus?: VoucherStatus | null
  toStatus?: VoucherStatus | null
  actor: Pick<User, 'id' | 'fullName' | 'role'>
}

export interface Voucher {
  id: string
  voucherNumber: string
  voucherDate: string
  expenseDate: string
  department: string
  title: string
  category: string
  description: string
  amount: number
  employeeName: string
  employeeIdSnapshot: string | null
  status: VoucherStatus
  rejectionReason: string | null
  approvalDate: string | null
  createdAt: string
  updatedAt: string
  createdById: string
  employeeSignatureUrl: string | null
  directorSignatureUrl: string | null
  createdBy?: Pick<User, 'id' | 'email' | 'fullName' | 'employeeId'>
  events?: VoucherEvent[]
}

export interface VoucherInput {
  expenseDate: string
  department: string
  title: string
  category: string
  description: string
  amount: number
}

export interface VoucherQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: VoucherStatus | ''
  department?: string
  category?: string
  fromDate?: string
  toDate?: string
  minAmount?: number | ''
  maxAmount?: number | ''
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface VoucherPage {
  items: Voucher[]
  page: number
  pageSize: number
  total: number
}

export interface EmployeeDashboard {
  totalVouchers: number
  draftVouchers: number
  pendingApproval: number
  approvedVouchers: number
  rejectedVouchers: number
  totalAmountClaimed: number
}

export interface DirectorDashboard {
  pendingApprovalCount: number
  approvedToday: number
  rejectedToday: number
  totalPendingAmount: number
  recentVoucherActivity: Array<{
    id: string
    type: string
    createdAt: string
    actor: Pick<User, 'id' | 'fullName' | 'role'>
    voucher: Pick<Voucher, 'id' | 'voucherNumber' | 'title' | 'amount' | 'status'>
  }>
}

export interface AccountsDashboard {
  totalVouchers: number
  pendingApproval: number
  approvedVouchers: number
  rejectedVouchers: number
  totalApprovedExpenseAmount: number
  recentApprovedVouchers: Array<{
    id: string
    voucherNumber: string
    employeeName: string
    department: string
    title: string
    amount: number
    approvalDate: string | null
  }>
}

export type Dashboard = EmployeeDashboard | DirectorDashboard | AccountsDashboard