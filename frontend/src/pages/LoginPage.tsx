import { useState, type FormEvent } from 'react'
import { ArrowUpRight, FileCheck2, LockKeyhole } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { ApiError } from '../api/client'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to connect. Check the API and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-panel">
        <a className="brand-lockup" href="/login" aria-label="Voucher desk home">
          <span className="brand-mark"><FileCheck2 size={19} strokeWidth={2.2} /></span>
          <span>VOUCHER<span className="brand-light">DESK</span></span>
        </a>
        <div className="login-content">
          <div className="eyebrow"><LockKeyhole size={13} /> SECURE WORKSPACE</div>
          <h1>Good work deserves<br /><em>good records.</em></h1>
          <p className="login-intro">Sign in to manage expense vouchers and approvals.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary login-submit" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={17} />
            </button>
          </form>
          <p className="login-footnote">Access is managed by your company administrator.</p>
        </div>
        <div className="login-footer"><span>ABC COMPANY</span><span>EXPENSE OPERATIONS</span></div>
      </section>
      <aside className="login-aside" aria-label="Voucher overview">
        <div className="aside-grid" />
        <div className="aside-topline"><span>FINANCE / 01</span><span>INTERNAL SYSTEM</span></div>
        <div className="receipt-stack">
          <div className="receipt-shadow" />
          <div className="receipt-paper">
            <div className="receipt-heading"><span>EXPENSE VOUCHER</span><span className="receipt-dot" /></div>
            <div className="receipt-number">EV-2026-0042</div>
            <div className="receipt-rule" />
            <div className="receipt-row"><span>FIELD RESEARCH</span><span>INR 486.00</span></div>
            <div className="receipt-row muted"><span>Submitted by</span><span>J. Morgan</span></div>
            <div className="receipt-row muted"><span>Department</span><span>Operations</span></div>
            <div className="receipt-rule short" />
            <div className="receipt-status"><span className="status-pip" /> PENDING REVIEW</div>
            <div className="receipt-stamp">REVIEW<br />QUEUE</div>
          </div>
        </div>
        <div className="aside-caption"><span>01 — 03</span><span>REQUEST / REVIEW / REIMBURSE</span></div>
        <div className="aside-bottom"><span>CONTROLLED. TRACEABLE. ACCOUNTABLE.</span><span>EST. 2026</span></div>
      </aside>
    </main>
  )
}