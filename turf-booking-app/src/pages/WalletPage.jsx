// src/pages/WalletPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { topUpWallet } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/dateUtils";
import LoadingSpinner from "../components/LoadingSpinner";

const TOP_UP_AMOUNTS = [200, 500, 1000, 2000];

// ── Transaction type metadata ─────────────────────────────────────────────────
function getTxMeta(tx) {
  const desc = (tx.description || "").toLowerCase();
  if (desc.includes("refund") || desc.includes("80%")) {
    return { icon: "🪙", color: "tx-refund", label: "Refund" };
  }
  if (tx.type === "credit") {
    return { icon: "⬆️", color: "tx-credit", label: "Credit" };
  }
  return { icon: "⬇️", color: "tx-debit", label: "Debit" };
}

export default function WalletPage() {
  const { currentUser } = useAuth();
  const { balance, transactions, loading, refetch } = useWallet();
  const [topUp, setTopUp] = useState("");
  const [topping, setTopping] = useState(false);
  const [recentCredit, setRecentCredit] = useState(false);

  // Animate coin balance when a refund credit has just arrived
  useEffect(() => {
    const hasNewRefund = transactions.some((tx) =>
      tx.type === "credit" && (tx.description || "").toLowerCase().includes("refund")
    );
    if (hasNewRefund) {
      setRecentCredit(true);
      const t = setTimeout(() => setRecentCredit(false), 2500);
      return () => clearTimeout(t);
    }
  }, [transactions]);

  // Dynamically load Razorpay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  async function handleTopUp(amount) {
    if (amount <= 0) return;
    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }
    setTopping(true);
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) {
      alert("Razorpay API key is missing from environment variables.");
      setTopping(false);
      return;
    }
    const options = {
      key: keyId,
      amount: amount * 100,
      currency: "INR",
      name: "TurfBook Wallet",
      description: "Wallet Top-up",
      handler: async function (response) {
        try {
          await topUpWallet(currentUser.uid, amount);
          await refetch();
          alert(`₹${amount} added to your wallet successfully!`);
        } catch (err) {
          alert("Top-up failed to record in database: " + err.message);
        }
        setTopping(false);
        setTopUp("");
      },
      prefill: { name: currentUser.displayName || "User", email: currentUser.email || "" },
      theme: { color: "#16a34a" },
      modal: { ondismiss: () => setTopping(false) },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (r) => {
      alert("Payment failed: " + r.error.description);
      setTopping(false);
    });
    rzp.open();
  }

  if (loading) return <LoadingSpinner text="Loading wallet…" />;

  return (
    <div className="wallet-page">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="wallet-header">
        <div>
          <h1>My Wallet 🪙</h1>
          <p>Manage your coins and transaction history</p>
        </div>
        <button className="btn-outline-sm" onClick={refetch}>🔄 Refresh</button>
      </div>

      <div className="wallet-layout-v2">
        {/* ── Left — Balance Card + Top-Up ───────────────────── */}
        <div className="wallet-left">
          {/* Balance card */}
          <div className={`wallet-balance-card ${recentCredit ? "wallet-coin-celebrate" : ""}`}>
            <div className="wbc-top">
              <div>
                <p className="wbc-label">Coin Balance</p>
                <h2 className="wbc-amount">{formatCurrency(balance)}</h2>
              </div>
              <span className="wbc-coin-icon">🪙</span>
            </div>
            <div className="wbc-bottom">
              <span>💡 Coins can be used to pay for turf bookings</span>
              {recentCredit && (
                <span className="wbc-new-badge">🎉 New coins credited!</span>
              )}
            </div>
          </div>

          {/* Refund policy info card */}
          <div className="wallet-policy-card">
            <h4>💼 Cancellation & Refund Policy</h4>
            <div className="wallet-policy-row">
              <span>🪙 Refund Amount</span>
              <strong>80% as Wallet Coins</strong>
            </div>
            <div className="wallet-policy-row">
              <span>❌ Cancellation Fee</span>
              <strong>20% (non-refundable)</strong>
            </div>
            <div className="wallet-policy-row">
              <span>⏱️ Credited In</span>
              <strong>Instant</strong>
            </div>
            <p className="wallet-policy-note">
              Coins cannot be transferred to a bank account. They can only be used for future turf bookings.
            </p>
          </div>

          {/* Top-Up Card */}
          <div className="wallet-topup-card">
            <h4>💳 Add Money</h4>
            <p className="wallet-topup-desc">Add money to your wallet to book turfs instantly.</p>
            <div className="topup-amounts-v2">
              {TOP_UP_AMOUNTS.map((amt) => (
                <button key={amt} onClick={() => handleTopUp(amt)} disabled={topping} className="topup-chip">
                  +₹{amt}
                </button>
              ))}
            </div>
            <div className="topup-custom-v2">
              <input
                type="number"
                placeholder="Custom amount (₹)"
                min="1"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value)}
              />
              <button
                onClick={() => topUp && handleTopUp(Number(topUp))}
                disabled={topping || !topUp}
                className="btn-primary"
              >
                {topping ? "Processing…" : "Add"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right — Transaction History ─────────────────────── */}
        <div className="wallet-right">
          <div className="wallet-tx-card">
            <div className="wallet-tx-header">
              <h3>Transaction History</h3>
              <span className="wallet-tx-count">{transactions.length} transactions</span>
            </div>

            {transactions.length === 0 ? (
              <div className="wallet-tx-empty">
                <span>📄</span>
                <p>No transactions yet.<br/>Book a turf or receive a refund to see activity.</p>
              </div>
            ) : (
              <div className="wallet-tx-list">
                {transactions.map((tx) => {
                  const meta = getTxMeta(tx);
                  return (
                    <div key={tx.id} className={`wallet-tx-row ${meta.color}`}>
                      <div className="wallet-tx-icon">{meta.icon}</div>
                      <div className="wallet-tx-info">
                        <p className="wallet-tx-desc">{tx.description || meta.label}</p>
                        <small className="wallet-tx-date">{formatDate(tx.created_at)}</small>
                        {tx.type === "credit" && (tx.description || "").toLowerCase().includes("refund") && (
                          <span className="wallet-tx-refund-badge">🪙 Coin Refund</span>
                        )}
                      </div>
                      <div className="wallet-tx-amount-col">
                        <span className={`wallet-tx-amount ${tx.type === "credit" ? "positive" : "negative"}`}>
                          {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                        {tx.balance_after !== undefined && (
                          <small className="wallet-tx-bal">Bal: {formatCurrency(tx.balance_after)}</small>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
