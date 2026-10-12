import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { VoucherDetailPage } from './pages/VoucherDetailPage'
import { VoucherFormPage } from './pages/VoucherFormPage'
import { VoucherListPage } from './pages/VoucherListPage'

function ProtectedApp() {
  const { user, ready } = useAuth()

  if (!ready) {
    return <div className="full-screen-loading"><span className="spinner" />Loading workspace</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/vouchers" element={<VoucherListPage />} />
        <Route path="/vouchers/new" element={user?.role === 'EMPLOYEE' ? <VoucherFormPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/vouchers/:id" element={<VoucherDetailPage />} />
        <Route path="/vouchers/:id/edit" element={user?.role === 'EMPLOYEE' ? <VoucherFormPage /> : <Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}
