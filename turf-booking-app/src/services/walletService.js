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

// ════════════════════════════════════════════════════════════════
//  READS
// ════════════════════════════════════════════════════════════════

/**
 * Returns { walletBalance, coinBalance, totalBalance }
 * Backwards-compatible: old accounts with only `walletBalance` get coinBalance = 0
 */
export async function getBalances(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return { walletBalance: 0, coinBalance: 0, totalBalance: 0 };
  const data = snap.data();
  const walletBalance = data.walletBalance ?? 0;
  const coinBalance   = data.coinBalance   ?? 0;
  return { walletBalance, coinBalance, totalBalance: walletBalance + coinBalance };
}

/** Legacy single-number balance (total) — kept for any code still using it */
export async function getWalletBalance(userId) {
  const { totalBalance } = await getBalances(userId);
  return totalBalance;
}

/** Get wallet transaction history (unchanged) */
export async function getWalletTransactions(userId) {
  const txRef = collection(db, "users", userId, "transactions");
  const q = query(txRef, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════════════════════════
//  TOP-UP  →  credits Wallet Balance only
// ════════════════════════════════════════════════════════════════

export async function topUpWallet(userId, amount) {
  return creditWallet({
    userId,
    amount,
    balanceType: "wallet",
    description: "Wallet Top-Up",
  });
}

// ════════════════════════════════════════════════════════════════
//  CREDIT  (refunds → coins, top-ups → wallet)
// ════════════════════════════════════════════════════════════════

/**
 * Credit user's balance.
 * @param {string} opts.balanceType  "wallet" | "coin"  (default: "coin" for backward-compat with refunds)
 */
export async function creditWallet({ userId, amount, balanceType = "coin", bookingId, description }) {
  const userRef = doc(db, "users", userId);
  const txRef   = collection(userRef, "transactions");
  const field   = balanceType === "wallet" ? "walletBalance" : "coinBalance";

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const data    = userDoc.exists() ? userDoc.data() : {};
    const current = (data[field] ?? 0);
    const newVal  = current + amount;

    transaction.set(userRef, { [field]: newVal }, { merge: true });

    const newTxRef = doc(txRef);
    transaction.set(newTxRef, {
      type:         "credit",
      balanceType,
      amount,
      balance_after: newVal,
      description:  description || "Wallet Credit",
      bookingId:    bookingId || null,
      created_at:   serverTimestamp(),
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  DEDUCT  (coins first, then wallet — combined payment)
// ════════════════════════════════════════════════════════════════

/**
 * Deduct `amount` from the user's combined balance.
 * Priority: coinBalance first, then walletBalance for the remainder.
 * Atomic Firestore transaction — throws if total balance insufficient.
 */
export async function deductWallet({ userId, amount, bookingId, description }) {
  const userRef = doc(db, "users", userId);
  const txRef   = collection(userRef, "transactions");

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User does not exist!");

    const data          = userDoc.data();
    const coinBalance   = data.coinBalance   ?? 0;
    const walletBalance = data.walletBalance ?? 0;
    const total         = coinBalance + walletBalance;

    if (total < amount) throw new Error("Insufficient balance.");

    // Coins first  ──────────────────────────────────────────────
    const coinsUsed  = Math.min(coinBalance, amount);
    const walletUsed = amount - coinsUsed;

    const newCoin   = coinBalance   - coinsUsed;
    const newWallet = walletBalance - walletUsed;

    transaction.set(userRef, { coinBalance: newCoin, walletBalance: newWallet }, { merge: true });

    // Record breakdown in transaction log
    const newTxRef = doc(txRef);
    transaction.set(newTxRef, {
      type:          "debit",
      amount,
      coinsUsed,
      walletUsed,
      coinBalance_after:   newCoin,
      walletBalance_after: newWallet,
      balance_after: newCoin + newWallet,
      description:   description || "Wallet Deduction",
      bookingId:     bookingId || null,
      created_at:    serverTimestamp(),
    });
  });
}
