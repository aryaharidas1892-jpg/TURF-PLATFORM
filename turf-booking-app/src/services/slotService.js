// src/services/slotService.js
import { db } from "../firebase/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

/**
 * Fetch slots for a turf on a given date (alias for generateSlotsForDate).
 */
export async function getSlotsByTurfAndDate(turfId, date) {
  return generateSlotsForDate(turfId, date);
}

/**
 * Generate 1-hour time slots between a turf's opening and closing times,
 * marking each as booked or available based on confirmed bookings in Firestore.
 *
 * @param {string} turfId
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Array} slots — [{ id, date, start_time, end_time, booked }]
 */
export async function generateSlotsForDate(turfId, date) {
  // 1. Fetch the turf document to get operating hours
  const turfSnap = await getDoc(doc(db, "turfs", turfId));
  if (!turfSnap.exists()) throw new Error("Turf not found");
  const turf = turfSnap.data();

  const openingTime = turf.openingTime || "06:00";
  const closingTime = turf.closingTime || "22:00";

  // 2. Fetch all confirmed bookings for this turf on this date
  const bookingsQuery = query(
    collection(db, "bookings"),
    where("turfId", "==", turfId),
    where("date", "==", date),
    where("status", "==", "confirmed")
  );
  const bookingsSnap = await getDocs(bookingsQuery);
  const bookedStartTimes = new Set(
    bookingsSnap.docs.map((d) => d.data().startTime)
  );

  // 3. Parse opening/closing into minutes
  const [openH, openM] = openingTime.split(":").map(Number);
  const [closeH, closeM] = closingTime.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  // 4. Generate 1-hour slots
  const slots = [];
  for (let cur = openMin; cur + 60 <= closeMin; cur += 60) {
    const startH = Math.floor(cur / 60);
    const startM = cur % 60;
    const endH = Math.floor((cur + 60) / 60);
    const endM = (cur + 60) % 60;

    const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const start_time = fmt(startH, startM);
    const end_time = fmt(endH, endM);

    slots.push({
      id: `${turfId}_${date}_${start_time}`,
      date,
      start_time,
      end_time,
      booked: bookedStartTimes.has(start_time),
    });
  }

  return slots;
}
