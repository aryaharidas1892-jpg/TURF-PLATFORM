// src/components/RazorpayButton.jsx
// NOTE: Despite the filename, this component uses WALLET payment (Razorpay is inactive).
// It now supports a "Use Coins" option that deducts coins from the wallet balance first,
// then charges the remaining amount from the wallet.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createMultiSlotBooking } from "../services/bookingService";
import { deductWallet, getWalletBalance } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";

/**
 * Handles payment and booking for one or more selected time slots.
 * Supports partial coin payment: user can apply some/all of their coin balance
 * to reduce the final charged amount.
 *
 * Props:
 *   slots     — array of slot objects (supports 1 or many)
 *   turf      — turf object
 *   date      — "YYYY-MM-DD"
 *   onSuccess — called with booking result on success
 */
export default function RazorpayButton({ slots, turf, date, onSuccess }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("");
  const [walletBalance, setWalletBalance] = useState(null); // loaded on mount
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [balanceFetched, setBalanceFetched] = useState(false);

  // Normalize: accept single slot OR array of slots
  const slotArray = Array.isArray(slots) ? slots : slots ? [slots] : [];
  const pricePerSlot = turf?.price_per_slot ?? turf?.pricePerHour ?? 0;
  const totalAmount = pricePerSlot * slotArray.length;

  // Fetch balance when this component renders (once)
  if (!balanceFetched && currentUser) {
    setBalanceFetched(true);
    getWalletBalance(currentUser.uid).then((bal) => {
      setWalletBalance(bal);
      // Pre-fill max coins usable
      setCoinsToUse(Math.min(bal, totalAmount));
    });
  }

  if (!slotArray.length) return null;

  // --- Coin input validation ---
  const maxCoins = Math.min(walletBalance ?? 0, totalAmount);
  const validCoins = Math.max(0, Math.min(coinsToUse, maxCoins));
  const finalAmount = Math.max(0, totalAmount - validCoins);

  function handleCoinChange(e) {
    const val = Number(e.target.value);
    setCoinsToUse(Math.max(0, Math.min(val, maxCoins)));
  }

  async function handlePay() {
    if (!currentUser) { setError("Please log in to continue."); return; }
    if (!slotArray.length) { setError("No slots selected."); return; }

    setLoading(true);
    setError(null);

    try {
      // 1. Refresh balance to prevent stale reads
      setStep("Checking wallet balance…");
      const balance = await getWalletBalance(currentUser.uid);
      setWalletBalance(balance);

      // Recompute with fresh balance
      const coinsApplied = Math.max(0, Math.min(validCoins, balance, totalAmount));
      const amountFromWallet = totalAmount - coinsApplied;

      if (balance < totalAmount) {
        setError(
          `Insufficient wallet balance. You have ${formatCurrency(balance)} but need ${formatCurrency(totalAmount)}. ` +
          (coinsApplied > 0 ? `(${formatCurrency(coinsApplied)} coins applied)` : "") +
          " Please top up your wallet."
        );
        setLoading(false);
        setStep("");
        return;
      }

      // 2. Create bookings for all selected slots
      setStep("Creating booking…");
      const bookingDate = date || slotArray[0]?.date;
      const result = await createMultiSlotBooking({
        userId: currentUser.uid,
        turfId: turf.id,
        turfName: turf.name || turf.turfName || "",
        date: bookingDate,
        slots: slotArray,
        pricePerSlot,
        paymentId: `wallet_${Date.now()}`,
        coinsUsed: coinsApplied,
      });

      // 3. Deduct total amount from wallet (coins + remaining, all treated as wallet coins)
      setStep("Processing payment…");
      await deductWallet({
        userId: currentUser.uid,
        amount: totalAmount,
        bookingId: result.groupId,
        description:
          coinsApplied > 0
            ? `Booking at ${turf.name || turf.turfName} — ${formatCurrency(coinsApplied)} coins + ${formatCurrency(amountFromWallet)} wallet`
            : `Booking ${slotArray.length} slot(s) at ${turf.name || turf.turfName}`,
      });

      setStep("");
      setLoading(false);
      onSuccess({ ...result, coinsUsed: coinsApplied });
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
      setLoading(false);
      setStep("");
    }
  }

  return (
    <div className="wallet-pay-wrap">
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 10 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Coin usage section ─────────────────────────────── */}
      {walletBalance !== null && walletBalance > 0 && (
        <div className="coins-apply-section">
          <div className="coins-apply-header">
            <span className="coins-apply-label">🪙 Use Wallet Coins</span>
            <span className="coins-apply-balance">Available: {formatCurrency(walletBalance)}</span>
          </div>
          <div className="coins-apply-row">
            <input
              type="range"
              min={0}
              max={maxCoins}
              value={coinsToUse}
              step={1}
              onChange={handleCoinChange}
              className="coins-slider"
            />
            <input
              type="number"
              min={0}
              max={maxCoins}
              value={coinsToUse}
              onChange={handleCoinChange}
              className="coins-number-input"
            />
          </div>
          {coinsToUse > 0 && (
            <div className="coins-summary">
              <div className="coins-sum-row">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="coins-sum-row green">
                <span>🪙 Coins Applied</span>
                <span>-{formatCurrency(validCoins)}</span>
              </div>
              <div className="coins-sum-row total-highlight">
                <span>Amount to Pay</span>
                <strong>{formatCurrency(finalAmount)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {step && (
        <div className="pay-progress">
          <span className="pay-progress-dot" />
          {step}
        </div>
      )}

      <button onClick={handlePay} disabled={loading} className="btn-pay">
        {loading
          ? "Processing…"
          : finalAmount === 0
          ? `🪙 Pay Fully with ${formatCurrency(validCoins)} Coins`
          : coinsToUse > 0
          ? `💳 Pay ${formatCurrency(finalAmount)} (+ ${formatCurrency(validCoins)} coins)`
          : `💳 Pay ${formatCurrency(totalAmount)} from Wallet`}
      </button>
    </div>
  );
}
