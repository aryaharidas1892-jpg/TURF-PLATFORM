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
 * Mark the current user as available for `minutes` minutes.
 * Saves their name from Firebase Auth displayName.
 */
export async function setAvailability(userId, minutes = 60) {
  const user = auth.currentUser;
  const availabilityUntil = new Date(Date.now() + minutes * 60 * 1000);

  await setDoc(doc(db, COLLECTION, userId), {
    uid: userId,
    full_name: user?.displayName || "Player",
    email: user?.email || "",
    availability_until: Timestamp.fromDate(availabilityUntil),
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
 * Fetch all players whose availability hasn't expired yet.
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
    // convert Firestore Timestamp → JS Date for the UI
    availability_until: d.data().availability_until.toDate(),
  }));
}
