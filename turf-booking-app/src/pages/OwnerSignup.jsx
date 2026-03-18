// src/pages/OwnerSignup.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";

const EXP_OPTIONS = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "More than 10 years"];

const INITIAL = {
  fullName: "", email: "", password: "", confirm: "",
  phone: "",
  businessName: "", city: "", address: "",
  yearsExperience: "", description: "",
  gstin: "",
};

const REQUIRED_FIELDS = ["fullName","email","password","confirm","phone","businessName","city","address","yearsExperience","description"];

export default function OwnerSignup() {
  const [form, setForm] = useState(INITIAL);
  const [touched, setTouched] = useState({});       // tracks fields user has blurred
  const [attempted, setAttempted] = useState(false); // true after first submit attempt
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { ownerSignup } = useAuth();
  const navigate = useNavigate();

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  /** Returns true if a specific field should show red border */
  function isInvalid(field) {
    const show = attempted || touched[field];
    if (!show) return false;
    if (REQUIRED_FIELDS.includes(field) && !form[field]?.trim()) return true;
    if (field === "confirm" && form.confirm !== form.password) return true;
    if (field === "phone" && form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g,""))) return true;
    return false;
  }

  function inputClass(field) {
    return isInvalid(field) ? "field-error" : "";
  }

  function validate() {
    setAttempted(true);
    for (const k of REQUIRED_FIELDS) {
      if (!form[k]?.trim()) {
        const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
        setError(`Please fill in: ${label}`);
        return false;
      }
    }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return false; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return false; }
    if (!/^\d{10}$/.test(form.phone.replace(/\s/g,""))) { setError("Enter a valid 10-digit phone number."); return false; }
    setError(""); return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await ownerSignup(form.email, form.password, form);
      setSubmitted(true);
      setTimeout(() => navigate("/owner/pending"), 2000);
    } catch (err) {
      if (err.message.includes("email-already-in-use")) {
        setError("Email already registered. Try logging in.");
      } else if (err.message.includes("permission") || err.message.includes("insufficient")) {
        setError("⚠️ Firestore rules not configured. Please ask the developer to update Firebase security rules to allow owner registration.");
      } else {
        setError("Registration failed: " + err.message);
      }
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="atr-success">
            <div className="atr-success-icon">🎉</div>
            <h2>Registration Submitted!</h2>
            <p>Your owner account is pending admin approval. Redirecting…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page owner-signup-page">
      <div className="auth-card auth-card-wide">
        <BackButton fallback="/login" />
        <div className="auth-header">
          <h2>Register as Turf Owner 🏟️</h2>
          <p>Fill in your details — our team will review and activate your account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          {/* ── Personal Details ───────────────────────────── */}
          <div className="owner-form-section">
            <h3 className="owner-form-section-title">👤 Personal Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={form.fullName}
                  className={inputClass("fullName")}
                  onChange={(e) => set("fullName", e.target.value)}
                  onBlur={() => touch("fullName")}
                />
                {isInvalid("fullName") && <span className="field-hint">Full name is required</span>}
              </div>
              <div className="form-group">
                <label>Phone Number <span className="req-star">*</span></label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={form.phone}
                  className={inputClass("phone")}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={() => touch("phone")}
                />
                {isInvalid("phone") && <span className="field-hint">Enter a valid 10-digit number</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Email <span className="req-star">*</span></label>
              <input
                type="email"
                placeholder="owner@email.com"
                value={form.email}
                className={inputClass("email")}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => touch("email")}
              />
              {isInvalid("email") && <span className="field-hint">Email is required</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password <span className="req-star">*</span></label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  className={inputClass("password")}
                  onChange={(e) => set("password", e.target.value)}
                  onBlur={() => touch("password")}
                />
                {isInvalid("password") && <span className="field-hint">Password is required (min 6 chars)</span>}
              </div>
              <div className="form-group">
                <label>Confirm Password <span className="req-star">*</span></label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirm}
                  className={inputClass("confirm")}
                  onChange={(e) => set("confirm", e.target.value)}
                  onBlur={() => touch("confirm")}
                />
                {isInvalid("confirm") && <span className="field-hint">Passwords do not match</span>}
              </div>
            </div>
          </div>

          {/* ── Business Details ────────────────────────────── */}
          <div className="owner-form-section">
            <h3 className="owner-form-section-title">🏢 Business Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Business / Company Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Green Arena Sports Club"
                  value={form.businessName}
                  className={inputClass("businessName")}
                  onChange={(e) => set("businessName", e.target.value)}
                  onBlur={() => touch("businessName")}
                />
                {isInvalid("businessName") && <span className="field-hint">Business name is required</span>}
              </div>
              <div className="form-group">
                <label>City <span className="req-star">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={form.city}
                  className={inputClass("city")}
                  onChange={(e) => set("city", e.target.value)}
                  onBlur={() => touch("city")}
                />
                {isInvalid("city") && <span className="field-hint">City is required</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Full Business Address <span className="req-star">*</span></label>
              <input
                type="text"
                placeholder="Street, Landmark, Area"
                value={form.address}
                className={inputClass("address")}
                onChange={(e) => set("address", e.target.value)}
                onBlur={() => touch("address")}
              />
              {isInvalid("address") && <span className="field-hint">Address is required</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Years of Experience <span className="req-star">*</span></label>
                <select
                  value={form.yearsExperience}
                  className={inputClass("yearsExperience")}
                  onChange={(e) => set("yearsExperience", e.target.value)}
                  onBlur={() => touch("yearsExperience")}
                >
                  <option value="">Select experience</option>
                  {EXP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {isInvalid("yearsExperience") && <span className="field-hint">Please select your experience</span>}
              </div>
              <div className="form-group">
                <label>GSTIN <span className="optional-label">(optional)</span></label>
                <input
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={form.gstin}
                  onChange={(e) => set("gstin", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── About ───────────────────────────────────────── */}
          <div className="owner-form-section">
            <h3 className="owner-form-section-title">📝 About Your Business</h3>
            <div className="form-group">
              <label>Brief Description <span className="req-star">*</span></label>
              <textarea
                rows={4}
                placeholder="Tell us about your turf facility, the sports you support, any special features..."
                value={form.description}
                className={inputClass("description")}
                onChange={(e) => set("description", e.target.value)}
                onBlur={() => touch("description")}
              />
              {isInvalid("description") && <span className="field-hint">Description is required</span>}
            </div>
          </div>

          <div className="atr-disclaimer">
            <span>🔒</span>
            <p>By registering, you confirm that all details are genuine. Fraudulent registrations will result in a permanent ban.</p>
          </div>

          <button type="submit" className="btn-pay" disabled={loading}>
            {loading ? "Submitting Registration…" : "Submit Owner Registration →"}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 16 }}>
          Already registered? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
