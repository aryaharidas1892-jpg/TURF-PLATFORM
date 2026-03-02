// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { currentUser } = useAuth();
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Book Your Turf,<br />Play Your Game</h1>
          <p>Find and book the best turfs near you. Instant confirmation, easy cancellation.</p>
          <div className="hero-actions">
            <Link to="/turfs" className="btn-primary">Browse Turfs</Link>
            {!currentUser && <Link to="/signup" className="btn-outline">Get Started Free</Link>}
          </div>
        </div>
        <div className="hero-img">⚽</div>
      </section>

      <section className="features">
        <div className="feature-card">
          <span className="feature-icon">🗓️</span>
          <h3>Easy Booking</h3>
          <p>Pick a date, choose your slot, pay online — done in under a minute.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">💰</span>
          <h3>Wallet System</h3>
          <p>Top up your wallet and pay instantly. Cancellation refund back to wallet.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">👥</span>
          <h3>Find Players</h3>
          <p>Looking for teammates? Toggle your availability and find players near you.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">⭐</span>
          <h3>Verified Reviews</h3>
          <p>Only players who actually played can leave reviews. Trustworthy ratings.</p>
        </div>
      </section>
    </div>
  );
}
