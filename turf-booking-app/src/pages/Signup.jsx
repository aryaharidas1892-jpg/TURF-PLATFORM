// src/pages/Signup.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";

export default function Signup() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setError("");
    setLoading(true);
    try {
      await signup(form.email, form.password, form.fullName);
      navigate("/turfs");
    } catch (err) {
      setError(err.message.includes("email-already-in-use")
        ? "Email already registered. Try logging in."
        : "Signup failed. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BackButton fallback="/" />
        <div className="auth-header">
          <h2>Create Account ⚽</h2>
          <p>Join thousands of turf players</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input name="fullName" placeholder="Rahul Kumar" value={form.fullName}
              onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" placeholder="you@email.com" value={form.email}
              onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" placeholder="Min. 6 characters" value={form.password}
              onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input name="confirm" type="password" placeholder="Repeat password" value={form.confirm}
              onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login">Login here</Link></p>
      </div>
    </div>
  );
}
