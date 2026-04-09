// src/pages/BookingPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTurfById } from "../services/turfService";
import { generateSlotsForDate } from "../services/slotService";
import RazorpayButton from "../components/RazorpayButton";
import BackButton from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import { getTodayDate, formatDate, formatTime } from "../utils/dateUtils";
import { formatCurrency } from "../utils/formatCurrency";

// ── helpers ──────────────────────────────────────────────────────────────────
/** True if these two slots are consecutive (slot B starts exactly when A ends) */
function areConsecutive(slotA, slotB) {
  return slotA.end_time === slotB.start_time;
}

/** Toggle a slot in/out of the selection — enforces consecutive-only rule */
function toggleSlot(selected, slot) {
  const idx = selected.findIndex((s) => s.id === slot.id);

  // Deselect
  if (idx !== -1) {
    const next = selected.filter((s) => s.id !== slot.id);
    // Keep only a contiguous range: if removed from middle → clear all
    for (let i = 0; i < next.length - 1; i++) {
      if (!areConsecutive(next[i], next[i + 1])) return [];
    }
    return next;
  }

  // First selection
  if (selected.length === 0) return [slot];

  // Try to extend: must connect to either end of existing range
  const first = selected[0];
  const last = selected[selected.length - 1];
  if (areConsecutive(last, slot)) return [...selected, slot];
  if (areConsecutive(slot, first)) return [slot, ...selected];

  // Not adjacent — start fresh with just the new slot
  return [slot];
}

