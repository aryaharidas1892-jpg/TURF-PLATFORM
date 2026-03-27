// src/components/Footer.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Footer() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Owners have their own sidebar on the dashboard — hide global footer there
  if (userRole === "owner" && location.pathname.startsWith("/owner/dashboard")) return null;

  const showOwnerCta = !currentUser;

  return (
    <footer className="footer" role="contentinfo">
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--gray-300)", marginBottom: 8 }}>
          ⚽ TurfBook
        </p>
        <p style={{ fontSize: "0.82rem", marginBottom: 12, color: "var(--gray-500)" }}>
          Book your turf, play your game — India's #1 turf booking platform
        </p>
        {showOwnerCta && (
          <button
            className="footer-cta-btn"
            onClick={() => navigate("/owner-signup")}
          >
            🏟️ Want to list your own turf?
          </button>
        )}
        <p style={{ marginTop: 20, fontSize: "0.78rem", color: "var(--gray-600)", marginBottom: 0 }}>
          © {new Date().getFullYear()} TurfBook · All rights reserved
        </p>
      </div>
    </footer>
  );
}
