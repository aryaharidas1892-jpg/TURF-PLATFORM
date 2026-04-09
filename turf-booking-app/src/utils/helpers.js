// src/utils/formatCurrency.js
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// src/utils/constants.js (append below)
export const BOOKING_STATUS = {
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  REFUNDED: "refunded",
};

export const AVAILABILITY_DURATIONS = [
  { label: "1 Hour", value: 60 },
  { label: "2 Hours", value: 120 },
  { label: "3 Hours", value: 180 },
  { label: "Today", value: 480 },
];
