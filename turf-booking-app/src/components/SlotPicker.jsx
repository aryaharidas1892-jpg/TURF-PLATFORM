// src/components/SlotPicker.jsx
import { formatTime } from "../utils/dateUtils";

export default function SlotPicker({ slots, selectedSlot, onSelect }) {
  if (!slots || slots.length === 0) {
    return (
      <div className="slot-empty">
        <span>🗓️</span>
        <p>No time slots available for this date.</p>
      </div>
    );
  }

  return (
    <div className="slot-grid-new">
      {slots.map((slot) => {
        const isBooked = slot.booked || slot.is_booked;
        const isSelected = selectedSlot?.id === slot.id;
        return (
          <button
            key={slot.id}
            className={`slot-tile ${isBooked ? "slot-tile--booked" : "slot-tile--available"} ${isSelected ? "slot-tile--selected" : ""}`}
            disabled={isBooked}
            onClick={() => !isBooked && onSelect(slot)}
            title={isBooked ? "This slot is already booked" : `Book ${slot.start_time} – ${slot.end_time}`}
          >
            <span className="slot-time">{formatTime(slot.start_time)}</span>
            <span className="slot-end-time">to {formatTime(slot.end_time)}</span>
            <span className={`slot-status-dot ${isBooked ? "dot-red" : "dot-green"}`} />
            <span className="slot-status-text">{isBooked ? "Booked" : isSelected ? "Selected!" : "Available"}</span>
          </button>
        );
      })}
    </div>
  );
}
