import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import GlobalLoadingState from "./components/GlobalLoadingState";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";

const GuideListPage = lazy(() => import("./pages/GuideListPage"));
const GuideProfilePage = lazy(() => import("./pages/GuideProfilePage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentFailedPage = lazy(() => import("./pages/PaymentFailedPage"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));

function ProtectedRoute() {
  const location = useLocation();
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}

function RoutedLayout() {
  return (
    <Layout>
      <Suspense fallback={<GlobalLoadingState label="Loading page..." />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

function NotFoundPage() {
  return (
    <section className="section-shell">
      <div className="container-premium text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-[#F5F5F5]/70">The page you requested does not exist.</p>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<RoutedLayout />}>
        <Route path="/" element={<GuideListPage />} />
        <Route path="/guide/:id" element={<GuideProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/booking/:guideId" element={<BookingPage />} />
          <Route path="/checkout/:bookingId" element={<PaymentPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/failed" element={<PaymentFailedPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
