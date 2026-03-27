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
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" aria-label="TurfBook home">
          ⚽ TurfBook
        </Link>

        {/* Links */}
        <div className="navbar-links">
          {/* Admin */}
          {userRole === "admin" && (
            <>
              <Link to="/turfs" className={`nav-link${location.pathname === "/turfs" ? " active" : ""}`}>Browse Turfs</Link>
              <Link to="/admin/turf-requests" className="nav-link" style={{ color: "var(--accent)" }}>🛠️ Admin Panel</Link>
            </>
          )}

          {/* Regular user or guest */}
          {(userRole === "user" || !currentUser) && (
            <>
              <Link to="/turfs"   className={`nav-link${location.pathname === "/turfs" ? " active" : ""}`}>Browse Turfs</Link>
              <Link to="/players" className={`nav-link${location.pathname === "/players" ? " active" : ""}`}>Players</Link>
              <Link to="/map"     className={`nav-link${location.pathname === "/map" ? " active" : ""}`}>🗺️ Map</Link>
              {currentUser && (
                <>
                  <Link to="/bookings" className={`nav-link${location.pathname === "/bookings" ? " active" : ""}`}>My Bookings</Link>
                  <Link to="/wallet"   className={`nav-link${location.pathname === "/wallet" ? " active" : ""}`}>🪙 Wallet</Link>
                  <Link to="/profile"  className={`nav-link${location.pathname === "/profile" ? " active" : ""}`}>Profile</Link>
                </>
              )}
            </>
          )}

          {/* Owner pending */}
          {userRole === "owner_pending" && (
            <span className="nav-link" style={{ color: "var(--accent)", cursor: "default" }}>
              🕐 Pending Approval
            </span>
          )}

          {/* Owner — outside dashboard */}
          {userRole === "owner" && (
            <>
              <Link to="/turfs" className="nav-link">Browse Turfs</Link>
              <Link to="/owner/dashboard" className="btn-primary-sm">Dashboard →</Link>
            </>
          )}
        </div>

        {/* Actions (right side) */}
        <div className="navbar-actions">
          {!currentUser ? (
            <>
              <Link to="/login"  className="btn-outline-sm">Login</Link>
              <Link to="/signup" className="btn-primary-sm">Sign Up</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          )}
          {userRole === "admin" && currentUser && (
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
}
