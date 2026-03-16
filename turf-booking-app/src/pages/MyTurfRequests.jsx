// src/pages/MyTurfRequests.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToUserRequests } from "../services/turfRequestService";
import LoadingSpinner from "../components/LoadingSpinner";

const STATUS_CONFIG = {
    pending: { label: "Pending Review", color: "pending", icon: "🕐" },
    approved: { label: "Approved", color: "approved", icon: "✅" },
    rejected: { label: "Rejected", color: "rejected", icon: "❌" },
};

function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyTurfRequests() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsub = subscribeToUserRequests(
            currentUser.uid,
            (data) => {
                setRequests(data);
                setLoading(false);
                setError("");
            },
            (err) => {
                // Permissions error → likely a Firestore rules issue
                const msg = err?.code === "permission-denied"
                    ? "Permission denied. Please make sure you are logged in and the Firestore rules allow reading turf_requests."
                    : "Failed to load requests: " + err.message;
                setError(msg);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [currentUser.uid]);


    if (loading) return <LoadingSpinner text="Loading your requests…" />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>My Turf Requests 🏟️</h1>
                <p>Track the status of your turf listing submissions</p>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                    ⚠️ {error}
                </div>
            )}


            <div className="mtr-top-actions">
                <Link to="/add-turf" className="btn-primary">+ Submit New Turf</Link>
            </div>

            {requests.length === 0 ? (
                <div className="empty-state">
                    <p>🏟️ You haven't submitted any turf requests yet.</p>
                    <Link to="/add-turf" className="btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
                        List Your Turf
                    </Link>
                </div>
            ) : (
                <div className="mtr-list">
                    {requests.map((req) => {
                        const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                        return (
                            <div key={req.id} className="mtr-card">
                                {/* Card header */}
                                <div className="mtr-card-header">
                                    <div>
                                        <h3 className="mtr-turf-name">{req.turfName}</h3>
                                        <span className="mtr-city">{req.city}</span>
                                    </div>
                                    <span className={`mtr-status-badge ${cfg.color}`}>
                                        {cfg.icon} {cfg.label}
                                    </span>
                                </div>

                                {/* Core info */}
                                <div className="mtr-info-grid">
                                    <div className="mtr-info-item">
                                        <span>Price</span>
                                        <strong>₹{req.pricePerHour}/hr</strong>
                                    </div>
                                    <div className="mtr-info-item">
                                        <span>Hours</span>
                                        <strong>{req.openingTime} – {req.closingTime}</strong>
                                    </div>
                                    <div className="mtr-info-item">
                                        <span>Submitted</span>
                                        <strong>{fmtDate(req.submittedAt)}</strong>
                                    </div>
                                    {req.reviewedAt && (
                                        <div className="mtr-info-item">
                                            <span>Reviewed</span>
                                            <strong>{fmtDate(req.reviewedAt)}</strong>
                                        </div>
                                    )}
                                </div>

                                {/* Sports & amenities chips */}
                                <div className="mtr-chips">
                                    {(req.sports || []).map((s) => <span key={s} className="mtr-chip sport">{s}</span>)}
                                    {(req.amenities || []).map((a) => <span key={a} className="mtr-chip amenity">{a}</span>)}
                                </div>

                                {/* Rejection reason */}
                                {req.status === "rejected" && req.rejectionReason && (
                                    <div className="mtr-rejection-box">
                                        <strong>❌ Reason for rejection:</strong>
                                        <p>{req.rejectionReason}</p>
                                    </div>
                                )}

                                {/* Approved — link to turf */}
                                {req.status === "approved" && (
                                    <div className="mtr-approved-note">
                                        🎉 Your turf is now live on TurfBook!{" "}
                                        <Link to={`/turfs/${req.id}`}>View listing →</Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
