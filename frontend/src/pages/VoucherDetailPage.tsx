import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, Check, Clock3, FileCheck2, Pencil, Send, Trash2, Upload, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  approveVoucher,
  deleteVoucher,
  getVoucher,
  rejectVoucher,
  submitVoucher,
  uploadEmployeeSignature,
} from '../api/vouchers'
import type { Voucher } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorNotice, LoadingState, SignaturePreview, StatusPill } from '../components/common'
import { formatDate, formatMoney } from '../utils/format'

const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function VoucherDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  async function reload() {
    const result = await getVoucher(id)
    setVoucher(result)
  }

  useEffect(() => {
    let active = true
    getVoucher(id).then((result) => {
      if (active) setVoucher(result)
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load voucher')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await reload()
      setNotice(successMessage)
      setSignatureFile(null)
      setRejectionReason('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The action could not be completed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignatureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!allowedImageTypes.has(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Signature images must be 5 MB or smaller.')
      return
    }
    await runAction(() => uploadEmployeeSignature(id, file), 'Employee signature uploaded.')
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(() => rejectVoucher(id, rejectionReason.trim()), 'Voucher rejected.')
  }

  async function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signatureFile) return
    if (!allowedImageTypes.has(signatureFile.type)) {
      setError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (signatureFile.size > 5 * 1024 * 1024) {
      setError('Signature images must be 5 MB or smaller.')
      return
    }
    await runAction(() => approveVoucher(id, signatureFile), 'Voucher approved.')
  }

  if (loading) return <LoadingState label="Loading voucher" />
  if (error && !voucher) return <ErrorNotice>{error}</ErrorNotice>
  if (!voucher || !user) return null

  const currentVoucher = voucher
  const isOwner = user.role === 'EMPLOYEE' && currentVoucher.createdById === user.id
  const employeeDraft = isOwner && currentVoucher.status === 'DRAFT'
  const directorPending = user.role === 'DIRECTOR' && currentVoucher.status === 'PENDING_APPROVAL'
  const canEdit = employeeDraft

  async function handleDelete() {
    if (!window.confirm(`Delete draft ${currentVoucher.voucherNumber}? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await deleteVoucher(currentVoucher.id)
      navigate('/vouchers', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete voucher')
      setBusy(false)
    }
  }

  return (
    <div className="page-stack detail-page">
      <div className="detail-back"><Link className="text-link" to="/vouchers"><ArrowLeft size={15} /> Back to vouchers</Link><span>{voucher.voucherNumber}</span></div>
      <section className="detail-heading">
        <div><div className="eyebrow">{voucher.department.toUpperCase()} / {voucher.category.toUpperCase()}</div><h1>{voucher.title}</h1><div className="detail-meta"><span>{voucher.voucherNumber}</span><span className="meta-dot" />Created {formatDate(voucher.createdAt)}</div></div>
        <div className="detail-heading-right"><StatusPill status={voucher.status} />{canEdit && <Link className="button button-subtle" to={`/vouchers/${id}/edit`}><Pencil size={15} /> Edit draft</Link>}</div>
      </section>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {notice && <div className="success-notice"><Check size={16} />{notice}</div>}
      <div className="detail-grid">
        <div className="detail-main-column">
          <section className="detail-section">
            <div className="section-heading compact"><div><span className="eyebrow">VOUCHER INFORMATION</span><h2>Expense details</h2></div></div>
            <div className="detail-fields">
              <DetailField label="Expense date" value={formatDate(voucher.expenseDate)} />
              <DetailField label="Voucher date" value={formatDate(voucher.voucherDate)} />
              <DetailField label="Approval date" value={formatDate(voucher.approvalDate)} />
              <DetailField label="Department" value={voucher.department} />
              <DetailField label="Category" value={voucher.category} />
              <DetailField label="Amount" value={formatMoney(voucher.amount)} prominent />
              <DetailField label="Employee" value={voucher.employeeName} />
              <div className="detail-field field-full"><span>Description</span><p>{voucher.description}</p></div>
            </div>
          </section>
          {voucher.status === 'REJECTED' && voucher.rejectionReason && <section className="rejection-panel"><div className="rejection-heading"><X size={17} /><strong>Rejection reason</strong></div><p>{voucher.rejectionReason}</p></section>}
          <section className="detail-section signature-section">
            <div className="section-heading compact"><div><span className="eyebrow">AUTHORIZATION</span><h2>Signatures</h2></div></div>
            <div className="signatures-grid">
              <SignaturePreview path={voucher.employeeSignatureUrl} label="Employee" />
              <SignaturePreview path={voucher.directorSignatureUrl} label="Director" />
            </div>
            {employeeDraft && <label className="upload-signature button button-subtle"><Upload size={15} />{voucher.employeeSignatureUrl ? 'Replace signature' : 'Upload signature'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSignatureUpload} disabled={busy} /></label>}
          </section>
          {directorPending && <section className="decision-panel">
            <div className="section-heading compact"><div><span className="eyebrow">DIRECTOR ACTION</span><h2>Decision</h2></div></div>
            <form className="approve-form" onSubmit={handleApprove}>
              <label className="file-drop"><Upload size={19} /><span><strong>{signatureFile?.name ?? 'Add director signature'}</strong><small>PNG, JPEG or WebP · up to 5 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => setSignatureFile(event.target.files?.[0] ?? null)} /></label>
              <button className="button button-primary" type="submit" disabled={busy || !signatureFile}><Check size={16} /> Approve voucher</button>
            </form>
            <form className="reject-form" onSubmit={handleReject}>
              <label>Rejection reason<textarea required minLength={1} maxLength={2000} rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Provide a reason for the employee" /></label>
              <button className="button button-danger" type="submit" disabled={busy || !rejectionReason.trim()}><X size={16} /> Reject voucher</button>
            </form>
          </section>}
          {employeeDraft && <section className="draft-actions"><div><span className="eyebrow">READY TO SUBMIT?</span><p>{voucher.employeeSignatureUrl ? 'Your signed voucher can now be sent for approval.' : 'Upload your signature before sending for approval.'}</p></div><button className="button button-primary" onClick={() => runAction(() => submitVoucher(id), 'Voucher submitted for approval.')} disabled={busy || !voucher.employeeSignatureUrl}><Send size={16} /> Submit for approval</button><button className="icon-button delete-action" aria-label="Delete draft" title="Delete draft" onClick={handleDelete} disabled={busy}><Trash2 size={17} /></button></section>}
        </div>
        <aside className="detail-side-column">
          <section className="detail-section employee-card"><div className="section-heading compact"><div><span className="eyebrow">SUBMITTED BY</span><h2>{voucher.employeeName}</h2></div></div><div className="employee-initials">{voucher.employeeName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="employee-id"><span>Employee ID</span><strong>{voucher.employeeIdSnapshot ?? 'Not supplied'}</strong></div></section>
          <section className="detail-section timeline-section"><div className="section-heading compact"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Activity</h2></div></div>{voucher.events?.length ? <ol className="timeline">{[...voucher.events].reverse().map((event) => <li key={event.id}><span className={`timeline-mark mark-${event.type.toLowerCase()}`}><TimelineIcon type={event.type} /></span><div><strong>{event.type.replaceAll('_', ' ').toLowerCase()}</strong><small>{event.actor.fullName} · {event.actor.role.toLowerCase()}</small><time>{formatDate(event.createdAt)}</time></div></li>)}</ol> : <EmptyState title="No activity" detail="Voucher events will appear here." />}</section>
          <div className="record-updated"><Clock3 size={14} /> Last updated {formatDate(voucher.updatedAt)}</div>
        </aside>
      </div>
    </div>
  )
}

function DetailField({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div className={`detail-field ${prominent ? 'detail-field-prominent' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

function TimelineIcon({ type }: { type: string }) {
  if (type === 'APPROVED') return <Check size={13} />
  if (type === 'REJECTED') return <X size={13} />
  if (type === 'SUBMITTED') return <Send size={13} />
  if (type === 'CREATED') return <FileCheck2 size={13} />
  return <Pencil size={13} />
}