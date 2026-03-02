// src/pages/TurfDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    Promise.all([getTurfById(id), getTurfReviews(id)])
      .then(([t, r]) => { setTurf(t); setReviews(r); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!turf) return <div className="page-container"><p>Turf not found.</p></div>;

  return (
    <div className="page-container">
      <BackButton fallback="/turfs" />
      <img
        src={turf.image_url || "https://placehold.co/800x300/16a34a/white?text=Turf"}
        alt={turf.name}
        className="turf-detail-img"
      />
      <div className="turf-detail-body">
        <div className="turf-detail-info">
          <h1>{turf.name}</h1>
          <p className="location-tag">📍 {turf.location}</p>
          <div className="rating-row">
            <StarRating rating={turf.avg_rating} readonly />
            <span>{turf.avg_rating?.toFixed(1)} ({turf.total_reviews} reviews)</span>
          </div>
          <p className="turf-desc">{turf.description}</p>
          {turf.amenities?.length > 0 && (
            <div className="amenities">
              <h4>Amenities</h4>
              <div className="amenity-tags">
                {turf.amenities.map((a) => <span key={a} className="tag">{a}</span>)}
              </div>
            </div>
          )}
        </div>
        <div className="turf-booking-panel">
          <div className="price-panel">
            <span className="big-price">{formatCurrency(turf.price_per_slot)}</span>
            <span className="per-slot">per slot</span>
          </div>
          <button
            onClick={() => currentUser ? navigate(`/book/${id}`) : navigate("/login")}
            className="btn-primary w-full"
          >
            {currentUser ? "Book Now" : "Login to Book"}
          </button>
        </div>
      </div>

      <section className="reviews-section">
        <h2>Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="muted">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="review-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <strong>{r.profiles?.full_name || "Player"}</strong>
                  <StarRating rating={r.rating} readonly size="sm" />
                  <span className="review-date">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
