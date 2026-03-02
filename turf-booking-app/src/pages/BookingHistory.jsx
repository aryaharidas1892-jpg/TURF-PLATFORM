// src/pages/BookingHistory.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { cancelBooking } from "../services/bookingService";
import { useBookings } from "../hooks/useBookings";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate, formatTime } from "../utils/dateUtils";
import { formatCurrency } from "../utils/formatCurrency";
import { BOOKING_STATUS } from "../utils/constants";
import StarRating from "../components/StarRating";
import { submitReview } from "../services/ratingService";

export default function BookingHistory() {
  const { currentUser } = useAuth();
  const { bookings, loading, refetch } = useBookings();
  const [tab, setTab] = useState("upcoming");
  const [cancelling, setCancelling] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });

  const upcoming = bookings.filter((b) => b.booking_status === BOOKING_STATUS.UPCOMING);
  const past = bookings.filter((b) => b.booking_status !== BOOKING_STATUS.UPCOMING);
  const displayed = tab === "upcoming" ? upcoming : past;

  async function handleCancel(booking) {
    if (!window.confirm("Cancel this booking? A refund will be added to your wallet.")) return;
    setCancelling(booking.id);
    try {
      const { refundAmount } = await cancelBooking(booking.id, currentUser.uid);
      alert(`Booking cancelled. ₹${refundAmount} refunded to your wallet.`);
      refetch();
    } catch (err) {
      alert(err.message);
    }
    setCancelling(null);
  }

  async function handleReview(e) {
    e.preventDefault();
    try {
      await submitReview({
        turfId: reviewBooking.turf_id,
        userId: currentUser.uid,
        bookingId: reviewBooking.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });
      setReviewBooking(null);
      setReviewData({ rating: 0, comment: "" });
      alert("Review submitted! Thank you.");
    } catch {
      alert("Could not submit review. You may have already reviewed this booking.");
    }
  }

  if (loading) return <LoadingSpinner text="Loading your bookings..." />;

  return (
    <div className="page-container">
      <h1>My Bookings</h1>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`tab-btn ${tab === "past" ? "active" : ""}`} onClick={() => setTab("past")}>
          Past & Cancelled ({past.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state">
          <p>📅 No {tab} bookings found.</p>
        </div>
      ) : (
        <div className="booking-list">
          {displayed.map((b) => (
            <div key={b.id} className={`booking-card status-${b.booking_status}`}>
              <div className="booking-card-header">
                <div>
                  <h3>{b.turf_name || b.turfs?.name}</h3>
                  <p className="booking-location">📍 {b.turfs?.location}</p>
                </div>
                <span className={`status-badge ${b.booking_status}`}>{b.booking_status}</span>
              </div>
              <div className="booking-card-body">
                <div className="booking-detail"><span>📅 Date</span><strong>{formatDate(b.booking_date)}</strong></div>
                <div className="booking-detail"><span>⏰ Time</span><strong>{formatTime(b.start_time)} – {formatTime(b.end_time)}</strong></div>
                <div className="booking-detail"><span>💳 Amount</span><strong>{formatCurrency(b.total_amount)}</strong></div>
                <div className="booking-detail"><span>🧾 Payment</span><strong>{b.payment_id || "—"}</strong></div>
              </div>
              {b.booking_status === BOOKING_STATUS.UPCOMING && (
                <button
                  onClick={() => handleCancel(b)}
                  disabled={cancelling === b.id}
                  className="btn-danger-sm"
                >
                  {cancelling === b.id ? "Cancelling..." : "Cancel Booking"}
                </button>
              )}
              {b.booking_status === BOOKING_STATUS.COMPLETED && (
                <button onClick={() => setReviewBooking(b)} className="btn-outline-sm">Leave Review</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="modal-overlay" onClick={() => setReviewBooking(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Review — {reviewBooking.turf_name}</h3>
            <form onSubmit={handleReview}>
              <div className="form-group">
                <label>Your Rating</label>
                <StarRating rating={reviewData.rating} onRate={(r) => setReviewData({ ...reviewData, rating: r })} />
              </div>
              <div className="form-group">
                <label>Comment (optional)</label>
                <textarea rows={3} placeholder="How was your experience?"
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setReviewBooking(null)} className="btn-outline-sm">Cancel</button>
                <button type="submit" className="btn-primary" disabled={!reviewData.rating}>Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
