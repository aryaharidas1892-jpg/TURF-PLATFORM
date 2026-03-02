// src/services/paymentService.js
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="razorpay"]')) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function initiatePayment({ amount, name, description, prefill, onSuccess, onFailure }) {
  const loaded = await loadRazorpayScript();
  if (!loaded) { onFailure("Failed to load Razorpay SDK."); return; }

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: Math.round(amount * 100),
    currency: "INR",
    name: name || "Turf Booking",
    description: description || "Slot Booking",
    prefill: { name: prefill?.name || "", email: prefill?.email || "", contact: prefill?.phone || "" },
    theme: { color: "#16a34a" },
    handler: (response) => onSuccess(response.razorpay_payment_id),
    modal: { ondismiss: () => onFailure("Payment cancelled by user.") },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (resp) => onFailure(resp.error.description));
  rzp.open();
}
