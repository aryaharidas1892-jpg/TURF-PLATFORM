// src/services/turfService.js
import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { creditWallet } from "./walletService";

/** Fetch all approved turfs from Firestore */
export async function getAllTurfs() {
  const q = query(collection(db, "turfs"), orderBy("addedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetch a single turf by its Firestore document ID */
export async function getTurfById(id) {
  const snapshot = await getDoc(doc(db, "turfs", id));
  if (!snapshot.exists()) throw new Error("Turf not found");
  return { id: snapshot.id, ...snapshot.data() };
}

/** Update turf fields (owner edit) */
export async function updateTurf(turfId, updates) {
  await updateDoc(doc(db, "turfs", turfId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a turf and ALL associated data (owner or admin).
 * Steps:
 * 1. Cancel all future confirmed bookings → 80% coin refund to each user
 * 2. Delete all bookings for this turf
 * 3. Delete all blockedSlots for this turf
 * 4. Delete all reviews for this turf
 * 5. Delete the original turf_requests document (same ID)
 * 6. Delete the turfs document itself
 */
export async function deleteTurfCascade(turfId, turfName = "Turf") {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Cancel future confirmed bookings with 80% refund
  const futureBookingsQ = query(
    collection(db, "bookings"),
    where("turfId", "==", turfId),
    where("status", "==", "confirmed")
  );
  const futureSnap = await getDocs(futureBookingsQ);
  const cancelPromises = futureSnap.docs
    .filter((d) => (d.data().date || "") >= today)
    .map(async (d) => {
      const data = d.data();
      const refundCoins = data.amount > 0 ? Math.round(data.amount * 0.8) : 0;
      await updateDoc(doc(db, "bookings", d.id), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "owner_deleted_turf",
        cancellationReason: `The turf "${turfName}" has been removed by its owner.`,
        refundCoins,
      });
      if (refundCoins > 0 && data.userId) {
        await creditWallet({
          userId: data.userId,
          amount: refundCoins,
          balanceType: "coin",
          bookingId: d.id,
          description: `Refund: "${turfName}" was removed. 80% returned as coins.`,
        });
      }
    });
  await Promise.all(cancelPromises);

  // 2. Delete ALL bookings for this turf
  const allBookingsQ = query(
    collection(db, "bookings"),
    where("turfId", "==", turfId)
  );
  const allBookingsSnap = await getDocs(allBookingsQ);
  await Promise.all(
    allBookingsSnap.docs.map((d) => deleteDoc(doc(db, "bookings", d.id)))
  );

  // 3. Delete all blockedSlots
  const blockedQ = query(
    collection(db, "blockedSlots"),
    where("turfId", "==", turfId)
  );
  const blockedSnap = await getDocs(blockedQ);
  await Promise.all(
    blockedSnap.docs.map((d) => deleteDoc(doc(db, "blockedSlots", d.id)))
  );

  // 4. Delete all reviews
  const reviewsQ = query(
    collection(db, "reviews"),
    where("turf_id", "==", turfId)
  );
  const reviewsSnap = await getDocs(reviewsQ);
  await Promise.all(
    reviewsSnap.docs.map((d) => deleteDoc(doc(db, "reviews", d.id)))
  );

  // 5. Delete the original turf_request (same doc ID)
  try {
    await deleteDoc(doc(db, "turf_requests", turfId));
  } catch (_) {
    // turf_requests doc may not exist if created a different way — ignore
  }

  // 6. Delete the turf document itself
  await deleteDoc(doc(db, "turfs", turfId));
}

/** Delete a single turf by ID (admin only — no cascade) */
export async function deleteTurf(id) {
  await deleteDoc(doc(db, "turfs", id));
}

/** Delete ALL turfs from the turfs collection (admin only) */
export async function deleteAllTurfs() {
  const snapshot = await getDocs(collection(db, "turfs"));
  const deletions = snapshot.docs.map((d) => deleteDoc(doc(db, "turfs", d.id)));
  await Promise.all(deletions);
  return snapshot.docs.length;
}
