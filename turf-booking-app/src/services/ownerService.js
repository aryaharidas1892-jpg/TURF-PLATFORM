// src/services/ownerService.js
import { db } from "../firebase/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  serverTimestamp,
} from "firebase/firestore";

const OWNER_REQUESTS = "owner_requests";
const USERS = "users";

/** Save initial user profile to Firestore (called on any signup) */
export async function createUserProfile(uid, data) {
  await setDoc(doc(db, USERS, uid), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

/** Fetch a user's full profile from Firestore */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return snap.data();
}

/** Submit an owner registration request.
 *  Creates users/{uid} with role "owner_pending" AND owner_requests/{uid}
 */
export async function submitOwnerRequest(uid, formData) {
  // 1. Save user profile with pending role
  await setDoc(doc(db, USERS, uid), {
    uid,
    role: "owner_pending",
    displayName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    createdAt: serverTimestamp(),
  });

  // 2. Save full owner request document
  await setDoc(doc(db, OWNER_REQUESTS, uid), {
    uid,
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    businessName: formData.businessName,
    city: formData.city,
    address: formData.address,
    yearsExperience: formData.yearsExperience,
    description: formData.description,
    gstin: formData.gstin || "",
    status: "pending",
    rejectionReason: "",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  });
}

/** Real-time listener for owner's own request status */
export function subscribeToOwnerRequest(uid, callback, onError) {
  return onSnapshot(
    doc(db, OWNER_REQUESTS, uid),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => { if (onError) onError(err); }
  );
}

/** Admin: real-time listener for all owner requests */
export function subscribeToAllOwnerRequests(callback, onError) {
  const q = query(collection(db, OWNER_REQUESTS), orderBy("submittedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { if (onError) onError(err); }
  );
}

/** Admin: approve an owner — updates both users/{uid} and owner_requests/{uid} */
export async function approveOwnerRequest(uid) {
  await updateDoc(doc(db, USERS, uid), {
    role: "owner",
    approvedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, OWNER_REQUESTS, uid), {
    status: "approved",
    reviewedAt: serverTimestamp(),
  });
}

/** Admin: reject an owner request */
export async function rejectOwnerRequest(uid, reason) {
  await updateDoc(doc(db, USERS, uid), { role: "user" });
  await updateDoc(doc(db, OWNER_REQUESTS, uid), {
    status: "rejected",
    rejectionReason: reason.trim(),
    reviewedAt: serverTimestamp(),
  });
}

/** Get turfs that belong to this owner (by requestId = owner's submitted request) */
export function subscribeToOwnerTurfs(ownerUid, callback, onError) {
  const q = query(
    collection(db, "turf_requests"),
    where("submittedById", "==", ownerUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));
      callback(data);
    },
    (err) => { if (onError) onError(err); }
  );
}
