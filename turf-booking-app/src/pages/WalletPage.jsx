// src/pages/WalletPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { topUpWallet } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/dateUtils";
import LoadingSpinner from "../components/LoadingSpinner";

const TOP_UP_AMOUNTS = [200, 500, 1000, 2000];

export default function WalletPage() {
  const { currentUser } = useAuth();
  const { balance, transactions, loading, refetch } = useWallet();
  const [topUp, setTopUp] = useState("");
  const [topping, setTopping] = useState(false);

  // Dynamically load Razorpay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
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
      amount: amount * 100, // paise => INR
      currency: "INR",
      name: "TurfBook Wallet",
      description: "Wallet Top-up",
      handler: async function (response) {
        // Payment successful callback
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
      prefill: {
        name: currentUser.displayName || "User",
        email: currentUser.email || "",
      },
      theme: { color: "#16a34a" },
      modal: {
        ondismiss: function () {
          setTopping(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      alert("Payment failed: " + response.error.description);
      setTopping(false);
    });
    rzp.open();
  }

  if (loading) return <LoadingSpinner text="Loading wallet..." />;

  return (
    <div className="page-container">
      <h1>My Wallet</h1>
      <div className="wallet-layout">
        <div className="wallet-card">
          <p className="wallet-label">Available Balance</p>
          <h2 className="wallet-balance">{formatCurrency(balance)}</h2>
          <div className="topup-section">
            <p className="topup-title">Quick Top-Up</p>
            <div className="topup-amounts">
              {TOP_UP_AMOUNTS.map((amt) => (
                <button key={amt} onClick={() => handleTopUp(amt)} disabled={topping} className="topup-btn">
                  +₹{amt}
                </button>
              ))}
            </div>
            <div className="topup-custom">
              <input
                type="number"
                placeholder="Custom amount"
                min="1"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value)}
              />
              <button onClick={() => topUp && handleTopUp(Number(topUp))} disabled={topping || !topUp} className="btn-primary">
                {topping ? "..." : "Add"}
              </button>
            </div>
          </div>
        </div>

        <div className="transactions-section">
          <h3>Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="muted">No transactions yet.</p>
          ) : (
            <div className="transaction-list">
              {transactions.map((tx) => (
                <div key={tx.id} className={`transaction-row ${tx.type}`}>
                  <div className="tx-info">
                    <span className="tx-icon">{tx.type === "credit" ? "⬆️" : "⬇️"}</span>
                    <div>
                      <p className="tx-desc">{tx.description}</p>
                      <small className="tx-date">{formatDate(tx.created_at)}</small>
                    </div>
                  </div>
                  <div className="tx-amount-col">
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    <small className="tx-balance">Bal: {formatCurrency(tx.balance_after)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
