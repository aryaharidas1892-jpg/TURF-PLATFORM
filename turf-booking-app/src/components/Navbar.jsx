// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = currentUser?.uid === ADMIN_UID;

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">⚽ TurfBook</Link>
      <div className="navbar-links">
        <Link to="/turfs">Browse Turfs</Link>
        <Link to="/players">Players</Link>
        {currentUser ? (
          <>
            <Link to="/bookings">My Bookings</Link>
            <Link to="/wallet">Wallet</Link>
            <Link to="/my-turf-requests">My Requests</Link>
            {/* Admin link — only visible to the admin account */}
            {isAdmin && (
              <Link to="/admin/turf-requests" className="navbar-admin-link">
                🛠️ Admin
              </Link>
            )}
            <Link to="/profile">Profile</Link>
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline-sm">Login</Link>
            <Link to="/signup" className="btn-primary-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
