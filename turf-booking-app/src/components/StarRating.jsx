// src/components/StarRating.jsx
import { useState } from "react";

export default function StarRating({ rating = 0, onRate, readonly = false, size = "md" }) {
  const [hover, setHover] = useState(0);

  return (
    <div className={`star-rating star-${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= (hover || rating) ? "filled" : ""} ${readonly ? "readonly" : "clickable"}`}
          onClick={() => !readonly && onRate && onRate(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
