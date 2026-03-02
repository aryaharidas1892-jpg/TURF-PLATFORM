// src/services/bookingService.js
// TODO: Replace with Firebase implementation

import { creditWallet } from "./walletService";

export async function createBooking({ userId, turfId, slotId, turfName, date, startTime, endTime, amount, paymentId }) {
  // TODO: Implement with Firebase
  // 1. Insert booking into Firestore
  // 2. Mark slot as booked
  throw new Error("Not implemented – replace with Firebase");
}

export async function getUserBookings(userId) {
  // TODO: Implement with Firebase
  throw new Error("Not implemented – replace with Firebase");
}

export async function cancelBooking(bookingId, userId) {
  // TODO: Implement with Firebase
  // 1. Get booking
  // 2. Check it's upcoming
  // 3. Calculate refund (full if >24h before, 50% otherwise)
  // 4. Update booking status to cancelled
  // 5. Free the slot
  // 6. Refund wallet via creditWallet()
  throw new Error("Not implemented – replace with Firebase");
}
