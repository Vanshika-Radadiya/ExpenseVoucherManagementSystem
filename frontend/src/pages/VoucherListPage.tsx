import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { listVouchers } from '../api/vouchers'
import type { VoucherPage, VoucherQuery, VoucherStatus } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorNotice, LoadingState, StatusPill } from '../components/common'
import { formatDate, formatMoney } from '../utils/format'

const pageSize = 12

export function VoucherListPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const serializedParams = searchParams.toString()
  const [result, setResult] = useState<{ key: string; data: VoucherPage | null; error: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(serializedParams)
    const query: VoucherQuery = {
      page: Number(params.get('page') ?? 1),
      pageSize,
      search: params.get('search') ?? '',
      status: (params.get('status') ?? '') as VoucherStatus | '',
      department: params.get('department') ?? '',
      category: params.get('category') ?? '',
      fromDate: params.get('fromDate') ?? '',
      toDate: params.get('toDate') ?? '',
      minAmount: params.has('minAmount') ? Number(params.get('minAmount')) : '',
      maxAmount: params.has('maxAmount') ? Number(params.get('maxAmount')) : '',
      sortBy: params.get('sortBy') ?? 'createdAt',
      sortDirection: (params.get('sortDirection') ?? 'desc') as 'asc' | 'desc',
    }
    let active = true
    listVouchers(query).then((result) => {
      if (active) setResult({ key: serializedParams, data: result, error: '' })
    }).catch((caught: unknown) => {
      if (active) setResult({ key: serializedParams, data: null, error: caught instanceof Error ? caught.message : 'Unable to load vouchers' })
    })
    return () => { active = false }
  }, [serializedParams])

  if (!user) return null
  const currentResult = result?.key === serializedParams ? result : null
  const data = currentResult?.data ?? null
  const error = currentResult?.error ?? ''
  const loading = !currentResult
  const currentPage = Number(searchParams.get('page') ?? 1)
  const sortBy = searchParams.get('sortBy') ?? 'createdAt'
  const sortDirection = searchParams.get('sortDirection') ?? 'desc'

  function changeSort(field: string) {
    const next = new URLSearchParams(serializedParams)
    const direction = sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc'
    next.set('sortBy', field)
    next.set('sortDirection', direction)
    next.set('page', '1')
    setSearchParams(next)
  }

  function changePage(page: number) {
    const next = new URLSearchParams(serializedParams)
    next.set('page', String(page))
    setSearchParams(next)
  }

  return (
    <div className="page-stack">
      <section className="welcome-row list-heading">
        <div><div className="eyebrow">{user.role === 'EMPLOYEE' ? 'PERSONAL RECORDS' : 'ORGANIZATION RECORDS'}</div><h1>{user.role === 'EMPLOYEE' ? 'My vouchers' : user.role === 'DIRECTOR' && searchParams.get('status') === 'PENDING_APPROVAL' ? 'Approval queue' : 'All vouchers'}</h1><p>{data ? `${data.total} voucher${data.total === 1 ? '' : 's'} found` : 'Search and review expense records.'}</p></div>
        {user.role === 'EMPLOYEE' && <Link className="button button-primary" to="/vouchers/new">Create voucher <span>+</span></Link>}
      </section>
      <FilterPanel key={serializedParams} />
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {loading ? <LoadingState /> : data && (data.items.length ? <>
        <div className="table-wrap voucher-table-wrap"><table>
          <thead><tr>
            <th><SortButton label="Voucher" field="voucherNumber" current={sortBy} direction={sortDirection} onClick={changeSort} /></th>
            {user.role !== 'EMPLOYEE' && <th><SortButton label="Employee" field="employeeName" current={sortBy} direction={sortDirection} onClick={changeSort} /></th>}
            <th><SortButton label="Expense date" field="expenseDate" current={sortBy} direction={sortDirection} onClick={changeSort} /></th>
            <th><SortButton label="Department" field="department" current={sortBy} direction={sortDirection} onClick={changeSort} /></th>
            <th>Status</th>
            <th className="align-right"><SortButton label="Amount" field="amount" current={sortBy} direction={sortDirection} onClick={changeSort} align="right" /></th>
          </tr></thead>
          <tbody>{data.items.map((voucher) => <tr key={voucher.id}>
            <td><Link className="table-primary" to={`/vouchers/${voucher.id}`}>{voucher.voucherNumber}<small>{voucher.title}</small></Link></td>
            {user.role !== 'EMPLOYEE' && <td>{voucher.employeeName}<small className="table-secondary">{voucher.employeeIdSnapshot ?? 'No employee ID'}</small></td>}
            <td>{formatDate(voucher.expenseDate)}</td><td>{voucher.department}</td><td><StatusPill status={voucher.status} /></td><td className="align-right amount-cell">{formatMoney(voucher.amount)}</td>
          </tr>)}</tbody>
        </table></div>
        <footer className="pagination"><span>Showing {Math.min((currentPage - 1) * pageSize + 1, data.total)}–{Math.min(currentPage * pageSize, data.total)} of {data.total}</span><div><button className="icon-button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={17} /></button><span className="page-count">{currentPage}</span><button className="icon-button" aria-label="Next page" disabled={currentPage * pageSize >= data.total} onClick={() => changePage(currentPage + 1)}><ChevronRight size={17} /></button></div></footer>
      </> : <EmptyState title="No vouchers match these filters" detail="Adjust the filters or try a broader search." />)}
    </div>
  )
}

