// src/pages/AdminTurfRequests.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToAllRequests, approveRequest, rejectRequest } from "../services/turfRequestService";
import LoadingSpinner from "../components/LoadingSpinner";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const TAB_OPTIONS = ["pending", "approved", "rejected"];

function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminTurfRequests() {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.uid === ADMIN_UID;

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [activeTab, setActiveTab] = useState("pending");
    const [actionId, setActionId] = useState(null);
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState("");

    // Always call hooks unconditionally — only subscribe if admin
    useEffect(() => {
        if (!isAdmin) { setLoading(false); return; }
        const unsub = subscribeToAllRequests(
            (data) => { setRequests(data); setLoading(false); },
            (err) => { setLoadError("Failed to load: " + err.message); setLoading(false); }
        );
        return () => unsub();
    }, [isAdmin]);

    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    }

    async function handleApprove(req) {
        if (!window.confirm(`Approve "${req.turfName}"? This will make it live on the website.`)) return;
        setBusy(true); setActionId(req.id);
        try {
            await approveRequest(req.id, req);
            showToast("✅ Turf approved and added to the website!");
        } catch (err) {
            showToast("❌ Error: " + err.message);
        }
        setBusy(false); setActionId(null);
    }

    async function handleReject() {
        if (!rejectReason.trim()) return;
        setBusy(true);
        try {
            await rejectRequest(rejectId, rejectReason);
            showToast("Request rejected.");
            setRejectId(null); setRejectReason("");
        } catch (err) {
            showToast("❌ Error: " + err.message);
        }
        setBusy(false);
    }

    // ── Guard screens (after all hooks) ────────────────────────────
    if (!currentUser) {
        return (
            <div className="page-container">
                <div className="atr-success">
                    <div className="atr-success-icon">🔒</div>
                    <h2>Login Required</h2>
                    <p>You must be logged in with the admin account to access this page.</p>
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
                    <p>You do not have permission to view this page. Please log in with the admin account.</p>
                    <Link to="/" className="btn-primary">Go Home</Link>
                </div>
            </div>
        );
    }
    // ────────────────────────────────────────────────────────────────

    const filtered = requests.filter((r) => r.status === activeTab);

    if (loading) return <LoadingSpinner text="Loading requests…" />;

    if (loadError) {
        return (
            <div className="page-container">
                <div className="alert alert-error">⚠️ {loadError}</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {toast && <div className="admin-toast">{toast}</div>}

            <div className="page-header">
                <h1>🛠️ Admin — Turf Requests</h1>
                <p>Review, approve, or reject turf listing submissions</p>
            </div>

            {/* Summary counts */}
            <div className="admin-summary">
                {TAB_OPTIONS.map((t) => (
                    <div key={t} className={`admin-summary-card ${t}`} onClick={() => setActiveTab(t)}>
                        <span className="admin-summary-count">{requests.filter((r) => r.status === t).length}</span>
                        <span className="admin-summary-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div className="tab-bar" style={{ marginBottom: 24 }}>
                {TAB_OPTIONS.map((t) => (
                    <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)} ({requests.filter((r) => r.status === t).length})
                    </button>
                ))}
            </div>

            {/* Reject reason modal */}
            {rejectId && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>❌ Reject Request</h3>
                        <p style={{ marginBottom: 12, fontSize: "0.875rem", color: "var(--gray-600)" }}>
                            Provide a clear reason — the user will see this.
                        </p>
                        <div className="form-group">
                            <textarea
                                rows={4}
                                placeholder="e.g. The location provided does not appear to exist on Google Maps…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--gray-200)", fontFamily: "inherit", fontSize: "0.875rem", resize: "vertical" }}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</button>
                            <button
                                className="btn-report-submit"
                                onClick={handleReject}
                                disabled={busy || !rejectReason.trim()}
                            >
                                {busy ? "Rejecting…" : "Confirm Rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="empty-state"><p>No {activeTab} requests.</p></div>
            ) : (
                <div className="admin-req-list">
                    {filtered.map((req) => (
                        <div key={req.id} className="admin-req-card">
                            <div className="admin-req-header">
                                <div>
                                    <h3 className="admin-req-title">{req.turfName}</h3>
                                    <p className="admin-req-meta">{req.city} · Submitted by {req.submittedByName} ({req.submittedByEmail})</p>
                                    <p className="admin-req-meta">Submitted: {fmtDate(req.submittedAt)}{req.reviewedAt ? ` · Reviewed: ${fmtDate(req.reviewedAt)}` : ""}</p>
                                </div>
                                {activeTab === "pending" && (
                                    <div className="admin-req-actions">
                                        <button
                                            className="admin-btn-approve"
                                            onClick={() => handleApprove(req)}
                                            disabled={busy && actionId === req.id}
                                        >
                                            {busy && actionId === req.id ? "Approving…" : "✅ Approve"}
                                        </button>
                                        <button
                                            className="admin-btn-reject"
                                            onClick={() => { setRejectId(req.id); setRejectReason(""); }}
                                            disabled={busy}
                                        >
                                            ❌ Reject
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="admin-req-grid">
                                <div className="admin-req-field"><span>Price</span><strong>₹{req.pricePerHour}/hr</strong></div>
                                <div className="admin-req-field"><span>Hours</span><strong>{req.openingTime} – {req.closingTime}</strong></div>
                                <div className="admin-req-field"><span>Address</span><strong>{req.address}</strong></div>
                                <div className="admin-req-field"><span>Owner</span><strong>{req.ownerName} · {req.ownerPhone}</strong></div>
                                <div className="admin-req-field"><span>Email</span><strong>{req.ownerEmail}</strong></div>
                                {req.mapsLink && (
                                    <div className="admin-req-field">
                                        <span>Maps</span>
                                        <a href={req.mapsLink} target="_blank" rel="noreferrer"><strong>Open link ↗</strong></a>
                                    </div>
                                )}
                            </div>

                            <p className="admin-req-desc">{req.description}</p>

                            <div className="mtr-chips">
                                {(req.sports || []).map((s) => <span key={s} className="mtr-chip sport">{s}</span>)}
                                {(req.amenities || []).map((a) => <span key={a} className="mtr-chip amenity">{a}</span>)}
                            </div>

                            {req.imageUrl && (
                                <img src={req.imageUrl} alt={req.turfName} className="admin-req-img" onError={(e) => e.target.style.display = "none"} />
                            )}

                            {req.status === "rejected" && req.rejectionReason && (
                                <div className="mtr-rejection-box" style={{ marginTop: 12 }}>
                                    <strong>Reason given:</strong>
                                    <p>{req.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
