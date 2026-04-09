// src/services/turfService.js
import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

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

/** Delete a single turf by ID (admin only) */
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
