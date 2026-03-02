// src/services/walletService.js
// TODO: Replace with Firebase implementation

export async function getWalletBalance(userId) {
  // TODO: Implement with Firebase
  throw new Error("Not implemented – replace with Firebase");
}

export async function getWalletTransactions(userId) {
  // TODO: Implement with Firebase
  throw new Error("Not implemented – replace with Firebase");
}

export async function deductWallet({ userId, amount, bookingId, description }) {
  // TODO: Implement with Firebase
  // 1. Get current balance
  // 2. Check sufficient funds
  // 3. Update balance
  // 4. Insert transaction record
  throw new Error("Not implemented – replace with Firebase");
}

export async function creditWallet({ userId, amount, bookingId, description }) {
  // TODO: Implement with Firebase
  // 1. Get current balance
  // 2. Update balance
  // 3. Insert transaction record
  throw new Error("Not implemented – replace with Firebase");
}

export async function topUpWallet(userId, amount) {
  return creditWallet({ userId, amount, description: "Wallet Top-Up" });
}
