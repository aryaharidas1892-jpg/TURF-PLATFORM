// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

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
