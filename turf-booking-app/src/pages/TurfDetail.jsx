// src/pages/TurfDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTurfById } from "../services/turfService";
import { getTurfReviews } from "../services/ratingService";
import StarRating from "../components/StarRating";
import BackButton from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/dateUtils";
import { useAuth } from "../context/AuthContext";

export default function TurfDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [turf, setTurf] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    Promise.all([
      getTurfById(id).catch((err) => { setFetchError(err.message); return null; }),
      getTurfReviews(id).catch(() => []),
    ])
      .then(([t, r]) => { setTurf(t); setReviews(r); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (fetchError || !turf) {
    return (
      <div className="page-container">
        <BackButton fallback="/turfs" />
        <div className="error-state">
          <span className="error-state-icon">🏟️</span>
          <h2>Turf Not Available</h2>
          <p>{fetchError || "This turf could not be loaded. It may have been removed or is pending admin approval."}</p>
          <button className="btn-primary" onClick={() => navigate("/turfs")}>Browse All Turfs</button>
        </div>
      </div>
    );
  }

  const price = turf.price_per_slot ?? turf.pricePerHour;

  return (
    <div className="turfdetail-page">
      {/* Hero Banner */}
      <div className="turfdetail-hero">
        <img
          src={turf.image_url || turf.imageUrl || "https://placehold.co/1200x400/16a34a/white?text=⚽+TurfBook"}
          alt={turf.name}
          className="turfdetail-hero-img"
        />
        <div className="turfdetail-hero-overlay">
          <div className="turfdetail-hero-content">
            <BackButton fallback="/turfs" />
            <div className="turfdetail-badges">
              {(turf.sports || []).slice(0, 4).map((s) => (
                <span key={s} className="td-sport-badge">{s}</span>
              ))}
            </div>
            <h1 className="turfdetail-title">{turf.name || turf.turfName}</h1>
            <p className="turfdetail-location">📍 {turf.location || `${turf.address}, ${turf.city}`}</p>
          </div>
        </div>
      </div>

      <div className="turfdetail-body">
        {/* Left: details */}
        <div className="turfdetail-info">

          {/* Price + rating strip */}
          <div className="td-strip">
            <div className="td-price-block">
              <span className="td-price">{formatCurrency(price)}</span>
              <span className="td-per-slot">/ slot</span>
            </div>
            <div className="td-rating-block">
              <StarRating rating={turf.avg_rating ?? turf.rating ?? 0} readonly />
              <span className="td-rating-text">
                {(turf.avg_rating ?? turf.rating ?? 0).toFixed?.(1) ?? "—"} ({turf.total_reviews ?? turf.reviewCount ?? 0} reviews)
              </span>
            </div>
          </div>

          {/* Description */}
          {turf.description && <p className="td-desc">{turf.description}</p>}

          {/* Hours */}
          {turf.openingTime && (
            <div className="td-info-row">
              <span className="td-info-label">🕐 Hours</span>
              <span className="td-info-value">{turf.openingTime} – {turf.closingTime}</span>
            </div>
          )}

          {/* Sports */}
          {turf.sports?.length > 0 && (
            <div className="td-section">
              <h4 className="td-section-title">⚽ Sports</h4>
              <div className="td-tags">
                {turf.sports.map((s) => <span key={s} className="td-tag sport">{s}</span>)}
              </div>
            </div>
          )}

          {/* Amenities */}
          {turf.amenities?.length > 0 && (
            <div className="td-section">
              <h4 className="td-section-title">🏗️ Amenities</h4>
              <div className="td-tags">
                {turf.amenities.map((a) => <span key={a} className="td-tag">{a}</span>)}
              </div>
            </div>
          )}

          {/* Owner info */}
          {turf.ownerName && (
            <div className="td-owner-card">
              <div className="td-owner-avatar">{turf.ownerName[0]?.toUpperCase()}</div>
              <div>
                <div className="td-owner-name">{turf.ownerName}</div>
                {turf.ownerPhone && <div className="td-owner-phone">📞 {turf.ownerPhone}</div>}
                {turf.mapsLink && (
                  <a href={turf.mapsLink} target="_blank" rel="noopener noreferrer" className="td-maps-link">
                    📌 View on Maps
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking Panel */}
        <div className="turfdetail-booking-panel">
          <div className="td-book-card">
            <div className="td-book-price">
              <span>{formatCurrency(price)}</span>
              <small>per slot</small>
            </div>
            <ul className="td-book-checklist">
              <li>✅ Instant confirmation</li>
              <li>✅ Easy cancellation with refund</li>
              <li>✅ Pay from wallet</li>
            </ul>
            <button
              onClick={() => currentUser ? navigate(`/book/${id}`) : navigate("/login")}
              className="btn-primary w-full td-book-btn"
            >
              {currentUser ? "🏟️ Book Now" : "🔑 Login to Book"}
            </button>
            {!currentUser && (
              <p className="td-login-hint">Don't have an account? <a href="/signup">Sign up free →</a></p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="turfdetail-reviews">
        <h2 className="td-reviews-title">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <div className="empty-state"><p>⭐ No reviews yet. Be the first to review!</p></div>
        ) : (
          <div className="review-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <strong>{r.profiles?.full_name || r.userName || "Player"}</strong>
                  <StarRating rating={r.rating} readonly size="sm" />
                  <span className="review-date">{formatDate(r.created_at || r.createdAt)}</span>
                </div>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
