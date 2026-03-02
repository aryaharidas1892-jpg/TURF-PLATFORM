// src/hooks/useBookings.js
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserBookings } from "../services/bookingService";

export function useBookings() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = () => {
    if (!currentUser) return;
    setLoading(true);
    getUserBookings(currentUser.uid)
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [currentUser]);
  return { bookings, loading, error, refetch: fetchBookings };
}
