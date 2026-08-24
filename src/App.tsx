import { useEffect, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { CatalogProvider } from './context/CatalogContext'
import { OpsProvider } from './context/OpsContext'
import { VendorProvider } from './context/VendorContext'
import { audienceFromPath, syncPwaManifest } from './lib/pwaManifest'
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { CategoryPage } from './pages/CategoryPage'
import { VendorPage } from './pages/VendorPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { FindOrderPage } from './pages/FindOrderPage'
import { OrderConfirmedPage } from './pages/OrderConfirmedPage'
import { TrackPage } from './pages/TrackPage'
import { HowPage } from './pages/HowPage'
import { GuaranteePage } from './pages/GuaranteePage'
import { TermsPage } from './pages/TermsPage'
import { WorkWithUsPage } from './pages/WorkWithUsPage'
import {
  RequireVendor,
  VendorShell,
} from './pages/vendor/VendorShell'
import { VendorLoginPage } from './pages/vendor/VendorLoginPage'
import { VendorSignupPage } from './pages/vendor/VendorSignupPage'
import { VendorOrdersPage } from './pages/vendor/VendorOrdersPage'
import { VendorHistoryPage } from './pages/vendor/VendorHistoryPage'
import { VendorOrderDetailPage } from './pages/vendor/VendorOrderDetailPage'
import { VendorMenuPage } from './pages/vendor/VendorMenuPage'
import { VendorProfilePage } from './pages/vendor/VendorProfilePage'
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

  useEffect(() => {
    syncPwaManifest(audienceFromPath(location.pathname))
  }, [location.pathname])

  if (location.pathname.startsWith('/admin')) return children
  if (location.pathname.startsWith('/vendor')) return children

  const marketing =
    location.pathname === '/' ||
    location.pathname === '/how' ||
    location.pathname === '/guarantee' ||
    location.pathname === '/terms' ||
    location.pathname === '/work-with-us'

  // Customer standalone should land in /app — never steal /vendor.
  // If an old home-screen web clip opens `/` with the vendor apple title, send to board.
  if (isStandaloneDisplay() && marketing) {
    const appleTitle =
      document
        .querySelector('meta[name="apple-mobile-web-app-title"]')
        ?.getAttribute('content')
        ?.toLowerCase() ?? ''
    if (appleTitle.includes('vendor')) {
      return <Navigate to="/vendor" replace />
    }
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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/work-with-us" element={<WorkWithUsPage />} />
        <Route path="/partners" element={<Navigate to="/work-with-us" replace />} />

        <Route path="/vendor/login" element={<VendorLoginPage />} />
        <Route path="/vendor/signup" element={<VendorSignupPage />} />
        <Route
          path="/vendor"
          element={
            <RequireVendor>
              <VendorShell />
            </RequireVendor>
          }
        >
          <Route index element={<VendorOrdersPage />} />
          <Route path="history" element={<VendorHistoryPage />} />
          <Route path="orders/:orderId" element={<VendorOrderDetailPage />} />
          <Route path="menu" element={<VendorMenuPage />} />
          <Route path="profile" element={<VendorProfilePage />} />
        </Route>

        <Route path={APP_BASE} element={<BrowsePage />} />
        <Route path={`${APP_BASE}/category/:categoryId`} element={<CategoryPage />} />
        <Route path={`${APP_BASE}/vendors/:vendorId`} element={<VendorPage />} />
        <Route path={`${APP_BASE}/cart`} element={<CartPage />} />
        <Route path={`${APP_BASE}/checkout`} element={<CheckoutPage />} />
        <Route path={`${APP_BASE}/find-order`} element={<FindOrderPage />} />
        <Route
          path={`${APP_BASE}/orders/:orderId/confirmed`}
          element={<OrderConfirmedPage />}
        />
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
          <VendorProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </VendorProvider>
        </OpsProvider>
      </CartProvider>
    </CatalogProvider>
  )
}
