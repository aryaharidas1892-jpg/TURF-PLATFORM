// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef } from "react";

const FEATURES = [
  { icon: "🗓️", title: "Easy Booking", desc: "Pick a date, choose your slot, pay from wallet — done in under a minute." },
  { icon: "💰", title: "Wallet System", desc: "Top up instantly. Cancellations are refunded directly to your wallet." },
  { icon: "👥", title: "Find Players", desc: "Toggle your availability and connect with players near you right now." },
  { icon: "⭐", title: "Verified Reviews", desc: "Only players who actually played can leave reviews — 100% trustworthy." },
];

const STATS = [
  { value: "500+", label: "Turfs Listed" },
  { value: "10K+", label: "Happy Players" },
  { value: "50+", label: "Cities" },
  { value: "99%", label: "Satisfaction" },
];

export default function Home() {
  const { currentUser } = useAuth();
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".animate-on-scroll").forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="home-v2">
      {/* ── Hero ── */}
      <section className="hero-v2">
        <div className="hero-v2-bg" />
        <div className="hero-v2-content">
          <div className="hero-v2-badge">⚽ India's #1 Turf Booking Platform</div>
          <h1 className="hero-v2-title">
            Book Your Turf,<br />
            <span className="hero-v2-title-accent">Play Your Game</span>
          </h1>
          <p className="hero-v2-subtitle">
            Find and book the best turfs near you. Instant confirmation, easy cancellation, and a wallet system built for players.
          </p>
          <div className="hero-v2-actions">
            <Link to="/turfs" className="hero-btn-primary">
              🏟️ Browse Turfs
            </Link>
            {!currentUser && (
              <Link to="/signup" className="hero-btn-secondary">
                Get Started Free →
              </Link>
            )}
          </div>
        </div>
        <div className="hero-v2-visual">
          <div className="hero-ball">⚽</div>
          <div className="hero-orbit hero-orbit-1" />
          <div className="hero-orbit hero-orbit-2" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-strip">
        <div className="stats-strip-inner">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-item-value">{s.value}</span>
              <span className="stat-item-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-v2">
        <div className="features-v2-header animate-on-scroll">
          <h2>Everything You Need</h2>
          <p>Designed for the modern player</p>
        </div>
        <div className="features-v2-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`feature-card-v2 animate-on-scroll`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon-v2">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      {!currentUser && (
        <section className="home-cta animate-on-scroll">
          <div className="home-cta-inner">
            <h2>Ready to Play?</h2>
            <p>Join thousands of players who book smarter with TurfBook.</p>
            <div className="home-cta-actions">
              <Link to="/signup" className="hero-btn-primary">Create Free Account</Link>
              <Link to="/turfs" className="hero-btn-secondary">Browse Turfs First</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
