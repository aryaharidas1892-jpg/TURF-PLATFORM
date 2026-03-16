// src/services/turfService.js
import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
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
