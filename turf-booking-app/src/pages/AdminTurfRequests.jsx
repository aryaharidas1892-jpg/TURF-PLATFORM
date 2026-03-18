// src/pages/AdminTurfRequests.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToAllRequests, approveRequest, rejectRequest } from "../services/turfRequestService";
import { subscribeToAllOwnerRequests, approveOwnerRequest, rejectOwnerRequest } from "../services/ownerService";
import { subscribeToAllReports, blockUser, dismissReport } from "../services/reportService";
import LoadingSpinner from "../components/LoadingSpinner";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const TURF_TABS = ["pending", "approved", "rejected"];

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ─── Owner Requests Section ─── */
function OwnerRequestsSection() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const unsub = subscribeToAllOwnerRequests(
      (data) => { setOwners(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleApprove(uid, name) {
    if (!window.confirm(`Approve owner "${name}"? They will receive full owner access.`)) return;
    setBusy(true);
    try { await approveOwnerRequest(uid); showToast("✅ Owner approved!"); }
    catch (e) { showToast("❌ " + e.message); }
    setBusy(false);
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try { await rejectOwnerRequest(rejectId, rejectReason); showToast("Owner rejected."); setRejectId(null); setRejectReason(""); }
    catch (e) { showToast("❌ " + e.message); }
    setBusy(false);
  }

  const filtered = owners.filter((o) => o.status === activeTab);

  if (loading) return <LoadingSpinner text="Loading owner requests…" />;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      {/* Reject modal */}
      {rejectId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>❌ Reject Owner Request</h3>
            <p style={{ marginBottom: 12, fontSize: "0.875rem", color: "var(--gray-600)" }}>
              Give a clear reason — the applicant will see this.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Business address could not be verified…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--gray-200)", fontFamily: "inherit", fontSize: "0.875rem", resize: "vertical", marginBottom: 12 }}
            />
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</button>
              <button className="btn-report-submit" onClick={handleReject} disabled={busy || !rejectReason.trim()}>
                {busy ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="admin-summary">
        {TURF_TABS.map((t) => (
          <div key={t} className={`admin-summary-card ${t}`} onClick={() => setActiveTab(t)}>
            <span className="admin-summary-count">{owners.filter((o) => o.status === t).length}</span>
            <span className="admin-summary-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {TURF_TABS.map((t) => (
          <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({owners.filter((o) => o.status === t).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No {activeTab} owner requests.</p></div>
      ) : (
        <div className="admin-req-list">
          {filtered.map((o) => (
            <div key={o.id} className="admin-req-card">
              <div className="admin-req-header">
                <div>
                  <h3 className="admin-req-title">{o.fullName}</h3>
                  <p className="admin-req-meta">📧 {o.email} · 📞 {o.phone}</p>
                  <p className="admin-req-meta">🏢 {o.businessName} · 📍 {o.city}</p>
                  <p className="admin-req-meta">Submitted: {fmtDate(o.submittedAt)}{o.reviewedAt ? ` · Reviewed: ${fmtDate(o.reviewedAt)}` : ""}</p>
                </div>
                {activeTab === "pending" && (
                  <div className="admin-req-actions">
                    <button className="admin-btn-approve" onClick={() => handleApprove(o.uid, o.fullName)} disabled={busy}>
                      ✅ Approve Owner
                    </button>
                    <button className="admin-btn-reject" onClick={() => { setRejectId(o.uid); setRejectReason(""); }} disabled={busy}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
              <div className="admin-req-grid">
                <div className="admin-req-field"><span>Address</span><strong>{o.address}</strong></div>
                <div className="admin-req-field"><span>Experience</span><strong>{o.yearsExperience}</strong></div>
                {o.gstin && <div className="admin-req-field"><span>GSTIN</span><strong>{o.gstin}</strong></div>}
              </div>
              <p className="admin-req-desc">{o.description}</p>
              {o.status === "rejected" && o.rejectionReason && (
                <div className="mtr-rejection-box" style={{ marginTop: 12 }}>
                  <strong>Reason:</strong><p>{o.rejectionReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Turf Requests Section ─── */
function TurfRequestsSection() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [actionId, setActionId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const unsub = subscribeToAllRequests(
      (data) => { setRequests(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleApprove(req) {
    if (!window.confirm(`Approve "${req.turfName}"? This will make it live on the website.`)) return;
    setBusy(true); setActionId(req.id);
    try { await approveRequest(req.id, req); showToast("✅ Turf approved and added!"); }
    catch (e) { showToast("❌ " + e.message); }
    setBusy(false); setActionId(null);
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try { await rejectRequest(rejectId, rejectReason); showToast("Turf request rejected."); setRejectId(null); setRejectReason(""); }
    catch (e) { showToast("❌ " + e.message); }
    setBusy(false);
  }

  const filtered = requests.filter((r) => r.status === activeTab);

  if (loading) return <LoadingSpinner text="Loading turf requests…" />;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}
      {rejectId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>❌ Reject Turf Request</h3>
            <textarea rows={4} placeholder="Reason for rejection…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--gray-200)", fontFamily: "inherit", fontSize: "0.875rem", resize: "vertical", marginBottom: 12 }} />
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</button>
              <button className="btn-report-submit" onClick={handleReject} disabled={busy || !rejectReason.trim()}>
                {busy ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-summary">
        {TURF_TABS.map((t) => (
          <div key={t} className={`admin-summary-card ${t}`} onClick={() => setActiveTab(t)}>
            <span className="admin-summary-count">{requests.filter((r) => r.status === t).length}</span>
            <span className="admin-summary-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {TURF_TABS.map((t) => (
          <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({requests.filter((r) => r.status === t).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No {activeTab} turf requests.</p></div>
      ) : (
        <div className="admin-req-list">
          {filtered.map((req) => (
            <div key={req.id} className="admin-req-card">
              <div className="admin-req-header">
                <div>
                  <h3 className="admin-req-title">{req.turfName}</h3>
                  <p className="admin-req-meta">{req.city} · by {req.submittedByName} ({req.submittedByEmail})</p>
                  <p className="admin-req-meta">Submitted: {fmtDate(req.submittedAt)}{req.reviewedAt ? ` · Reviewed: ${fmtDate(req.reviewedAt)}` : ""}</p>
                </div>
                {activeTab === "pending" && (
                  <div className="admin-req-actions">
                    <button className="admin-btn-approve" onClick={() => handleApprove(req)} disabled={busy && actionId === req.id}>
                      {busy && actionId === req.id ? "Approving…" : "✅ Approve"}
                    </button>
                    <button className="admin-btn-reject" onClick={() => { setRejectId(req.id); setRejectReason(""); }} disabled={busy}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
              <div className="admin-req-grid">
                <div className="admin-req-field"><span>Price</span><strong>₹{req.pricePerHour}/hr</strong></div>
                <div className="admin-req-field"><span>Hours</span><strong>{req.openingTime}–{req.closingTime}</strong></div>
                <div className="admin-req-field"><span>Address</span><strong>{req.address}</strong></div>
                <div className="admin-req-field"><span>Owner</span><strong>{req.ownerName} · {req.ownerPhone}</strong></div>
                {req.mapsLink && <div className="admin-req-field"><span>Maps</span><a href={req.mapsLink} target="_blank" rel="noreferrer"><strong>Open ↗</strong></a></div>}
              </div>
              <p className="admin-req-desc">{req.description}</p>
              <div className="mtr-chips">
                {(req.sports || []).map(s => <span key={s} className="mtr-chip sport">{s}</span>)}
                {(req.amenities || []).map(a => <span key={a} className="mtr-chip amenity">{a}</span>)}
              </div>
              {req.imageUrl && <img src={req.imageUrl} alt={req.turfName} className="admin-req-img" onError={(e) => e.target.style.display = "none"} />}
              {req.status === "rejected" && req.rejectionReason && (
                <div className="mtr-rejection-box" style={{ marginTop: 12 }}>
                  <strong>Reason:</strong><p>{req.rejectionReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── User Reports Section ─── */
function UserReportsSection() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const unsub = subscribeToAllReports(
      (data) => { setReports(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleBlock(reportId, uid, name) {
    if (!window.confirm(`Are you sure you want to BLOCK ${name}? They will lose access to their account immediately.`)) return;
    setBusy(true);
    try { await blockUser(reportId, uid); showToast(`🚫 User ${name} has been blocked.`); }
    catch (e) { showToast("❌ " + e.message); }
    setBusy(false);
  }

  async function handleDismiss(reportId) {
    setBusy(true);
    try { await dismissReport(reportId); showToast("Report dismissed."); }
    catch (e) { showToast("❌ " + e.message); }
    setBusy(false);
  }

  const TABS = ["pending", "reviewed", "dismissed"];
  const filtered = reports.filter((r) => r.status === activeTab);

  if (loading) return <LoadingSpinner text="Loading reports…" />;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="admin-summary">
        {TABS.map((t) => (
          <div key={t} className={`admin-summary-card ${t}`} onClick={() => setActiveTab(t)}>
            <span className="admin-summary-count">{reports.filter((r) => r.status === t).length}</span>
            <span className="admin-summary-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({reports.filter((r) => r.status === t).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No {activeTab} user reports.</p></div>
      ) : (
        <div className="admin-req-list">
          {filtered.map((r) => (
            <div key={r.id} className="admin-req-card" style={{ borderLeft: "4px solid var(--error)" }}>
              <div className="admin-req-header">
                <div>
                  <h3 className="admin-req-title">Reported: {r.reportedName}</h3>
                  <p className="admin-req-meta">Reason: <strong style={{ color: "var(--error)" }}>{r.reason}</strong></p>
                  <p className="admin-req-meta">Reported by: {r.reporterName} ({r.reporterEmail})</p>
                  <p className="admin-req-meta">Date: {fmtDate(r.createdAt)}</p>
                </div>
                {activeTab === "pending" && (
                  <div className="admin-req-actions">
                    <button className="admin-btn-reject" onClick={() => handleBlock(r.id, r.reportedUid, r.reportedName)} disabled={busy} style={{ background: "var(--error)", color: "#fff", borderColor: "var(--error)" }}>
                      🚫 Block User
                    </button>
                    <button className="admin-btn-approve" onClick={() => handleDismiss(r.id)} disabled={busy} style={{ background: "#f3f4f6", color: "#374151" }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              <div className="admin-req-desc" style={{ marginTop: 12, background: "#fef2f2", padding: 12, borderRadius: 6 }}>
                <strong>Details provided:</strong>
                <p style={{ marginTop: 4 }}>{r.details || "No additional details provided."}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Admin Page ─── */
export default function AdminTurfRequests() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.uid === ADMIN_UID;
  const [mainTab, setMainTab] = useState("owners"); // "owners" | "turfs" | "reports"

  const [requests, setRequests] = useState([]);
  const [owners, setOwners] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    let done = 0;
    const maybeDone = () => { if (++done >= 3) setLoading(false); };
    const u1 = subscribeToAllRequests((d) => { setRequests(d); maybeDone(); }, maybeDone);
    const u2 = subscribeToAllOwnerRequests((d) => { setOwners(d); maybeDone(); }, maybeDone);
    const u3 = subscribeToAllReports((d) => { setReports(d); maybeDone(); }, maybeDone);
    return () => { u1(); u2(); u3(); };
  }, [isAdmin]);

  if (!currentUser) {
    return (
      <div className="page-container">
        <div className="atr-success">
          <div className="atr-success-icon">🔒</div>
          <h2>Login Required</h2>
          <p>You must be logged in with the admin account.</p>
          <Link to="/login" className="btn-primary">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="atr-success">
          <div className="atr-success-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading admin panel…" />;

  const pendingOwners = owners.filter((o) => o.status === "pending").length;
  const pendingTurfs = requests.filter((r) => r.status === "pending").length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🛠️ Admin Panel</h1>
        <p>Review owner registrations and turf listing requests</p>
      </div>

      {/* Main section tabs */}
      <div className="admin-main-tabs">
        <button
          className={`admin-main-tab ${mainTab === "owners" ? "active" : ""}`}
          onClick={() => setMainTab("owners")}
        >
          👤 Owner Requests
          {pendingOwners > 0 && <span className="admin-badge">{pendingOwners}</span>}
        </button>
        <button
          className={`admin-main-tab ${mainTab === "turfs" ? "active" : ""}`}
          onClick={() => setMainTab("turfs")}
        >
          🏟️ Turf Requests
          {pendingTurfs > 0 && <span className="admin-badge">{pendingTurfs}</span>}
        </button>
        <button
          className={`admin-main-tab ${mainTab === "reports" ? "active" : ""}`}
          onClick={() => setMainTab("reports")}
        >
          🚩 User Reports
          {pendingReports > 0 && <span className="admin-badge" style={{ background: "var(--error)" }}>{pendingReports}</span>}
        </button>
      </div>

      {mainTab === "owners" && <OwnerRequestsSection />}
      {mainTab === "turfs" && <TurfRequestsSection />}
      {mainTab === "reports" && <UserReportsSection />}
    </div>
  );
}
