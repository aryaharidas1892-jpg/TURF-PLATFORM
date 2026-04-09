// src/hooks/useWallet.js
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getBalances, getWalletTransactions } from "../services/walletService";

export function useWallet() {
  const { currentUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [coinBalance,   setCoinBalance]   = useState(0);
  const [transactions,  setTransactions]  = useState([]);
  const [loading,       setLoading]       = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [{ walletBalance: wb, coinBalance: cb }, txns] = await Promise.all([
        getBalances(currentUser.uid),
        getWalletTransactions(currentUser.uid),
      ]);
      setWalletBalance(wb);
      setCoinBalance(cb);
      setTransactions(txns);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  return {
    walletBalance,
    coinBalance,
    balance: walletBalance + coinBalance,   // legacy alias — total
    transactions,
    loading,
    refetch: fetchWallet,
  };
}
