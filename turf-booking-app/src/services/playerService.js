// src/services/playerService.js
import { db, auth } from "../firebase/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

const COLLECTION = "available_players";

/**
 * Mark the current user as available for a specific time slot.
 * @param {string} userId
 * @param {string} startTime - "HH:MM" (24h), e.g. "10:00"
 * @param {string} endTime   - "HH:MM" (24h), e.g. "12:00"
 * @param {string[]} sports  - optional list of sports the player is interested in
 */
export async function setAvailability(userId, startTime, endTime, sports = []) {
  const user = auth.currentUser;
  const now = new Date();

  // Build Date objects on today's date
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const availabilityFrom = new Date(now);
  availabilityFrom.setHours(startH, startM, 0, 0);

  const availabilityUntil = new Date(now);
  availabilityUntil.setHours(endH, endM, 0, 0);

  // If the end time has already passed today, push both dates to tomorrow
  if (availabilityUntil <= now) {
    availabilityFrom.setDate(availabilityFrom.getDate() + 1);
    availabilityUntil.setDate(availabilityUntil.getDate() + 1);
  }

  await setDoc(doc(db, COLLECTION, userId), {
    uid: userId,
    full_name: user?.displayName || "Player",
    email: user?.email || "",
    availability_from: Timestamp.fromDate(availabilityFrom),
    availability_until: Timestamp.fromDate(availabilityUntil),
    sports: sports.length > 0 ? sports : [],
    updated_at: Timestamp.now(),
  });
}


/**
 * Remove the current user from the available players list.
 */
export async function removeAvailability(userId) {
  await deleteDoc(doc(db, COLLECTION, userId));
}

/**
 * Fetch all players whose availability end time hasn't passed yet.
 */
export async function getAvailablePlayers() {
  const now = Timestamp.now();
  const q = query(
    collection(db, COLLECTION),
    where("availability_until", ">", now)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    availability_from: d.data().availability_from?.toDate?.() ?? null,
    availability_until: d.data().availability_until.toDate(),
  }));
}
