import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import type { ReactNode } from 'react'
import { CartProvider } from './context/CartContext'
import { CatalogProvider } from './context/CatalogContext'
import { OpsProvider } from './context/OpsContext'
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { VendorPage } from './pages/VendorPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { TrackPage } from './pages/TrackPage'
import { HowPage } from './pages/HowPage'
import { GuaranteePage } from './pages/GuaranteePage'
import {
  AdminInboxPage,
  AdminLoginPage,
  AdminOrderPage,
} from './pages/admin/AdminPages'
import {
  AdminVendorEditPage,
  AdminVendorsPage,
} from './pages/admin/AdminCatalogPages'
import { APP_BASE, appPath, isStandaloneDisplay } from './paths'

function StandaloneGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (location.pathname.startsWith('/admin')) return children

  const marketing =
    location.pathname === '/' ||
    location.pathname === '/how' ||
    location.pathname === '/guarantee'

  if (isStandaloneDisplay() && marketing) {
    return <Navigate to={APP_BASE} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <StandaloneGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how" element={<HowPage />} />
        <Route path="/guarantee" element={<GuaranteePage />} />

        <Route path={APP_BASE} element={<BrowsePage />} />
        <Route path={`${APP_BASE}/vendors/:vendorId`} element={<VendorPage />} />
        <Route path={`${APP_BASE}/cart`} element={<CartPage />} />
        <Route path={`${APP_BASE}/checkout`} element={<CheckoutPage />} />
        <Route path={`${APP_BASE}/orders/:orderId`} element={<TrackPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminInboxPage />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderPage />} />
        <Route path="/admin/vendors" element={<AdminVendorsPage />} />
        <Route path="/admin/vendors/:vendorId" element={<AdminVendorEditPage />} />

        <Route path="/browse" element={<Navigate to={APP_BASE} replace />} />
        <Route path="/vendors/:vendorId" element={<LegacyVendorRedirect />} />
        <Route path="/cart" element={<Navigate to={appPath('/cart')} replace />} />
        <Route path="/checkout" element={<Navigate to={appPath('/checkout')} replace />} />
        <Route path="/orders/:orderId" element={<LegacyOrderRedirect />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StandaloneGate>
  )
}

function LegacyVendorRedirect() {
  const { vendorId } = useParams()
  return <Navigate to={appPath(`/vendors/${vendorId}`)} replace />
}

function LegacyOrderRedirect() {
  const { orderId } = useParams()
  return <Navigate to={appPath(`/orders/${orderId}`)} replace />
}

export default function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <OpsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </OpsProvider>
      </CartProvider>
    </CatalogProvider>
  )
}
