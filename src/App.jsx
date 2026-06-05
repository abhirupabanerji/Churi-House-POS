import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PinLockProvider, usePinLock } from '@/lib/PinLockContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppPinOverlay from '@/components/AppPinOverlay';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Orders from './pages/Orders';
import KitchenDisplay from './pages/KitchenDisplay';
import MenuManagement from './pages/MenuManagement';
import Inventory from './pages/Inventory';
import Branches from './pages/Branches';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import Combos from './pages/Combos';
import Offers from './pages/Offers';
import TableManagement from './pages/TableManagement';
import Reservations from './pages/Reservations';
import OnlineOrders from './pages/OnlineOrders';
import QROrdering from './pages/QROrdering';
import DeliveryManagement from './pages/DeliveryManagement';

import Vendors from './pages/Vendors';
import PurchaseOrders from './pages/PurchaseOrders';
// Analytics merged into Reports
import Spending from './pages/Spending';
import CashDrawer from './pages/CashDrawer';
import TaxCompliance from './pages/TaxCompliance';
import Refunds from './pages/Refunds';
import AttendanceShifts from './pages/AttendanceShifts';
import AuditLogs from './pages/AuditLogs';
import Integrations from './pages/Integrations';
import DataExport from './pages/DataExport';
import UserManagement from './pages/UserManagement';
import UserRoles from './pages/UserRoles';
import BranchComparison from './pages/BranchComparison';
import FranchisePayments from './pages/FranchisePayments';
import Advertisements from './pages/Advertisements';
import ReceiptSettings from './pages/ReceiptSettings';
import FranchiseExpansionAI from './pages/FranchiseExpansionAI';
import Subscriptions from './pages/Subscriptions';
import RecycleBin from './pages/RecycleBin';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Allow if restaurant session exists
      if (localStorage.getItem('restaurant_session')) {
        // fall through to render routes
      } else {
        navigateToLogin();
        return null;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/kitchen" element={<KitchenDisplay />} />
          <Route path="/menu" element={<MenuManagement />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/combos" element={<Combos />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/tables" element={<TableManagement />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/online-orders" element={<OnlineOrders />} />
          <Route path="/qr-ordering" element={<QROrdering />} />
          <Route path="/delivery" element={<DeliveryManagement />} />

          <Route path="/vendors" element={<Vendors />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />

          <Route path="/spending" element={<Spending />} />
          <Route path="/cash-drawer" element={<CashDrawer />} />
          <Route path="/tax" element={<TaxCompliance />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/attendance" element={<AttendanceShifts />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/data-export" element={<DataExport />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/user-roles" element={<UserRoles />} />
          <Route path="/branch-comparison" element={<BranchComparison />} />
          <Route path="/franchise-payments" element={<FranchisePayments />} />
          <Route path="/advertisements" element={<Advertisements />} />
          <Route path="/receipt-settings" element={<ReceiptSettings />} />
          <Route path="/ai-expansion" element={<FranchiseExpansionAI />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/recycle-bin" element={<RecycleBin />} />
        </Route>
        <Route path="/pos" element={<POS />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function PinLockWrapper({ children }) {
  const { isLocked } = usePinLock();
  return (
    <>
      {children}
      {isLocked && <AppPinOverlay />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
        <PinLockProvider>
          <Router>
            <PinLockWrapper>
              <AuthenticatedApp />
            </PinLockWrapper>
          </Router>
          <Toaster />
          <Sonner position="bottom-right" duration={3000} theme="dark" richColors />
        </PinLockProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App