// src/services/ratingService.js
import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  runTransaction
} from "firebase/firestore";

/** Submit a review for a turf */
export async function submitReview({ turfId, userId, bookingId, rating, comment, userName }) {
  const turfRef = doc(db, "turfs", turfId);
  const reviewsRef = collection(db, "reviews");

  await runTransaction(db, async (transaction) => {
    const turfDoc = await transaction.get(turfRef);
    if (!turfDoc.exists()) throw new Error("Turf does not exist!");

    const data = turfDoc.data();
    const currentTotal = data.total_reviews || 0;
    const currentRating = data.avg_rating || 0;

    // Calculate new average rating
    const newTotal = currentTotal + 1;
    const newAvg = ((currentRating * currentTotal) + rating) / newTotal;

    // Update Turf stats
    transaction.update(turfRef, {
      avg_rating: newAvg,
      total_reviews: newTotal
    });

    // Save the review exactly like the supabase payload used
    const newReviewRef = doc(reviewsRef);
    transaction.set(newReviewRef, {
      turf_id: turfId,
      user_id: userId,
      booking_id: bookingId || null,
      rating: rating,
      comment: comment || "",
      created_at: serverTimestamp(),
      profiles: { full_name: userName || "Player" }
    });
  });
}

/** Get all reviews for a turf */
export async function getTurfReviews(turfId) {
  const q = query(
    collection(db, "reviews"),
    where("turf_id", "==", turfId),
    orderBy("created_at", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
