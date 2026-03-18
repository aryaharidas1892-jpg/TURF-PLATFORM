// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  // Owner has their own sidebar on the dashboard — hide top navbar there
  if (userRole === "owner" && location.pathname.startsWith("/owner/dashboard")) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">⚽ TurfBook</Link>
      <div className="navbar-links">
        {/* Admin view */}
        {userRole === "admin" && (
          <>
            <Link to="/turfs">Browse Turfs</Link>
            <Link to="/admin/turf-requests" className="navbar-admin-link">🛠️ Admin Panel</Link>
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          </>
        )}

        {/* Regular user view */}
        {(userRole === "user" || !currentUser) && (
          <>
            <Link to="/turfs">Browse Turfs</Link>
            <Link to="/players">Players</Link>
            {currentUser ? (
              <>
                <Link to="/bookings">My Bookings</Link>
                <Link to="/wallet">Wallet</Link>
                <Link to="/profile">Profile</Link>
                <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline-sm">Login</Link>
                <Link to="/signup" className="btn-primary-sm">Sign Up</Link>
              </>
            )}
          </>
        )}

        {/* Owner pending — minimal navbar */}
        {userRole === "owner_pending" && (
          <>
            <span style={{ fontSize: "0.85rem", color: "var(--gray-400)" }}>🕐 Pending Approval</span>
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          </>
        )}

        {/* Owner view (when not on dashboard) */}
        {userRole === "owner" && (
          <>
            <Link to="/owner/dashboard" className="btn-primary-sm">Dashboard</Link>
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
