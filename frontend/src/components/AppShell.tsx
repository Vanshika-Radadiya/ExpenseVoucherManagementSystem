import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'

function titleFor(path: string) {
  if (path === '/dashboard') return 'Overview'
  if (path === '/vouchers/new') return 'New voucher'
  if (path.endsWith('/edit')) return 'Edit draft'
  if (/^\/vouchers\/[^/]+$/.test(path)) return 'Voucher details'
  return 'Vouchers'
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  if (!user) return null

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(user.role === 'DIRECTOR'
      ? [
          { to: '/vouchers?status=PENDING_APPROVAL', label: 'Approval queue', icon: ShieldCheck },
          { to: '/vouchers', label: 'All vouchers', icon: FileText },
        ]
      : [{ to: '/vouchers', label: user.role === 'EMPLOYEE' ? 'My vouchers' : 'All vouchers', icon: FileText }]),
    ...(user.role === 'EMPLOYEE'
      ? [{ to: '/vouchers/new', label: 'Create voucher', icon: FilePlus2 }]
      : []),
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Link to="/dashboard" className="sidebar-brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><FileText size={18} /></span>
          <span>Voucher<span className="brand-light">Desk</span></span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) => {
                const directorList = user.role === 'DIRECTOR' && location.pathname === '/vouchers'
                const pendingView = new URLSearchParams(location.search).get('status') === 'PENDING_APPROVAL'
                const selected = directorList
                  ? label === 'Approval queue' ? pendingView : label === 'All vouchers' && !pendingView
                  : isActive
                return `nav-link ${selected ? 'active' : ''}`
              }}
              end={to === '/dashboard' || label === 'All vouchers'}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={17} strokeWidth={1.8} /> <span>{label}</span>
              {label === 'Approval queue' && <span className="nav-indicator" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-state"><span className="online-dot" /> API workspace</div>
          <button className="user-menu" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
            <span className="avatar">{user.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
            <span className="user-copy"><strong>{user.fullName}</strong><small>{user.role.toLowerCase()}</small></span>
            <LogOut size={16} className="logout-icon" />
          </button>
        </div>
      </aside>
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumb"><span>WORKSPACE</span><span className="breadcrumb-slash">/</span><strong>{titleFor(location.pathname)}</strong></div>
          <div className="topbar-right"><span className="today-label">EXPENSE OPERATIONS</span><span className="topbar-divider" /><span className="topbar-role">{user.role}</span></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  )
}