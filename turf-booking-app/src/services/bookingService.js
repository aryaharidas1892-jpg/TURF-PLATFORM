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

export async function createBooking({ userId, turfId, slotId, turfName, dateStr, startTime, endTime, amount, paymentId }) {
  const bookingRef = collection(db, "bookings");
  const slotRef = doc(db, "slots", slotId); // assuming we have a slots collection too, wait...

  // Wait, if slots are dynamic, we just save the booking and query it later to block the slot!
  const newBooking = {
    userId,
    turfId,
    turfName,
    date: dateStr, // "YYYY-MM-DD"
    startTime,
    endTime,
    amount,
    paymentId: paymentId || null,
    status: "confirmed",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(bookingRef, newBooking);
  return docRef.id;
}

export async function getUserBookings(userId) {
  const q = query(
    collection(db, "bookings"),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function cancelBooking(bookingId, userId) {
  const bookingRef = doc(db, "bookings", bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error("Booking not found");

  const data = snap.data();
  if (data.userId !== userId) throw new Error("Unauthorized");
  if (data.status === "cancelled") throw new Error("Already cancelled");

  // simplified refund logic for now
  await updateDoc(bookingRef, { status: "cancelled", cancelledAt: serverTimestamp() });
  
  if (data.amount > 0) {
    await creditWallet({
      userId,
      amount: data.amount,
      bookingId,
      description: `Refund for Booking: ${data.turfName}`
    });
  }
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
