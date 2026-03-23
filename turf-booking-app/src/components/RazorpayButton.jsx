// src/components/RazorpayButton.jsx
// NOTE: Despite the filename, this component uses WALLET payment (Razorpay is inactive).
// Rename to WalletPayButton.jsx if you migrate fully to wallet-only.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createMultiSlotBooking } from "../services/bookingService";
import { deductWallet } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";
import { getWalletBalance } from "../services/walletService";

/**
 * Handles payment and booking for one or more selected time slots.
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
  const [step, setStep] = useState(""); // progress text

  // Normalize: accept single slot OR array of slots
  const slotArray = Array.isArray(slots) ? slots : slots ? [slots] : [];
  const pricePerSlot = turf?.price_per_slot ?? turf?.pricePerHour ?? 0;
  const totalAmount = pricePerSlot * slotArray.length;

  if (!slotArray.length) return null;

  async function handlePay() {
    if (!currentUser) { setError("Please log in to continue."); return; }
    if (!slotArray.length) { setError("No slots selected."); return; }

    setLoading(true);
    setError(null);
    setStep("Checking wallet balance…");

    try {
      // 1. Check wallet balance upfront
      const balance = await getWalletBalance(currentUser.uid);
      if (balance < totalAmount) {
        setError(`Insufficient wallet balance. You have ${formatCurrency(balance)} but need ${formatCurrency(totalAmount)}. Please top up your wallet.`);
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
      });

      // 3. Deduct from wallet
      setStep("Processing payment…");
      await deductWallet({
        userId: currentUser.uid,
        amount: totalAmount,
        bookingId: result.groupId,
        description: `Booking ${slotArray.length} slot(s) at ${turf.name || turf.turfName}`,
      });

      setStep("");
      setLoading(false);
      onSuccess(result);
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
      {step && (
        <div className="pay-progress">
          <span className="pay-progress-dot" />
          {step}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-pay"
      >
        {loading
          ? "Processing…"
          : `💳 Pay ${formatCurrency(totalAmount)} from Wallet`}
      </button>
    </div>
  );
}
