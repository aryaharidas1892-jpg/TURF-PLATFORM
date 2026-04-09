// src/utils/dateUtils.js
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

export function formatTime(timeStr) {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
}

export function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export function isFutureDate(dateStr) {
  return new Date(dateStr) >= new Date(getTodayDate());
}
