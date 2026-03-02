// src/components/SlotPicker.jsx
import { formatTime } from "../utils/dateUtils";

export default function SlotPicker({ slots, selectedSlot, onSelect }) {
  if (!slots || slots.length === 0) {
    return <p className="no-slots">No slots available for this date.</p>;
  }

  return (
    <div className="slot-grid">
      {slots.map((slot) => (
        <button
          key={slot.id}
          className={`slot-btn ${slot.is_booked ? "booked" : ""} ${selectedSlot?.id === slot.id ? "selected" : ""}`}
          disabled={slot.is_booked}
          onClick={() => !slot.is_booked && onSelect(slot)}
        >
          <span>{formatTime(slot.start_time)}</span>
          <small>{slot.is_booked ? "Booked" : "Available"}</small>
        </button>
      ))}
    </div>
  );
}
