// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/ownerService";
import BackButton from "../components/BackButton";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function Login() {
  const [tab, setTab] = useState("user"); // "user" | "owner"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // ── Step 1: Firebase Auth ────────────────────────────────────
    let credential;
    try {
      credential = await login(email, password);
    } catch (authErr) {
      // Only Firebase Auth errors (wrong email/password) land here
      const code = authErr?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Login failed: " + authErr.message);
      }
      setLoading(false);
      return; // Stop — don't proceed if auth failed
    }

    const uid = credential.user.uid;

    // ── Step 2: Admin shortcut ───────────────────────────────────
    if (uid === ADMIN_UID) {
      navigate("/admin/turf-requests", { replace: true });
      setLoading(false);
      return;
    }

    // ── Step 3: Fetch role from Firestore ────────────────────────
    let role = "user"; // safe default
    try {
      const profile = await getUserProfile(uid);
      if (profile?.isBlocked) {
        setError("Your account has been suspended.");
        setLoading(false);
        return;
      }
      role = profile?.role || "user";
    } catch {
      // Firestore error (not auth) — default to user role and show /turfs
      // Don't block login just because Firestore had a problem
    }

    // ── Step 4: Role-based redirect ──────────────────────────────
    if (role === "owner") {
      navigate("/owner/dashboard", { replace: true });
    } else if (role === "owner_pending") {
      navigate("/owner/pending", { replace: true });
    } else {
      // "user" role — enforce: if they tried to login via Owner tab, show message
      if (tab === "owner" && role === "user") {
        setError("This account is registered as a regular user, not an owner. Please use the User login tab, or register as an owner.");
        // Log them out immediately since they used wrong tab
        const { auth } = await import("../firebase/firebase");
        import("firebase/auth").then(({ signOut }) => signOut(auth));
        setLoading(false);
        return;
      }
      navigate(from || "/turfs", { replace: true });
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <BackButton fallback="/" />
        <div className="auth-header">
          <h2>Welcome Back ⚽</h2>
          <p>Sign in to your TurfBook account</p>
        </div>

        {/* Role tabs */}
        <div className="auth-tab-bar">
          <button
            className={`auth-tab ${tab === "user" ? "active" : ""}`}
            onClick={() => { setTab("user"); setError(""); }}
            type="button"
          >
            👤 User Login
          </button>
          <button
            className={`auth-tab ${tab === "owner" ? "active" : ""}`}
            onClick={() => { setTab("owner"); setError(""); }}
            type="button"
          >
            🏟️ Owner Login
          </button>
        </div>

        {/* Tab-specific hint */}
        <div className="auth-tab-hint">
          {tab === "user"
            ? "For players who browse and book turfs."
            : "For turf owners managing their listings."}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : `Sign in as ${tab === "owner" ? "Owner" : "User"}`}
          </button>
        </form>

        {tab === "user" ? (
          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up free</Link>
          </p>
        ) : (
          <p className="auth-footer">
            New owner? <Link to="/owner-signup">Register your business →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
