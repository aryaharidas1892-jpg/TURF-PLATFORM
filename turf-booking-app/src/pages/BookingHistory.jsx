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

export default function BookingHistory() {
  const { currentUser } = useAuth();
  const { bookings, loading, error, refetch } = useBookings();
  const [tab, setTab] = useState("upcoming");
  const [cancelling, setCancelling] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ── Field normalizer — maps Firebase field names to display values ─────────
  // Firebase stores: turfName, date, startTime, endTime, amount, status, paymentId
  function norm(b) {
    return {
      id:         b.id,
      turfName:   b.turfName || b.turf_name || "Unknown Turf",
      turfId:     b.turfId   || b.turf_id   || "",
      date:       b.date     || b.booking_date || "",
      startTime:  b.startTime || b.start_time  || "",
      endTime:    b.endTime   || b.end_time    || "",
      amount:     b.amount    || b.total_amount || 0,
      paymentId:  b.paymentId || b.payment_id  || "",
      groupId:    b.groupId   || null,
      status:     b.booking_status || b.status  || "upcoming",
    };
  }

  const upcoming = bookings.filter((b) => (b.booking_status || b.status) === "upcoming" || b.booking_status === "upcoming");
  const past     = bookings.filter((b) => (b.booking_status || b.status) !== "upcoming");
  const displayed = tab === "upcoming" ? upcoming : past;

  async function handleCancel(raw) {
    const b = norm(raw);
    if (!window.confirm(`Cancel booking at ${b.turfName}? A full refund will be added to your wallet.`)) return;
    setCancelling(b.id);
    try {
      const { refundAmount } = await cancelBooking(b.id, currentUser.uid);
      alert(`Booking cancelled. ${formatCurrency(refundAmount)} refunded to your wallet.`);
      refetch();
    } catch (err) {
      alert("Error: " + err.message);
    }
    setCancelling(null);
  }

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
        <button
          className={`bh-tab ${tab === "upcoming" ? "active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          🟢 Upcoming <span className="bh-tab-count">{upcoming.length}</span>
        </button>
        <button
          className={`bh-tab ${tab === "past" ? "active" : ""}`}
          onClick={() => setTab("past")}
        >
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
                {/* Card header */}
                <div className="bh-card-top">
                  <div className="bh-card-turf">
                    <span className="bh-card-turf-icon">🏟️</span>
                    <div>
                      <h3 className="bh-card-turf-name">{b.turfName}</h3>
                      {b.groupId && (
                        <span className="bh-group-badge">Multi-slot booking</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {/* Details grid */}
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

                {/* Actions */}
                <div className="bh-card-actions">
                  {b.status === "upcoming" && (
                    <button
                      onClick={() => handleCancel(raw)}
                      disabled={cancelling === b.id}
                      className="btn-danger-sm"
                    >
                      {cancelling === b.id ? "Cancelling…" : "❌ Cancel & Refund"}
                    </button>
                  )}
                  {b.status === "completed" && (
                    <button
                      onClick={() => setReviewBooking(raw)}
                      className="btn-outline-sm"
                    >
                      ⭐ Leave Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
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
