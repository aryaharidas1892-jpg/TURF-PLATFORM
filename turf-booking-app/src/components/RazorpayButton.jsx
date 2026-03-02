// src/components/RazorpayButton.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { initiatePayment } from "../services/paymentService";
import { createBooking } from "../services/bookingService";
import { deductWallet } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";

export default function RazorpayButton({ slot, turf, onSuccess }) {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handlePayment() {
        setLoading(true);
        setError(null);
        await initiatePayment({
            amount: turf.price_per_slot,
            name: turf.name,
            description: `${slot.start_time} - ${slot.end_time} on ${slot.date}`,
            prefill: { name: currentUser.displayName, email: currentUser.email },
            async onSuccess(paymentId) {
                try {
                    const booking = await createBooking({
                        userId: currentUser.uid,
                        turfId: turf.id,
                        slotId: slot.id,
                        turfName: turf.name,
                        date: slot.date,
                        startTime: slot.start_time,
                        endTime: slot.end_time,
                        amount: turf.price_per_slot,
                        paymentId,
                    });
                    await deductWallet({
                        userId: currentUser.uid,
                        amount: turf.price_per_slot,
                        bookingId: booking.id,
                        description: `Booking - ${turf.name}`,
                    });
                    setLoading(false);
                    onSuccess(booking);
                } catch (err) {
                    setError("Booking failed after payment. Please contact support.");
                    setLoading(false);
                }
            },
            onFailure(msg) {
                setError(msg);
                setLoading(false);
            },
        });
    }

    return (
        <div>
            {error && <div className="alert alert-error">{error}</div>}
            <button onClick={handlePayment} disabled={loading} className="btn-pay">
                {loading ? "Processing..." : `Pay ${formatCurrency(turf.price_per_slot)}`}
            </button>
        </div>
    );
}
