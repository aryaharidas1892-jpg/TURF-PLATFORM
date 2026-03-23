// src/components/TurfCard.jsx
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/formatCurrency";
import StarRating from "./StarRating";

export default function TurfCard({ turf }) {
  const price = turf.price_per_slot ?? turf.pricePerHour;
  const sports = turf.sports || [];

  return (
    <div className="turf-card-v2">
      <div className="turf-card-img-wrap">
        <img
          src={turf.image_url || turf.imageUrl || "https://placehold.co/400x220/16a34a/white?text=⚽+TurfBook"}
          alt={turf.name || turf.turfName}
          className="turf-card-img-v2"
        />
        <div className="turf-card-price-badge">
          {formatCurrency(price)}<span>/slot</span>
        </div>
        {sports.length > 0 && (
          <div className="turf-card-sport-chips">
            {sports.slice(0, 2).map((s) => (
              <span key={s} className="turf-card-sport-chip">{s}</span>
            ))}
            {sports.length > 2 && <span className="turf-card-sport-chip">+{sports.length - 2}</span>}
          </div>
        )}
      </div>

      <div className="turf-card-body-v2">
        <h3 className="turf-card-title-v2">{turf.name || turf.turfName}</h3>
        <p className="turf-card-location-v2">📍 {turf.location || `${turf.city}`}</p>

        {turf.openingTime && (
          <p className="turf-card-hours">🕐 {turf.openingTime} – {turf.closingTime}</p>
        )}

        <div className="turf-card-meta-v2">
          <div className="turf-card-rating">
            <StarRating rating={turf.avg_rating ?? turf.rating ?? 0} readonly size="sm" />
            <span>({turf.total_reviews ?? turf.reviewCount ?? 0})</span>
          </div>
          <Link to={`/turfs/${turf.id}`} className="turf-card-book-btn">
            View & Book →
          </Link>
        </div>
      </div>
    </div>
  );
}
