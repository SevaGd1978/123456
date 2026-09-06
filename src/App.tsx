import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useStore } from './store'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderEditPage } from './pages/OrderEditPage'
import { PartiesPage } from './pages/PartiesPage'
import { FleetPage } from './pages/FleetPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ExchangePage } from './pages/ExchangePage'
import { ReportsPage } from './pages/ReportsPage'
import { ImprovementsPage } from './pages/ImprovementsPage'
import { SettingsPage } from './pages/SettingsPage'
import type { ReactNode } from 'react'

function Guard({ children }: { children: ReactNode }) {
  const { session } = useStore()
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<OrderEditPage />} />
        <Route path="orders/:id" element={<OrderEditPage />} />
        <Route path="parties" element={<PartiesPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="exchange" element={<ExchangePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="improvements" element={<ImprovementsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
