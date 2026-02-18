import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GuideProfile from "./pages/GuideProfile";
import BookingFlow from "./pages/BookingFlow";
import Payment from "./pages/Payment";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }) {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/guides" element={<Booking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/guides/:id" element={<GuideProfile />} />
        <Route
          path="/booking-flow"
          element={
            <ProtectedRoute>
              <BookingFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}
