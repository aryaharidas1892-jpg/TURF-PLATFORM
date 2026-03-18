// src/services/walletService.js
import { db } from "../firebase/firebase";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  increment,
  query,
  orderBy,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";

/** Get current wallet balance */
export async function getWalletBalance(userId) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data().walletBalance || 0;
  }
  return 0;
}

/** Get wallet transactions */
export async function getWalletTransactions(userId) {
  const txRef = collection(db, "users", userId, "transactions");
  const q = query(txRef, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/** Deduct from wallet with Firestore Transaction (Atomic) */
export async function deductWallet({ userId, amount, bookingId, description }) {
  const userRef = doc(db, "users", userId);
  const txRef = collection(userRef, "transactions");

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User does not exist!");

    const currentBalance = userDoc.data().walletBalance || 0;
    if (currentBalance < amount) {
      throw new Error("Insufficient wallet balance.");
    }

    const newBalance = currentBalance - amount;

    // Update balance
    transaction.update(userRef, { walletBalance: newBalance });

    // Record transaction
    const newTxRef = doc(txRef);
    transaction.set(newTxRef, {
      type: "debit",
      amount,
      balance_after: newBalance,
      description: description || "Wallet Deduction",
      bookingId: bookingId || null,
      created_at: serverTimestamp(),
    });
  });
}

/** Credit/Add to wallet with Firestore Transaction (Atomic) */
export async function creditWallet({ userId, amount, bookingId, description }) {
  const userRef = doc(db, "users", userId);
  const txRef = collection(userRef, "transactions");

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    // If user doc doesn't exist, this might fail, but it's guaranteed to exist since auth is required.
    const currentBalance = userDoc.exists() ? (userDoc.data().walletBalance || 0) : 0;
    
    const newBalance = currentBalance + amount;

    // Update balance
    transaction.set(userRef, { walletBalance: newBalance }, { merge: true });

    // Record transaction
    const newTxRef = doc(txRef);
    transaction.set(newTxRef, {
      type: "credit",
      amount,
      balance_after: newBalance,
      description: description || "Wallet Credit",
      bookingId: bookingId || null,
      created_at: serverTimestamp(),
    });
  });
}

/** Top-up wrapper */
export async function topUpWallet(userId, amount) {
  return creditWallet({ userId, amount, description: "Wallet Top-Up" });
}
