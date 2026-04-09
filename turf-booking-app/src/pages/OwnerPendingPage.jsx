// src/pages/OwnerPendingPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToOwnerRequest } from "../services/ownerService";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function OwnerPendingPage() {
  const { currentUser, logout } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToOwnerRequest(
      currentUser.uid,
      (data) => {
        setRequest(data);
        setLoading(false);
        // Auto-redirect when approved
        if (data?.status === "approved") {
          // Small delay so user sees the approved message briefly
          setTimeout(() => navigate("/owner/dashboard"), 1500);
        }
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [currentUser, navigate]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="pending-page">
        <div className="pending-card">
          <div className="pending-spinner" />
          <p>Loading your application status…</p>
        </div>
      </div>
    );
  }

  const status = request?.status || "pending";

  return (
    <div className="pending-page">
      <div className="pending-card">
        {/* Status icon */}
        <div className={`pending-icon-wrap ${status}`}>
          {status === "pending"  && <span>🕐</span>}
          {status === "approved" && <span>✅</span>}
          {status === "rejected" && <span>❌</span>}
        </div>

        {status === "pending" && (
          <>
            <h2>Application Under Review</h2>
            <p className="pending-desc">
              Your owner registration has been submitted and is currently being reviewed by our team.
              This usually takes <strong>1–2 business days</strong>. You'll be automatically redirected once approved.
            </p>
          </>
        )}

        {status === "approved" && (
          <>
            <h2>Application Approved! 🎉</h2>
            <p className="pending-desc">
              Congratulations! Your owner account has been approved. Redirecting you to your dashboard…
            </p>
          </>
        )}

        {status === "rejected" && (
          <>
            <h2>Application Not Approved</h2>
            <p className="pending-desc">
              Unfortunately, your owner registration was not approved.
            </p>
            {request?.rejectionReason && (
              <div className="mtr-rejection-box" style={{ marginTop: 16, textAlign: "left" }}>
                <strong>❌ Reason:</strong>
                <p>{request.rejectionReason}</p>
              </div>
            )}
          </>
        )}

        {/* Submitted details */}
        {request && (
          <div className="pending-details">
            <div className="pending-detail-row">
              <span>Name</span><strong>{request.fullName}</strong>
            </div>
            <div className="pending-detail-row">
              <span>Business</span><strong>{request.businessName}</strong>
            </div>
            <div className="pending-detail-row">
              <span>City</span><strong>{request.city}</strong>
            </div>
            <div className="pending-detail-row">
              <span>Submitted</span><strong>{fmtDate(request.submittedAt)}</strong>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="pending-pulse-bar">
            <div className="pending-pulse-fill" />
          </div>
        )}

        <button className="btn-outline" onClick={handleLogout} style={{ marginTop: 24 }}>
          Logout
        </button>
      </div>
    </div>
  );
}
