import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

// Pages
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import DeliveryPage from '@/pages/DeliveryPage';
import CustomProductsPage from '@/pages/CustomProductsPage';
import CartPage from '@/pages/CartPage';
import OrdersPage from '@/pages/OrdersPage';
import SuppliersPage from '@/pages/SuppliersPage';

// Protected route wrapper
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Role-based route wrapper
function RoleRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/custom" element={<CustomProductsPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Admin/Manager only routes */}
        <Route element={<RoleRoute allowedRoles={['admin', 'manager']} />}>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
        </Route>

        {/* Delivery routes */}
        <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'delivery']} />}>
          <Route path="/delivery" element={<DeliveryPage />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
