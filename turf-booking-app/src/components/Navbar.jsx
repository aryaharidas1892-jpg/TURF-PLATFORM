// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  // Owner has their own sidebar on the dashboard
  if (userRole === "owner" && location.pathname.startsWith("/owner/dashboard")) return null;

  return (
    <nav className="navbar-v2">
      <div className="navbar-v2-inner">
        <Link to="/" className="navbar-v2-brand">
          <span className="navbar-v2-logo">⚽</span>
          <span>TurfBook</span>
        </Link>

        <div className="navbar-v2-links">
          {/* Admin */}
          {userRole === "admin" && (
            <>
              <Link to="/turfs" className="nav-link">Browse Turfs</Link>
              <Link to="/admin/turf-requests" className="nav-link nav-link-admin">🛠️ Admin Panel</Link>
              <button onClick={handleLogout} className="nav-btn-outline">Logout</button>
            </>
          )}

          {/* Regular user or guest */}
          {(userRole === "user" || !currentUser) && (
            <>
              <Link to="/turfs" className="nav-link">Browse Turfs</Link>
              <Link to="/players" className="nav-link">Players</Link>
              {currentUser ? (
                <>
                  <Link to="/bookings" className="nav-link">My Bookings</Link>
                  <Link to="/wallet" className="nav-link">Wallet</Link>
                  <Link to="/profile" className="nav-link">Profile</Link>
                  <button onClick={handleLogout} className="nav-btn-outline">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-btn-outline">Login</Link>
                  <Link to="/signup" className="nav-btn-primary">Sign Up</Link>
                </>
              )}
            </>
          )}

          {/* Owner pending */}
          {userRole === "owner_pending" && (
            <>
              <span className="nav-pending-badge">🕐 Pending Approval</span>
              <button onClick={handleLogout} className="nav-btn-outline">Logout</button>
            </>
          )}

          {/* Owner — outside dashboard */}
          {userRole === "owner" && (
            <>
              <Link to="/turfs" className="nav-link">Browse Turfs</Link>
              <Link to="/owner/dashboard" className="nav-btn-primary">Dashboard</Link>
              <button onClick={handleLogout} className="nav-btn-outline">Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
