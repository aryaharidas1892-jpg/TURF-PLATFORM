// src/services/slotService.js
import { db } from "../firebase/firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Returns today's date as "YYYY-MM-DD" and current local time as "HH:MM".
 */
function getNowLocal() {
  const now = new Date();
  const date = now.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return { todayDate: date, currentTime: `${hh}:${mm}` };
}

/**
 * Fetch slots for a turf on a given date (alias for generateSlotsForDate).
 */
export async function getSlotsByTurfAndDate(turfId, date) {
  return generateSlotsForDate(turfId, date);
}

/**
 * Generate 1-hour time slots between a turf's opening and closing times,
 * marking each as booked or available based on:
 *   1. Confirmed online bookings in the `bookings` collection
 *   2. Owner-blocked slots in the `blockedSlots` collection
 *
 * @param {string} turfId
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Array} slots — [{ id, date, start_time, end_time, booked, blockedByOwner, offlineNote }]
 */
export async function generateSlotsForDate(turfId, date) {
  // 1. Fetch the turf document to get operating hours
  const turfSnap = await getDoc(doc(db, "turfs", turfId));
  if (!turfSnap.exists()) throw new Error("Turf not found");
  const turf = turfSnap.data();

  const openingTime = turf.openingTime || "06:00";
  const closingTime = turf.closingTime || "22:00";

  // 2a. Fetch all confirmed online bookings for this turf on this date
  const bookingsQuery = query(
    collection(db, "bookings"),
    where("turfId", "==", turfId),
    where("date", "==", date),
    where("status", "==", "confirmed")
  );
  const bookingsSnap = await getDocs(bookingsQuery);
  const bookedStartTimes = new Set(bookingsSnap.docs.map((d) => d.data().startTime));

  // 2b. Also fetch slot locks — these are written atomically before the booking
  //     document, so they capture in-progress bookings by other users in real time.
  const locksQuery = query(
    collection(db, "slotLocks"),
    where("turfId", "==", turfId),
    where("date", "==", date)
  );
  const locksSnap = await getDocs(locksQuery);
  locksSnap.docs.forEach((d) => bookedStartTimes.add(d.data().startTime));

  // 3. Fetch owner-blocked slots for this turf on this date
  const blockedQuery = query(
    collection(db, "blockedSlots"),
    where("turfId", "==", turfId),
    where("date", "==", date)
  );
  const blockedSnap = await getDocs(blockedQuery);
  const blockedMap = {}; // startTime -> { note }
  blockedSnap.docs.forEach((d) => {
    const data = d.data();
    blockedMap[data.startTime] = { note: data.note || "" };
  });

  // 4. Parse opening/closing into minutes
  const [openH, openM] = openingTime.split(":").map(Number);
  const [closeH, closeM] = closingTime.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  // 5. Generate 1-hour slots
  const { todayDate, currentTime } = getNowLocal();
  const isToday = date === todayDate;

  const slots = [];
  for (let cur = openMin; cur + 60 <= closeMin; cur += 60) {
    const startH = Math.floor(cur / 60);
    const startM = cur % 60;
    const endH = Math.floor((cur + 60) / 60);
    const endM = (cur + 60) % 60;

    const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const start_time = fmt(startH, startM);
    const end_time = fmt(endH, endM);

    const isOnlineBooked = bookedStartTimes.has(start_time);
    const isOwnerBlocked = !!blockedMap[start_time];

    // A slot is "past" only when viewing today and the start time has already passed
    const isPast = isToday && start_time <= currentTime;

    slots.push({
      id: `${turfId}_${date}_${start_time}`,
      date,
      start_time,
      end_time,
      booked: isOnlineBooked || isOwnerBlocked,
      blockedByOwner: isOwnerBlocked,
      offlineNote: isOwnerBlocked ? blockedMap[start_time].note : "",
      isPast,
    });
  }

  return slots;
}

/**
 * Block a time slot for an offline (walk-in / phone) customer.
 * Called by turf owner from the dashboard.
 *
 * @param {string} turfId
 * @param {string} date   - "YYYY-MM-DD"
 * @param {string} startTime - "HH:MM"
 * @param {string} note   - optional reason (e.g. "Walk-in customer — John")
 */
export async function blockSlotForOffline(turfId, date, startTime, note = "") {
  const id = `${turfId}_${date}_${startTime}`;
  await setDoc(doc(db, "blockedSlots", id), {
    turfId,
    date,
    startTime,
    note,
    blockedAt: serverTimestamp(),
  });
}

/**
 * Unblock a previously owner-blocked slot (free it up again).
 *
 * @param {string} turfId
 * @param {string} date   - "YYYY-MM-DD"
 * @param {string} startTime - "HH:MM"
 */
export async function unblockSlot(turfId, date, startTime) {
  const id = `${turfId}_${date}_${startTime}`;
  await deleteDoc(doc(db, "blockedSlots", id));
}

/**
 * Real-time listener for blocked slots on a turf (used by owner dashboard).
 * Returns unsubscribe function.
 */
export function subscribeToBlockedSlots(turfId, callback) {
  const q = query(
    collection(db, "blockedSlots"),
    where("turfId", "==", turfId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
