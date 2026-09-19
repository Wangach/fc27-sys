import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-arena-950 text-volt">Loading FC Arena…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'CUSTOMER' ? '/player/dashboard' : '/staff/dashboard'} replace />;
  return <Outlet />;
}
