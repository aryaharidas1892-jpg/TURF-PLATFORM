// src/pages/BookingHistory.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { cancelBooking } from "../services/bookingService";
import { useBookings } from "../hooks/useBookings";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate, formatTime } from "../utils/dateUtils";
import { formatCurrency } from "../utils/formatCurrency";
import StarRating from "../components/StarRating";
import { submitReview } from "../services/ratingService";

// ── helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    upcoming:  { label: "Upcoming",  cls: "badge-upcoming" },
    completed: { label: "Completed", cls: "badge-completed" },
    cancelled: { label: "Cancelled", cls: "badge-cancelled" },
  };
  const { label, cls } = map[status] || { label: status, cls: "" };
  return <span className={`bh-status-badge ${cls}`}>{label}</span>;
}

function EmptyState({ tab }) {
  return (
    <div className="bh-empty">
      <span className="bh-empty-icon">{tab === "upcoming" ? "📅" : "🏟️"}</span>
      <h3>No {tab === "upcoming" ? "upcoming" : "past"} bookings</h3>
      <p>
        {tab === "upcoming"
          ? "You haven't booked any turf yet. Browse turfs and book your first slot!"
          : "Completed and cancelled bookings will appear here."}
      </p>
      {tab === "upcoming" && (
        <a href="/turfs" className="btn-primary" style={{ display: "inline-block", marginTop: 12 }}>
          Browse Turfs →
        </a>
      )}
    </div>
  );
}

