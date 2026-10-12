import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Clock3, FileText, ReceiptText, RotateCw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboard, listVouchers } from '../api/vouchers'
import type { Dashboard, Voucher } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorNotice, LoadingState, StatusPill } from '../components/common'
import { formatDate, formatMoney } from '../utils/format'

function Metric({ label, value, icon: Icon, note, tone = '' }: {
  label: string
  value: string | number
  icon: typeof FileText
  note?: string
  tone?: string
}) {
  return (
    <article className={`metric ${tone}`}>
      <div className="metric-top"><span>{label}</span><Icon size={17} strokeWidth={1.8} /></div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [recent, setRecent] = useState<Voucher[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      getDashboard(),
      listVouchers({ page: 1, pageSize: 6, sortBy: 'createdAt', sortDirection: 'desc' }),
    ]).then(([metrics, vouchers]) => {
      if (active) {
        setDashboard(metrics)
        setRecent(vouchers.items)
      }
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load dashboard')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  if (!user) return null
  if (loading) return <LoadingState label="Loading dashboard" />
  if (error) return <ErrorNotice>{error}</ErrorNotice>
  if (!dashboard) return null

  const greeting = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const employee = user.role === 'EMPLOYEE'
  const director = user.role === 'DIRECTOR'
  const employeeData = 'totalAmountClaimed' in dashboard ? dashboard : null
  const directorData = 'pendingApprovalCount' in dashboard ? dashboard : null
  const accountsData = 'totalApprovedExpenseAmount' in dashboard ? dashboard : null

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">{greeting.toUpperCase()}</div>
          <h1>{employee ? 'Your expense desk' : director ? 'Approval overview' : 'Accounts overview'}</h1>
          <p>{employee ? 'A clear view of every claim, from draft to decision.' : director ? 'Review requests and keep the approval queue moving.' : 'Organization-wide voucher activity and approved expenses.'}</p>
        </div>
        {employee && <Link className="button button-primary" to="/vouchers/new"><ReceiptText size={16} /> New voucher <ArrowUpRight size={16} /></Link>}
        {director && <Link className="button button-primary" to="/vouchers?status=PENDING_APPROVAL"><Check size={16} /> Review queue <ArrowUpRight size={16} /></Link>}
      </section>

      <section className="metric-grid" aria-label="Voucher metrics">
        {employeeData && <>
          <Metric label="Total vouchers" value={employeeData.totalVouchers} icon={FileText} note="All time" />
          <Metric label="In progress" value={employeeData.pendingApproval} icon={Clock3} note={`${employeeData.draftVouchers} drafts`} tone="metric-lime" />
          <Metric label="Approved" value={employeeData.approvedVouchers} icon={Check} note={`${employeeData.rejectedVouchers} rejected`} tone="metric-green" />
          <Metric label="Amount claimed" value={formatMoney(employeeData.totalAmountClaimed)} icon={ReceiptText} note="Across all vouchers" tone="metric-ink" />
        </>}
        {directorData && <>
          <Metric label="Awaiting review" value={directorData.pendingApprovalCount} icon={Clock3} note="Pending approval" tone="metric-lime" />
          <Metric label="Pending amount" value={formatMoney(directorData.totalPendingAmount)} icon={ReceiptText} note="Across open requests" />
          <Metric label="Approved today" value={directorData.approvedToday} icon={Check} note="UTC day" tone="metric-green" />
          <Metric label="Rejected today" value={directorData.rejectedToday} icon={X} note="UTC day" tone="metric-red" />
        </>}
        {accountsData && <>
          <Metric label="Total vouchers" value={accountsData.totalVouchers} icon={FileText} note="Organization-wide" />
          <Metric label="Pending approval" value={accountsData.pendingApproval} icon={Clock3} note="Awaiting director" tone="metric-lime" />
          <Metric label="Approved" value={accountsData.approvedVouchers} icon={Check} note={`${accountsData.rejectedVouchers} rejected`} tone="metric-green" />
          <Metric label="Approved expenses" value={formatMoney(accountsData.totalApprovedExpenseAmount)} icon={ReceiptText} note="Ready for processing" tone="metric-ink" />
        </>}
      </section>

      {directorData && <section className="content-section">
        <div className="section-heading"><div><span className="eyebrow">LIVE ACTIVITY</span><h2>Recent voucher activity</h2></div><Link className="text-link" to="/vouchers">All vouchers <ArrowRight size={15} /></Link></div>
        {directorData.recentVoucherActivity.length === 0 ? <EmptyState title="No activity yet" detail="Voucher events will appear here." /> : (
          <div className="activity-list">
            {directorData.recentVoucherActivity.map((event) => (
              <Link className="activity-row" to={`/vouchers/${event.voucher.id}`} key={event.id}>
                <span className="activity-icon"><ActivityIcon type={event.type} /></span>
                <span className="activity-copy"><strong>{event.type.replaceAll('_', ' ').toLowerCase()}</strong><small>{event.actor.fullName} · {event.voucher.voucherNumber} · {event.voucher.title}</small></span>
                <span className="activity-date">{formatDate(event.createdAt)}</span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>}

      {accountsData && <section className="content-section">
        <div className="section-heading"><div><span className="eyebrow">RECENTLY APPROVED</span><h2>Approved vouchers</h2></div><Link className="text-link" to="/vouchers?status=APPROVED">View approved <ArrowRight size={15} /></Link></div>
        <div className="table-wrap"><table><thead><tr><th>Voucher</th><th>Employee</th><th>Department</th><th>Approved</th><th className="align-right">Amount</th></tr></thead><tbody>
          {accountsData.recentApprovedVouchers.map((voucher) => <tr key={voucher.id}>
            <td><Link className="table-primary" to={`/vouchers/${voucher.id}`}>{voucher.voucherNumber}<small>{voucher.title}</small></Link></td>
            <td>{voucher.employeeName}</td><td>{voucher.department}</td><td>{formatDate(voucher.approvalDate)}</td><td className="align-right amount-cell">{formatMoney(voucher.amount)}</td>
          </tr>)}
        </tbody></table>{accountsData.recentApprovedVouchers.length === 0 && <EmptyState title="No approved vouchers" detail="Approved vouchers will appear here." />}</div>
      </section>}

      {employee && <section className="content-section">
        <div className="section-heading"><div><span className="eyebrow">YOUR RECORDS</span><h2>Recent vouchers</h2></div><Link className="text-link" to="/vouchers">View all <ArrowRight size={15} /></Link></div>
        <VoucherRows vouchers={recent} />
      </section>}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  if (type === 'APPROVED') return <Check size={17} />
  if (type === 'REJECTED') return <X size={17} />
  if (type === 'SUBMITTED') return <ArrowUpRight size={17} />
  return <RotateCw size={17} />
}

export function VoucherRows({ vouchers }: { vouchers: Voucher[] }) {
  if (!vouchers.length) return <EmptyState title="No vouchers to show" detail="New vouchers will appear here once created." />
  return <div className="table-wrap"><table><thead><tr><th>Voucher</th><th>Expense date</th><th>Department</th><th>Status</th><th className="align-right">Amount</th></tr></thead><tbody>
    {vouchers.map((voucher) => <tr key={voucher.id}>
      <td><Link className="table-primary" to={`/vouchers/${voucher.id}`}>{voucher.voucherNumber}<small>{voucher.title}</small></Link></td>
      <td>{formatDate(voucher.expenseDate)}</td><td>{voucher.department}</td><td><StatusPill status={voucher.status} /></td><td className="align-right amount-cell">{formatMoney(voucher.amount)}</td>
    </tr>)}
  </tbody></table></div>
}