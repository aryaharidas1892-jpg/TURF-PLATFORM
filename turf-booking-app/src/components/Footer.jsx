// src/components/Footer.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Footer() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Owners have their own sidebar on the dashboard — hide global footer there
  if (userRole === "owner" && location.pathname.startsWith("/owner/dashboard")) return null;

  // Show turf owner CTA only to guests (not logged-in users)
  const showOwnerCta = !currentUser;

  return (
    <footer className="footer">
      <p>© 2025 TurfBook — Book your turf, play your game ⚽</p>
      {showOwnerCta && (
        <button
          className="footer-cta-btn"
          onClick={() => navigate("/owner-signup")}
        >
          🏟️ Want to list your own turf?
        </button>
      )}
    </footer>
  );
}
