// src/pages/WalletPage.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { topUpWallet } from "../services/walletService";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/dateUtils";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Wallet, Coins, Plus, RefreshCw, ArrowUpRight, ArrowDownLeft,
  ReceiptText, AlertCircle, CheckCircle2, Info
} from "lucide-react";

const TOP_UP_AMOUNTS = [200, 500, 1000, 2000];

// ── Transaction row icon/color metadata ──────────────────────────────────────
function getTxMeta(tx) {
  const desc = (tx.description || "").toLowerCase();
  const isCoin = tx.balanceType === "coin" || desc.includes("coin") || desc.includes("refund") || desc.includes("80%");
  if (tx.type === "credit" && isCoin)  return { Icon: Coins,          color: "tx-coin",   label: "Coin Refund" };
  if (tx.type === "credit")            return { Icon: ArrowUpRight,   color: "tx-credit", label: "Top-Up" };
  return                                      { Icon: ArrowDownLeft,  color: "tx-debit",  label: "Payment" };
}

export default function WalletPage() {
  const { currentUser } = useAuth();
  const { walletBalance, coinBalance, balance, transactions, loading, refetch } = useWallet();
  const [topUp, setTopUp]     = useState("");
  const [topping, setTopping] = useState(false);
  const [topupMsg, setTopupMsg] = useState(null); // { type: 'success'|'error', text }

  // ── Top-Up via Razorpay ───────────────────────────────────────────────────
  async function handleTopUp(amount) {
    if (amount <= 0) return;
    setTopping(true);
    setTopupMsg(null);

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) {
      setTopupMsg({ type: "error", text: "Razorpay API key is missing. Contact support." });
      setTopping(false);
      return;
    }

    // Ensure Razorpay SDK is loaded
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
      await new Promise((res) => { script.onload = res; script.onerror = res; });
    }

    if (!window.Razorpay) {
      setTopupMsg({ type: "error", text: "Could not load payment SDK. Check your internet connection." });
      setTopping(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: keyId,
      amount: amount * 100,
      currency: "INR",
      name: "TurfBook Wallet",
      description: "Wallet Top-up",
      prefill: { name: currentUser.displayName || "User", email: currentUser.email || "" },
      theme: { color: "#16a34a" },
      handler: async (response) => {
        try {
          await topUpWallet(currentUser.uid, amount);
          await refetch();
          setTopupMsg({ type: "success", text: `${formatCurrency(amount)} added to your Wallet Balance!` });
          setTopUp("");
        } catch (err) {
          setTopupMsg({ type: "error", text: "Top-up failed to record: " + err.message });
        }
        setTopping(false);
      },
      modal: { ondismiss: () => setTopping(false) },
    });
    rzp.on("payment.failed", (r) => {
      setTopupMsg({ type: "error", text: "Payment failed: " + r.error.description });
      setTopping(false);
    });
    rzp.open();
  }

  if (loading) return <LoadingSpinner text="Loading wallet…" />;

  const totalBalance = walletBalance + coinBalance;

  return (
    <div className="wallet-page">
      {/* ── Page header ──────────────────────────────── */}
      <div className="wallet-header">
        <div>
          <h1 className="wallet-title">
            <Wallet size={24} /> My Wallet
          </h1>
          <p>Manage your funds and transaction history</p>
        </div>
        <button className="btn-outline-sm" onClick={refetch} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Top-up feedback banner ───────────────────── */}
      {topupMsg && (
        <div className={`wallet-topup-banner ${topupMsg.type === "success" ? "banner-success" : "banner-error"}`}>
          {topupMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {topupMsg.text}
        </div>
      )}

      <div className="wallet-layout-v2">
        {/* ════════ LEFT COLUMN ════════ */}
        <div className="wallet-left">

          {/* ── TOTAL BALANCE HERO ─────────────────────── */}
          <div className="wallet-total-card">
            <div className="wtc-label">Total Available Balance</div>
            <div className="wtc-amount">{formatCurrency(totalBalance)}</div>
            <div className="wtc-sub">Coins + Wallet combined for payments</div>
          </div>

          {/* ── BIFURCATED BALANCE CARDS ──────────────── */}
          <div className="wallet-split-row">
            {/* Coin Balance */}
            <div className="wallet-split-card coin-card">
              <div className="wsc-icon coin-icon"><Coins size={20} /></div>
              <div>
                <div className="wsc-label">Coin Balance</div>
                <div className="wsc-amount">{formatCurrency(coinBalance)}</div>
              </div>
              <div className="wsc-badge coin-badge">Priority</div>
            </div>

            {/* Wallet Balance */}
            <div className="wallet-split-card wallet-card">
              <div className="wsc-icon wallet-icon"><Wallet size={20} /></div>
              <div>
                <div className="wsc-label">Wallet Balance</div>
                <div className="wsc-amount">{formatCurrency(walletBalance)}</div>
              </div>
              <div className="wsc-badge wallet-badge">Top-Up</div>
            </div>
          </div>

          {/* ── HOW PAYMENT WORKS INFO ─────────────────── */}
          <div className="wallet-info-box">
            <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>How combined payment works</strong>
              <ul className="wallet-info-list">
                <li>Coins are used <strong>first</strong> when you book a turf.</li>
                <li>If the price exceeds your Coins, the rest is drawn from your Wallet.</li>
                <li>Refunds <strong>always go to Coins</strong>, never cash.</li>
                <li>Top-ups <strong>always go to Wallet</strong> Balance.</li>
              </ul>
            </div>
          </div>

          {/* ── REFUND POLICY ──────────────────────────── */}
          <div className="wallet-policy-card">
            <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ReceiptText size={16} /> Cancellation &amp; Refund Policy
            </h4>
            <div className="wallet-policy-row"><span>Refund Amount</span><strong>80% as Coins</strong></div>
            <div className="wallet-policy-row"><span>Cancellation Fee</span><strong>20% (non-refundable)</strong></div>
            <div className="wallet-policy-row"><span>Credited In</span><strong>Instant</strong></div>
            <p className="wallet-policy-note">
              Coins cannot be transferred to a bank account — they are for future bookings only.
            </p>
          </div>

          {/* ── TOP-UP CARD ────────────────────────────── */}
          <div className="wallet-topup-card">
            <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} /> Add Money to Wallet
            </h4>
            <p className="wallet-topup-desc">
              Topped-up money goes into your <strong>Wallet Balance</strong>.
            </p>
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

        {/* ════════ RIGHT COLUMN — Transactions ════════ */}
        <div className="wallet-right">
          <div className="wallet-tx-card">
            <div className="wallet-tx-header">
              <h3>Transaction History</h3>
              <span className="wallet-tx-count">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
            </div>

            {transactions.length === 0 ? (
              <div className="wallet-tx-empty">
                <ReceiptText size={36} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 10 }} />
                <p>No transactions yet.<br />Book a turf or add money to see activity.</p>
              </div>
            ) : (
              <div className="wallet-tx-list">
                {transactions.map((tx) => {
                  const { Icon, color, label } = getTxMeta(tx);
                  const isCoinTx = tx.balanceType === "coin" || color === "tx-coin";
                  const isDebit  = tx.type === "debit";
                  return (
                    <div key={tx.id} className={`wallet-tx-row ${color}`}>
                      <div className="wallet-tx-icon">
                        <Icon size={16} />
                      </div>
                      <div className="wallet-tx-info">
                        <p className="wallet-tx-desc">{tx.description || label}</p>
                        <small className="wallet-tx-date">{formatDate(tx.created_at)}</small>

                        {/* Show coins used + wallet used breakdown for debits */}
                        {isDebit && (tx.coinsUsed > 0 || tx.walletUsed > 0) && (
                          <div className="tx-breakdown">
                            {tx.coinsUsed > 0 && (
                              <span className="tx-breakdown-item coin">
                                <Coins size={10} /> {formatCurrency(tx.coinsUsed)}
                              </span>
                            )}
                            {tx.walletUsed > 0 && (
                              <span className="tx-breakdown-item wallet">
                                <Wallet size={10} /> {formatCurrency(tx.walletUsed)}
                              </span>
                            )}
                          </div>
                        )}
                        {isCoinTx && tx.type === "credit" && (
                          <span className="wallet-tx-refund-badge">
                            <Coins size={10} /> Coin Refund
                          </span>
                        )}
                      </div>
                      <div className="wallet-tx-amount-col">
                        <span className={`wallet-tx-amount ${tx.type === "credit" ? "positive" : "negative"}`}>
                          {tx.type === "credit" ? "+" : "−"}{formatCurrency(tx.amount)}
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
