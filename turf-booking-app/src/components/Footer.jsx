// src/components/Footer.jsx
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="footer">
      <p>© 2025 TurfBook — Book your turf, play your game ⚽</p>
      <button
        className="footer-cta-btn"
        onClick={() => navigate("/add-turf")}
      >
        🏟️ Want to add your own turf?
      </button>
    </footer>
  );
}
