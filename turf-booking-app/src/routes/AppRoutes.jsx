// src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
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

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/turfs" element={<TurfList />} />
      <Route path="/turfs/:id" element={<TurfDetail />} />
      <Route path="/players" element={<PlayersList />} />
      <Route path="/book/:id" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
