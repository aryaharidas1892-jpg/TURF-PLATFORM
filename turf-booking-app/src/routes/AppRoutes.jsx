// src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import OwnerRoute from "./OwnerRoute";

// Regular pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import TurfList from "../pages/TurfList";
import TurfDetail from "../pages/TurfDetail";
import BookingPage from "../pages/BookingPage";
import BookingHistory from "../pages/BookingHistory";
import WalletPage from "../pages/WalletPage";
import PlayersList from "../pages/PlayersList";
import Profile from "../pages/Profile";
import NotFound from "../pages/NotFound";
import MapPage from "../pages/MapPage";

// Turf request (users)
import MyTurfRequests from "../pages/MyTurfRequests";

// Owner pages
import OwnerSignup from "../pages/OwnerSignup";
import OwnerPendingPage from "../pages/OwnerPendingPage";
import OwnerDashboard from "../pages/OwnerDashboard";

// Admin
import AdminTurfRequests from "../pages/AdminTurfRequests";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/turfs" element={<TurfList />} />
      <Route path="/turfs/:id" element={<TurfDetail />} />
      <Route path="/players" element={<PlayersList />} />
      <Route path="/map" element={<MapPage />} />

      {/* Regular user protected */}
      <Route path="/book/:id"   element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
      <Route path="/bookings"   element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />
      <Route path="/wallet"     element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/my-turf-requests" element={<ProtectedRoute><MyTurfRequests /></ProtectedRoute>} />

      {/* Owner signup & pending (only needs auth, not approved owner) */}
      <Route path="/owner-signup" element={<OwnerSignup />} />
      <Route path="/owner/pending" element={<ProtectedRoute><OwnerPendingPage /></ProtectedRoute>} />

      {/* Owner dashboard (approved owners only) */}
      <Route path="/owner/dashboard" element={<OwnerRoute><OwnerDashboard /></OwnerRoute>} />

      {/* Admin (developer-only, guarded inside component) */}
      <Route path="/admin/turf-requests" element={<AdminTurfRequests />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
