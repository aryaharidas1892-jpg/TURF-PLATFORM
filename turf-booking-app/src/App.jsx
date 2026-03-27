// src/App.jsx
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AppRoutes from "./routes/AppRoutes";
import "./styles/global.css";
import "./styles/premium.css";
import "./styles/map.css";

function App() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content">
        <AppRoutes />
      </main>
      <Footer />

      {/* Floating theme toggle — positioned by App, styled by premium.css */}
      <button
        className="floating-theme-btn"
        onClick={() => setDark((d) => !d)}
        title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle dark mode"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          width: 46, height: 46, borderRadius: "50%",
          background: dark ? "#1E293B" : "#fff",
          border: "1.5px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          fontSize: "1.2rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "var(--transition)",
        }}
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

export default App;
