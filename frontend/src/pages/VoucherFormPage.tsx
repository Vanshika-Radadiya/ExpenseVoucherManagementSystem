import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createVoucher, getVoucher, updateVoucher } from '../api/vouchers'
import type { VoucherInput } from '../api/types'
import { ErrorNotice, LoadingState } from '../components/common'

interface FormValues {
  expenseDate: string
  department: string
  title: string
  category: string
  description: string
  amount: string
}

const today = new Date().toISOString().slice(0, 10)
const blankForm: FormValues = { expenseDate: today, department: '', title: '', category: '', description: '', amount: '' }

export function VoucherFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [values, setValues] = useState<FormValues>(blankForm)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let active = true
    getVoucher(id).then((voucher) => {
      if (!active) return
      if (voucher.status !== 'DRAFT') {
        navigate(`/vouchers/${id}`, { replace: true })
        return
      }
      setValues({
        expenseDate: voucher.expenseDate.slice(0, 10),
        department: voucher.department,
        title: voucher.title,
        category: voucher.category,
        description: voucher.description,
        amount: String(voucher.amount),
      })
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load voucher')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id, navigate])

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const input: VoucherInput = {
      ...values,
      expenseDate: new Date(`${values.expenseDate}T00:00:00.000Z`).toISOString(),
      amount: Number(values.amount),
    }
    try {
      const voucher = editing && id ? await updateVoucher(id, input) : await createVoucher(input)
      navigate(`/vouchers/${voucher.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save voucher')
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading draft" />

  return (
    <div className="page-stack form-page">
      <section className="welcome-row">
        <div><div className="eyebrow">EMPLOYEE / DRAFT</div><h1>{editing ? 'Edit voucher' : 'New expense voucher'}</h1><p>Enter the expense details for your reimbursement request.</p></div>
        <Link className="button button-subtle" to={id ? `/vouchers/${id}` : '/vouchers'}><ArrowLeft size={16} /> Back</Link>
      </section>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <form className="voucher-form" onSubmit={handleSubmit}>
        <div className="form-section-heading"><span>01</span><div><strong>Expense details</strong><small>Required fields are marked</small></div></div>
        <div className="form-fields">
          <label className="field-wide">Expense title <b>*</b><input required maxLength={191} value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Client site visit" /></label>
          <label>Department <b>*</b><input required maxLength={120} value={values.department} onChange={(event) => update('department', event.target.value)} placeholder="Department name" /></label>
          <label>Category <b>*</b><input required maxLength={120} value={values.category} onChange={(event) => update('category', event.target.value)} placeholder="e.g. Travel" /></label>
          <label>Expense date <b>*</b><input required type="date" value={values.expenseDate} onChange={(event) => update('expenseDate', event.target.value)} /></label>
          <label>Amount (INR) <b>*</b><input required type="number" min="0.01" max="9999999999.99" step="0.01" value={values.amount} onChange={(event) => update('amount', event.target.value)} placeholder="0.00" /></label>
          <label className="field-wide">Description <b>*</b><textarea required maxLength={5000} rows={5} value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the business purpose of this expense" /></label>
        </div>
        <div className="form-footer"><span>Saved as a draft until submitted.</span><button className="button button-primary" type="submit" disabled={busy}><Save size={16} />{busy ? 'Saving…' : 'Save draft'}</button></div>
      </form>
    </div>
  )
}