// ── Cancel Confirmation Modal ─────────────────────────────────────────────────
function CancelModal({ booking, onConfirm, onClose, loading }) {
  const refundCoins = Math.round(booking.amount * 0.8);
  const fee = Math.round(booking.amount * 0.2);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cancel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cancel-modal-header">
          <span className="cancel-modal-icon">🚫</span>
          <h3>Cancel Booking?</h3>
          <p className="cancel-modal-subtitle">Please review the cancellation policy below.</p>
        </div>

        <div className="cancel-booking-info">
          <div className="cancel-info-row">
            <span>📅 Date</span>
            <strong>{formatDate(booking.date)}</strong>
          </div>
          <div className="cancel-info-row">
            <span>🏟️ Turf</span>
            <strong>{booking.turfName}</strong>
          </div>
          <div className="cancel-info-row">
            <span>💳 Amount Paid</span>
            <strong>{formatCurrency(booking.amount)}</strong>
          </div>
        </div>

        <div className="cancel-refund-box">
          <div className="cancel-refund-row green">
            <span>🪙 Wallet Coins Refund (80%)</span>
            <strong>+{formatCurrency(refundCoins)}</strong>
          </div>
          <div className="cancel-refund-row red">
            <span>❌ Cancellation Fee (20%)</span>
            <strong>-{formatCurrency(fee)}</strong>
          </div>
        </div>

        <p className="cancel-policy-note">
          ⓘ Refunds are credited as <strong>Wallet Coins</strong> — they cannot be transferred back to your original payment method.
        </p>

        <div className="modal-actions">
          <button className="btn-outline-sm" onClick={onClose} disabled={loading}>
            Keep Booking
          </button>
          <button className="btn-danger-sm" onClick={onConfirm} disabled={loading}
            style={{ padding: "8px 20px" }}
          >
            {loading ? "Cancelling…" : `✓ Confirm & Get ${formatCurrency(refundCoins)} Coins`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Coin Credit Animation Toast ───────────────────────────────────────────────
function CoinToast({ amount, onDone }) {
  return (
    <div className="coin-toast" onAnimationEnd={onDone}>
      <span className="coin-toast-icon">🪙</span>
      <span className="coin-toast-text">+{formatCurrency(amount)} Coins Added!</span>
    </div>
  );
}

export default function BookingHistory() {
  const { currentUser } = useAuth();
  const { bookings, loading, error, refetch } = useBookings();
  const [tab, setTab] = useState("upcoming");
  const [cancelTarget, setCancelTarget] = useState(null); // booking to cancel
  const [cancelling, setCancelling] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [coinToast, setCoinToast] = useState(null); // { amount }

  // ── Field normalizer ───────────────────────────────────────────────────────
  function norm(b) {
    return {
      id:        b.id,
      turfName:  b.turfName || b.turf_name || "Unknown Turf",
      turfId:    b.turfId   || b.turf_id   || "",
      date:      b.date     || b.booking_date || "",
      startTime: b.startTime || b.start_time  || "",
      endTime:   b.endTime   || b.end_time    || "",
      amount:    b.amount    || b.total_amount || 0,
      paymentId: b.paymentId || b.payment_id  || "",
      groupId:   b.groupId   || null,
      status:    b.booking_status || b.status  || "upcoming",
    };
  }

  const upcoming = bookings.filter((b) => (b.booking_status || b.status) === "upcoming");
  const past     = bookings.filter((b) => (b.booking_status || b.status) !== "upcoming");
  const displayed = tab === "upcoming" ? upcoming : past;

  // ── Open the cancel modal ──────────────────────────────────────────────────
  function promptCancel(raw) {
    setCancelTarget(norm(raw));
  }

  // ── Confirmed cancellation ─────────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { refundAmount } = await cancelBooking(cancelTarget.id, currentUser.uid);
      setCancelTarget(null);
      if (refundAmount > 0) setCoinToast({ amount: refundAmount });
      refetch();
    } catch (err) {
      alert("Error: " + err.message);
    }
    setCancelling(false);
  }

  // ── Review ────────────────────────────────────────────────────────────────
  async function handleReview(e) {
    e.preventDefault();
    const b = norm(reviewBooking);
    setReviewSubmitting(true);
    try {
      await submitReview({
        turfId:    b.turfId,
        userId:    currentUser.uid,
        bookingId: b.id,
        rating:    reviewData.rating,
        comment:   reviewData.comment,
      });
      setReviewBooking(null);
      setReviewData({ rating: 0, comment: "" });
      alert("Review submitted! Thank you.");
    } catch {
      alert("Could not submit review. You may have already reviewed this booking.");
    }
    setReviewSubmitting(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner text="Loading your bookings…" />;

  return (
    <div className="bh-page">
      {/* Coin credit toast */}
      {coinToast && (
        <CoinToast amount={coinToast.amount} onDone={() => setCoinToast(null)} />
      )}

      {/* Header */}
      <div className="bh-header">
        <div>
          <h1>My Bookings 📋</h1>
          <p>Your complete booking history — past and upcoming</p>
        </div>
        <button className="btn-outline-sm" onClick={refetch}>🔄 Refresh</button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ Could not load bookings: {error}
          <button className="btn-outline-sm" style={{ marginLeft: 12 }} onClick={refetch}>Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bh-tabs">
        <button className={`bh-tab ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>
          🟢 Upcoming <span className="bh-tab-count">{upcoming.length}</span>
        </button>
        <button className={`bh-tab ${tab === "past" ? "active" : ""}`} onClick={() => setTab("past")}>
          🕐 Past & Cancelled <span className="bh-tab-count">{past.length}</span>
        </button>
      </div>

      {/* Booking list */}
      {displayed.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="bh-list">
          {displayed.map((raw) => {
            const b = norm(raw);
            return (
              <div key={b.id} className={`bh-card bh-card--${b.status}`}>
                <div className="bh-card-top">
                  <div className="bh-card-turf">
                    <span className="bh-card-turf-icon">🏟️</span>
                    <div>
                      <h3 className="bh-card-turf-name">{b.turfName}</h3>
                      {b.groupId && <span className="bh-group-badge">Multi-slot booking</span>}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                <div className="bh-card-details">
                  <div className="bh-detail-item">
                    <span className="bh-detail-label">📅 Date</span>
                    <span className="bh-detail-value">{b.date ? formatDate(b.date) : "—"}</span>
                  </div>
                  <div className="bh-detail-item">
                    <span className="bh-detail-label">⏰ Time</span>
                    <span className="bh-detail-value">
                      {b.startTime && b.endTime
                        ? `${formatTime(b.startTime)} – ${formatTime(b.endTime)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="bh-detail-item">
                    <span className="bh-detail-label">💳 Amount Paid</span>
                    <span className="bh-detail-value bh-amount">{formatCurrency(b.amount)}</span>
                  </div>
                  <div className="bh-detail-item">
                    <span className="bh-detail-label">🧾 Reference</span>
                    <span className="bh-detail-value bh-ref">
                      {b.paymentId ? b.paymentId.slice(0, 24) + "…" : "—"}
                    </span>
                  </div>
                </div>

                {/* Refund info on cancelled bookings */}
                {b.status === "cancelled" && raw.refundCoins > 0 && (
                  <div className="bh-refund-info">
                    🪙 {formatCurrency(raw.refundCoins)} coins were added to your wallet
                  </div>
                )}

                <div className="bh-card-actions">
                  {b.status === "upcoming" && (
                    <button onClick={() => promptCancel(raw)} className="btn-danger-sm">
                      ❌ Cancel & Refund
                    </button>
                  )}
                  {b.status === "completed" && (
                    <button onClick={() => setReviewBooking(raw)} className="btn-outline-sm">
                      ⭐ Leave Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cancel Modal ────────────────────────────────────────────────── */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => !cancelling && setCancelTarget(null)}
          loading={cancelling}
        />
      )}

      {/* ── Review Modal ─────────────────────────────────────────────────── */}
      {reviewBooking && (
        <div className="modal-overlay" onClick={() => setReviewBooking(null)}>
          <div className="modal bh-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bh-review-header">
              <h3>⭐ Rate Your Experience</h3>
              <p>{norm(reviewBooking).turfName}</p>
            </div>
            <form onSubmit={handleReview}>
              <div className="form-group">
                <label>Your Rating *</label>
                <StarRating
                  rating={reviewData.rating}
                  onRate={(r) => setReviewData({ ...reviewData, rating: r })}
                />
              </div>
              <div className="form-group">
                <label>Comment <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="How was the turf? Surface quality, lighting, amenities…"
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setReviewBooking(null)} className="btn-outline-sm">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!reviewData.rating || reviewSubmitting}>
                  {reviewSubmitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
