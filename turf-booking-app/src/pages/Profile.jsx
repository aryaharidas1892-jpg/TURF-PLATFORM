// src/pages/Profile.jsx
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { useBookings } from "../hooks/useBookings";
import { formatCurrency } from "../utils/formatCurrency";
import { Link } from "react-router-dom";

export default function Profile() {
  const { currentUser } = useAuth();
  const { balance } = useWallet();
  const { bookings } = useBookings();
  const upcoming = bookings.filter((b) => b.booking_status === "upcoming").length;

  return (
    <div className="page-container">
      <h1>My Profile</h1>
      <div className="profile-card">
        <div className="profile-avatar">{currentUser?.displayName?.[0]?.toUpperCase() || "U"}</div>
        <div className="profile-info">
          <h2>{currentUser?.displayName || "Player"}</h2>
          <p>{currentUser?.email}</p>
        </div>
      </div>
      <div className="profile-stats">
        <div className="stat-card"><span className="stat-value">{upcoming}</span><span className="stat-label">Upcoming Bookings</span></div>
        <div className="stat-card"><span className="stat-value">{bookings.length}</span><span className="stat-label">Total Bookings</span></div>
        <div className="stat-card"><span className="stat-value">{formatCurrency(balance)}</span><span className="stat-label">Wallet Balance</span></div>
      </div>
      <div className="profile-actions">
        <Link to="/bookings" className="btn-outline">View All Bookings</Link>
        <Link to="/wallet" className="btn-primary">Manage Wallet</Link>
      </div>
    </div>
  );
}
