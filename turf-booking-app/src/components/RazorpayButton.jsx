// src/components/RazorpayButton.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createMultiSlotBooking } from "../services/bookingService";
import { deductWallet, getBalances } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";
import {
  Wallet, ShieldCheck, AlertTriangle, Loader2, ChevronRight,
  CheckCircle2, Clock, Calendar, X
} from "lucide-react";

/**
 * Payment button with:
 *  - Pre-payment disclaimer/confirmation modal
 *  - Wallet balance check
 *  - Multi-slot booking support
 */
export default function RazorpayButton({ slots, turf, date, onSuccess }) {
  const { currentUser } = useAuth();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("");

  const slotArray = Array.isArray(slots) ? slots : slots ? [slots] : [];
  const pricePerSlot = turf?.price_per_slot ?? turf?.pricePerHour ?? 0;
  const totalAmount = pricePerSlot * slotArray.length;

  if (!slotArray.length) return null;

  async function handleConfirmedPay() {
    setShowDisclaimer(false);
    if (!currentUser) { setError("Please log in to continue."); return; }

    setLoading(true);
    setError(null);
    setStep("Checking balance…");

    try {
      const { walletBalance, coinBalance, totalBalance } = await getBalances(currentUser.uid);
      if (totalBalance < totalAmount) {
        setError(
          `Insufficient balance. You have ${formatCurrency(coinBalance)} in Coins + ${formatCurrency(walletBalance)} in Wallet = ${formatCurrency(totalBalance)}, but need ${formatCurrency(totalAmount)}.`
        );
        setLoading(false); setStep(""); return;
      }

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
    <>
      {/* ── Pay Button ────────────────────────────────────────── */}
      <div className="wallet-pay-wrap">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
            {error}
          </div>
        )}
        {step && (
          <div className="pay-progress">
            <Loader2 size={14} className="spin-icon" />
            {step}
          </div>
        )}
        <button
          onClick={() => setShowDisclaimer(true)}
          disabled={loading}
          className="btn-pay"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {loading ? (
            <><Loader2 size={16} className="spin-icon" /> Processing…</>
          ) : (
            <><Wallet size={16} /> Pay {formatCurrency(totalAmount)} from Wallet</>
          )}
        </button>
      </div>

      {/* ── Disclaimer Modal ──────────────────────────────────── */}
      {showDisclaimer && (
        <div className="modal-overlay" onClick={() => setShowDisclaimer(false)}>
          <div className="disclaimer-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="disclaimer-header">
              <div className="disclaimer-icon-wrap">
                <ShieldCheck size={28} color="var(--primary)" />
              </div>
              <div>
                <h3>Confirm Your Booking</h3>
                <p>Please review the details before payment</p>
              </div>
              <button className="disclaimer-close" onClick={() => setShowDisclaimer(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Booking summary */}
            <div className="disclaimer-summary">
              <div className="disc-row">
                <span className="disc-label"><Calendar size={14} /> Turf</span>
                <strong>{turf.name || turf.turfName}</strong>
              </div>
              <div className="disc-row">
                <span className="disc-label"><Calendar size={14} /> Date</span>
                <strong>{date}</strong>
              </div>
              <div className="disc-row">
                <span className="disc-label"><Clock size={14} /> Slots</span>
                <strong>{slotArray.length} hour{slotArray.length > 1 ? "s" : ""}</strong>
              </div>
              {slotArray.length > 0 && (
                <div className="disc-row">
                  <span className="disc-label"><Clock size={14} /> Time</span>
                  <strong>
                    {slotArray[0].start_time} – {slotArray[slotArray.length - 1].end_time}
                  </strong>
                </div>
              )}
              <div className="disc-divider" />
              <div className="disc-row disc-total">
                <span className="disc-label"><Wallet size={14} /> Total</span>
                <strong className="disc-amount">{formatCurrency(totalAmount)}</strong>
              </div>
            </div>

            {/* Disclaimer notice */}
            <div className="disclaimer-notice">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <ul>
                <li>Payment will be <strong>deducted from your in-app wallet</strong>.</li>
                <li>Cancellations are eligible for a <strong>full refund to your wallet</strong> if done before the slot time.</li>
                <li>Owner-initiated cancellations will refund <strong>80% of the amount</strong> as wallet coins.</li>
                <li>No-shows or late cancellations may <strong>not be refunded</strong>.</li>
                <li>By confirming, you agree to the <strong>TurfBook Booking Policy</strong>.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="disclaimer-actions">
              <button className="btn-outline" onClick={() => setShowDisclaimer(false)}>
                Cancel
              </button>
              <button className="btn-pay" onClick={handleConfirmedPay} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} />
                Confirm & Pay {formatCurrency(totalAmount)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