/** Format a range of slots as "HH:MM – HH:MM" */
function formatSlotRange(slots) {
  if (!slots.length) return "—";
  return `${formatTime(slots[0].start_time)} – ${formatTime(slots[slots.length - 1].end_time)}`;
}

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turf, setTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedSlots, setSelectedSlots] = useState([]);   // MULTI-SLOT
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState(null);
  const [turfError, setTurfError] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    getTurfById(id)
      .then(setTurf)
      .catch((err) => setTurfError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const loadSlots = useCallback(() => {
    if (!id || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlots([]);
    setSlotError(null);
    generateSlotsForDate(id, selectedDate)
      .then(setSlots)
      .catch((err) => setSlotError(err.message))
      .finally(() => setSlotsLoading(false));
  }, [id, selectedDate]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;

  if (turfError || !turf) {
    return (
      <div className="page-container">
        <BackButton fallback="/turfs" />
        <div className="error-state">
          <span className="error-state-icon">🏟️</span>
          <h2>Turf Not Available</h2>
          <p>{turfError || "This turf could not be found."}</p>
          <button className="btn-primary" onClick={() => navigate("/turfs")}>Browse All Turfs</button>
        </div>
      </div>
    );
  }

  const pricePerSlot = turf.price_per_slot ?? turf.pricePerHour ?? 0;
  const totalAmount = pricePerSlot * selectedSlots.length;

  // ── Success screen ────────────────────────────────────────────────────────
  if (bookingResult) {
    const bookedSlots = bookingResult.bookings || [];
    return (
      <div className="booking-success-page">
        <div className="booking-success-card">
          <div className="booking-success-icon">✅</div>
          <h2>Booking Confirmed!</h2>
          <p>Your turf slot{bookedSlots.length > 1 ? "s have" : " has"} been booked successfully.</p>
          <div className="booking-success-summary">
            <div className="bss-row"><span>Turf</span><strong>{turf.name || turf.turfName}</strong></div>
            <div className="bss-row"><span>Date</span><strong>{formatDate(selectedDate)}</strong></div>
            <div className="bss-row"><span>Duration</span><strong>{bookedSlots.length} hour{bookedSlots.length > 1 ? "s" : ""}</strong></div>
            {bookedSlots.length > 0 && (
              <div className="bss-row">
                <span>Time</span>
                <strong>{formatTime(bookedSlots[0].startTime)} – {formatTime(bookedSlots[bookedSlots.length - 1].endTime)}</strong>
              </div>
            )}
            <div className="bss-row total"><span>Paid from Wallet</span><strong>{formatCurrency(bookingResult.totalAmount)}</strong></div>
          </div>
          <div className="booking-success-actions">
            <button onClick={() => navigate("/bookings")} className="btn-primary">View My Bookings</button>
            <button onClick={() => navigate("/turfs")} className="btn-outline">Browse More Turfs</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Helpers for slot grid rendering ──────────────────────────────────────
  const bookedCount = slots.filter((s) => s.booked || s.is_booked).length;
  const availableCount = slots.length - bookedCount;

  function handleSlotClick(slot) {
    if (slot.booked || slot.is_booked) return;
    setSelectedSlots((prev) => toggleSlot(prev, slot));
  }

  return (
    <div className="booking-page">
      {/* Hero */}
      <div className="booking-hero">
        <img
          src={turf.image_url || turf.imageUrl || "https://placehold.co/1200x200/16a34a/white?text=Book+a+Slot"}
          alt={turf.name || turf.turfName}
          className="booking-hero-img"
        />
        <div className="booking-hero-overlay">
          <BackButton fallback={`/turfs/${id}`} />
          <div>
            <h1>{turf.name || turf.turfName}</h1>
            <p>📍 {turf.location || `${turf.address || ""}, ${turf.city || ""}`}</p>
          </div>
        </div>
      </div>

      <div className="booking-body">
        {/* ── Left column ────────────────────────────────────────── */}
        <div className="booking-left">

          {/* Date picker */}
          <div className="booking-date-picker">
            <h3 className="booking-section-title">📅 Select Date</h3>
            <input
              type="date"
              value={selectedDate}
              min={getTodayDate()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>

          {/* Multi-slot hint */}
          <div className="multiselect-hint">
            <span className="hint-icon">💡</span>
            <span>Tap multiple <strong>consecutive</strong> slots to book more than 1 hour. Price updates automatically.</span>
          </div>

          {/* Legend */}
          <div className="slot-legend">
            <span className="slot-legend-item available">🟢 Available ({availableCount})</span>
            <span className="slot-legend-item booked">🔴 Booked ({bookedCount})</span>
            <span className="slot-legend-item selected">🔵 Selected ({selectedSlots.length})</span>
          </div>

          {/* Slot grid */}
          <div className="booking-slots">
            <h3 className="booking-section-title">⏰ Time Slots — {formatDate(selectedDate)}</h3>
            {slotsLoading ? (
              <LoadingSpinner text="Loading slots…" />
            ) : slotError ? (
              <div className="slot-error">
                <p>⚠️ Could not load slots: {slotError}</p>
                <button className="btn-outline-sm" onClick={loadSlots}>Retry</button>
              </div>
            ) : slots.length === 0 ? (
              <p className="muted">No slots available for this date.</p>
            ) : (
              <div className="slot-grid-new">
                {slots.map((slot) => {
                  const isBooked = slot.booked || slot.is_booked;
                  const isSelected = selectedSlots.some((s) => s.id === slot.id);
                  return (
                    <button
                      key={slot.id}
                      className={`slot-tile ${isBooked ? "slot-tile--booked" : "slot-tile--available"} ${isSelected ? "slot-tile--selected" : ""}`}
                      disabled={isBooked}
                      onClick={() => handleSlotClick(slot)}
                      title={isBooked ? "Already booked" : `Tap to ${isSelected ? "deselect" : "select"} this slot`}
                    >
                      <span className="slot-time">{formatTime(slot.start_time)}</span>
                      <span className="slot-end-time">to {formatTime(slot.end_time)}</span>
                      <span className={`slot-status-dot ${isBooked ? "dot-red" : isSelected ? "dot-blue" : "dot-green"}`} />
                      <span className="slot-status-text">
                        {isBooked ? "Booked" : isSelected ? "✓ Selected" : "Available"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column — Sticky summary ──────────────────────── */}
        <div className="booking-right">
          <div className="booking-summary-card">
            <h3>Booking Summary</h3>
            <div className="bs-turf-info">
              <img
                src={turf.image_url || turf.imageUrl || "https://placehold.co/80x60/16a34a/white?text=⚽"}
                alt={turf.name}
                className="bs-turf-thumb"
              />
              <div>
                <strong>{turf.name || turf.turfName}</strong>
                <small>{turf.location || turf.city}</small>
              </div>
            </div>
            <div className="bs-divider" />
            <div className="bs-row"><span>Date</span><span>{formatDate(selectedDate)}</span></div>
            <div className="bs-row">
              <span>Time</span>
              <span className={selectedSlots.length ? "bs-slot-selected" : "bs-slot-empty"}>
                {formatSlotRange(selectedSlots)}
              </span>
            </div>

            {/* Duration + price breakdown */}
            {selectedSlots.length > 0 && (
              <>
                <div className="bs-row"><span>Duration</span><span>{selectedSlots.length} hour{selectedSlots.length > 1 ? "s" : ""}</span></div>
                <div className="bs-row">
                  <span>Rate</span>
                  <span>{formatCurrency(pricePerSlot)}/slot</span>
                </div>
              </>
            )}

            <div className="bs-row total">
              <span>Total</span>
              <span>{formatCurrency(totalAmount || pricePerSlot)}</span>
            </div>

            {selectedSlots.length > 0 ? (
              <RazorpayButton
                slots={selectedSlots}
                turf={turf}
                date={selectedDate}
                onSuccess={setBookingResult}
              />
            ) : (
              <button className="btn-primary w-full" disabled style={{ marginTop: 12 }}>
                Select a time slot first
              </button>
            )}

            <p className="bs-note">💳 Payment deducted from your wallet</p>
          </div>

          {/* Price info */}
          <div className="booking-price-info">
            <div className="bpi-row"><span>Price per slot (1hr)</span><strong>{formatCurrency(pricePerSlot)}</strong></div>
            {[2, 3, 4].map((n) => (
              <div key={n} className="bpi-row">
                <span>{n} slots ({n}hr)</span>
                <strong>{formatCurrency(pricePerSlot * n)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