function SortButton({ label, field, current, direction, align = 'left', onClick }: {
  label: string
  field: string
  current: string
  direction: string
  align?: 'left' | 'right'
  onClick: (field: string) => void
}) {
  const active = current === field
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  return <button className={`sort-button ${align === 'right' ? 'sort-right' : ''}`} onClick={() => onClick(field)} type="button">{label}{active && <Icon size={13} />}</button>
}

function FilterPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    department: searchParams.get('department') ?? '',
    category: searchParams.get('category') ?? '',
    fromDate: searchParams.get('fromDate') ?? '',
    toDate: searchParams.get('toDate') ?? '',
    minAmount: searchParams.get('minAmount') ?? '',
    maxAmount: searchParams.get('maxAmount') ?? '',
  }))

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) next.set(key, value.trim())
    }
    next.set('page', '1')
    next.set('sortBy', searchParams.get('sortBy') ?? 'createdAt')
    next.set('sortDirection', searchParams.get('sortDirection') ?? 'desc')
    setSearchParams(next)
  }

  function updateFilter(field: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="filter-panel">
      <form onSubmit={applyFilters}>
        <div className="filter-topline">
          <label className="search-control"><Search size={17} /><input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Voucher number, employee, department, category" maxLength={100} /><button className="button button-primary filter-submit" type="submit">Search</button></label>
          <button className={`button button-subtle ${filtersOpen ? 'is-active' : ''}`} type="button" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters</button>
        </div>
        {filtersOpen && <div className="filter-grid">
          <label>Status<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
          <label>Department<input value={filters.department} onChange={(event) => updateFilter('department', event.target.value)} maxLength={120} /></label>
          <label>Category<input value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} maxLength={120} /></label>
          <label>Expense date from<input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} /></label>
          <label>Expense date to<input type="date" value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} /></label>
          <label>Minimum amount<input type="number" min="0" step="0.01" value={filters.minAmount} onChange={(event) => updateFilter('minAmount', event.target.value)} /></label>
          <label>Maximum amount<input type="number" min="0" step="0.01" value={filters.maxAmount} onChange={(event) => updateFilter('maxAmount', event.target.value)} /></label>
          <button className="button button-primary filter-apply" type="submit">Apply filters</button>
        </div>}
      </form>
    </section>
  )
}