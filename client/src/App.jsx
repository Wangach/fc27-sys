import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StaffDashboard from './pages/StaffDashboard';
import CustomersPage from './pages/CustomersPage';
import GamesPage from './pages/GamesPage';
import PaymentsPage from './pages/PaymentsPage';
import DebtsPage from './pages/DebtsPage';
import InvoicesPage from './pages/InvoicesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import TicketsPage from './pages/TicketsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import HeadToHeadPage from './pages/HeadToHeadPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ProfilePage from './pages/customer/ProfilePage';
import MyGamesPage from './pages/customer/MyGamesPage';
import MyTransactionsPage from './pages/customer/MyTransactionsPage';
import MyDebtsPage from './pages/customer/MyDebtsPage';
import MyInvoicesPage from './pages/customer/MyInvoicesPage';
import FeedbackPage from './pages/customer/FeedbackPage';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'CUSTOMER' ? '/player/dashboard' : '/staff/dashboard'} replace />;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />

        <Route element={<ProtectedRoute roles={['ADMIN','CO_ADMIN']} />}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/customers" element={<CustomersPage />} />
          <Route path="/staff/games" element={<GamesPage />} />
          <Route path="/staff/payments" element={<PaymentsPage />} />
          <Route path="/staff/debts" element={<DebtsPage />} />
          <Route path="/staff/invoices" element={<InvoicesPage />} />
          <Route path="/staff/tickets" element={<TicketsPage />} />
          <Route path="/staff/players/:id" element={<PlayerProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/audit" element={<AuditPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/head-to-head" element={<HeadToHeadPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
          <Route path="/player/dashboard" element={<CustomerDashboard />} />
          <Route path="/player/profile" element={<ProfilePage />} />
          <Route path="/player/games" element={<MyGamesPage />} />
          <Route path="/player/transactions" element={<MyTransactionsPage />} />
          <Route path="/player/debts" element={<MyDebtsPage />} />
          <Route path="/player/invoices" element={<MyInvoicesPage />} />
          <Route path="/player/feedback" element={<FeedbackPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
