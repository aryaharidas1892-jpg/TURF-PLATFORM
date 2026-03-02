// src/components/TurfCard.jsx
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/formatCurrency";
import StarRating from "./StarRating";

export default function TurfCard({ turf }) {
  return (
    <div className="turf-card">
      <img
        src={turf.image_url || "https://placehold.co/400x200/16a34a/white?text=Turf"}
        alt={turf.name}
        className="turf-card-img"
      />
      <div className="turf-card-body">
        <h3 className="turf-card-title">{turf.name}</h3>
        <p className="turf-card-location">📍 {turf.location}</p>
        <div className="turf-card-meta">
          <StarRating rating={turf.avg_rating} readonly size="sm" />
          <span className="review-count">({turf.total_reviews} reviews)</span>
        </div>
        <div className="turf-card-footer">
          <span className="turf-price">{formatCurrency(turf.price_per_slot)}<span>/slot</span></span>
          <Link to={`/turfs/${turf.id}`} className="btn-primary-sm">View & Book</Link>
        </div>
      </div>
    </div>
  );
}
