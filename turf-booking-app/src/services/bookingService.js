// src/services/bookingService.js
import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  runTransaction,
  onSnapshot
} from "firebase/firestore";
import { creditWallet } from "./walletService";

export async function createBooking({ userId, turfId, slotId, turfName, date, dateStr, startTime, endTime, amount, paymentId, groupId }) {
  const bookingRef = collection(db, "bookings");

  // Accept either `date` or `dateStr` for backward-compatibility
  const bookingDate = date || dateStr;
  if (!bookingDate) throw new Error("Booking date is required.");

  const newBooking = {
    userId,
    turfId,
    turfName: turfName || "",
    date: bookingDate,
    startTime,
    endTime,
    amount,
    paymentId: paymentId || null,
    groupId: groupId || null,       // links multi-slot bookings
    status: "confirmed",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(bookingRef, newBooking);
  return { id: docRef.id, ...newBooking };
}

/** Book multiple consecutive slots in one transaction */
export async function createMultiSlotBooking({ userId, turfId, turfName, date, slots, pricePerSlot, paymentId }) {
  const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const bookingRef = collection(db, "bookings");

  const bookings = [];
  for (const slot of slots) {
    const newBooking = {
      userId,
      turfId,
      turfName: turfName || "",
      date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      amount: pricePerSlot,
      paymentId: paymentId || null,
      groupId,
      status: "confirmed",
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(bookingRef, newBooking);
    bookings.push({ id: docRef.id, ...newBooking });
  }
  return { groupId, bookings, totalAmount: pricePerSlot * slots.length };
}


export async function getUserBookings(userId) {
  // No orderBy — avoids composite index requirement.
  // Sort client-side instead.
  const q = query(
    collection(db, "bookings"),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const bookings = snapshot.docs.map((d) => {
    const data = d.data();
    // Compute a display status based on Firestore `status` field and date
    let booking_status;
    if (data.status === "cancelled") {
      booking_status = "cancelled";
    } else if (data.date && data.date >= today) {
      booking_status = "upcoming";
    } else {
      booking_status = "completed";
    }
    return { id: d.id, ...data, booking_status };
  });

  // Sort: upcoming first (ascending date), then past (descending)
  return bookings.sort((a, b) => {
    if (a.booking_status === "upcoming" && b.booking_status !== "upcoming") return -1;
    if (b.booking_status === "upcoming" && a.booking_status !== "upcoming") return 1;
    return (b.date || "").localeCompare(a.date || "");
  });
}

export async function cancelBooking(bookingId, userId) {
  const bookingRef = doc(db, "bookings", bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error("Booking not found");

  const data = snap.data();
  if (data.userId !== userId) throw new Error("Unauthorized");
  if (data.status === "cancelled") throw new Error("Already cancelled");

  // ── Compute 80% refund (20% cancellation fee is withheld) ──────────────
  const refundCoins = data.amount > 0 ? Math.round(data.amount * 0.8) : 0;
  const cancellationFee = data.amount > 0 ? Math.round(data.amount * 0.2) : 0;

  await updateDoc(bookingRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    refundCoins,
    cancellationFee,
    refunded: refundCoins > 0,
  });

  if (refundCoins > 0) {
    await creditWallet({
      userId,
      amount: refundCoins,
      bookingId,
      description: `80% refund for cancelled booking at ${data.turfName || "Turf"} (₹${cancellationFee} cancellation fee deducted)`,
    });
  }
  return { refundAmount: refundCoins, cancellationFee };
}

/** Real-time listener for all confirmed bookings for a specific turf (used by Owner Dashboard) */
export function subscribeToTurfBookings(turfId, callback) {
  const q = query(
    collection(db, "bookings"),
    where("turfId", "==", turfId),
    where("status", "==", "confirmed")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}

/**
 * Owner cancels a user's booking on their turf.
 * User receives 80% refund as wallet coins.
 * @param {string} bookingId
 * @param {string} ownerId  — must own the turf
 * @param {string} reason   — cancellation reason shown to user
 */
export async function ownerCancelBooking(bookingId, ownerId, reason) {
  const bookingRef = doc(db, "bookings", bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error("Booking not found.");

  const data = snap.data();
  if (data.status === "cancelled") throw new Error("Booking is already cancelled.");
  if (!reason?.trim()) throw new Error("Please provide a cancellation reason.");

  const refundCoins = data.amount > 0 ? Math.round(data.amount * 0.80) : 0;
  const withheld    = data.amount > 0 ? data.amount - refundCoins : 0;

  // Mark booking cancelled by owner
  await updateDoc(bookingRef, {
    status:           "cancelled",
    cancelledAt:      serverTimestamp(),
    cancelledBy:      "owner",
    cancellationReason: reason.trim(),
    refundCoins,
    withheld,
  });

  // Credit 80% back to user wallet
  if (refundCoins > 0) {
    await creditWallet({
      userId:      data.userId,
      amount:      refundCoins,
      bookingId,
      description: `Owner cancelled your booking at ${data.turfName || "Turf"}. Reason: ${reason}. 80% refund applied.`,
    });
  }

  return { refundCoins, withheld };
}
