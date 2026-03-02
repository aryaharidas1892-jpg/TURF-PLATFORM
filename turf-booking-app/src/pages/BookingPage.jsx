// src/pages/BookingPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTurfById } from "../services/turfService";
import { getSlotsByTurfAndDate, generateSlotsForDate } from "../services/slotService";
import SlotPicker from "../components/SlotPicker";
import RazorpayButton from "../components/RazorpayButton";
import BackButton from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import { getTodayDate, formatDate, formatTime } from "../utils/dateUtils";
import { formatCurrency } from "../utils/formatCurrency";

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turf, setTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    getTurfById(id).then(setTurf).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    generateSlotsForDate(id, selectedDate)
      .then(setSlots)
      .finally(() => setSlotsLoading(false));
  }, [id, selectedDate]);

  function handleBookingSuccess(booking) {
    setBookingSuccess(booking);
  }

  if (loading) return <LoadingSpinner />;
  if (!turf) return <div className="page-container"><p>Turf not found.</p></div>;

  if (bookingSuccess) {
    return (
      <div className="page-container success-page">
        <div className="success-card">
          <div className="success-icon">✅</div>
          <h2>Booking Confirmed!</h2>
          <p>Your turf is booked successfully.</p>
          <div className="booking-summary">
            <div className="summary-row"><span>Turf</span><strong>{turf.name}</strong></div>
            <div className="summary-row"><span>Date</span><strong>{formatDate(selectedDate)}</strong></div>
            <div className="summary-row"><span>Time</span><strong>{formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}</strong></div>
            <div className="summary-row"><span>Amount</span><strong>{formatCurrency(turf.price_per_slot)}</strong></div>
          </div>
          <button onClick={() => navigate("/bookings")} className="btn-primary">View My Bookings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <BackButton fallback={`/turfs/${id}`} />
      <h1>Book a Slot</h1>
      <div className="booking-layout">
        <div className="booking-left">
          <div className="booking-turf-info">
            <h2>{turf.name}</h2>
            <p>📍 {turf.location}</p>
          </div>

          <div className="form-group">
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              min={getTodayDate()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="slot-section">
            <h3>Available Slots — {formatDate(selectedDate)}</h3>
            {slotsLoading ? <LoadingSpinner text="Loading slots..." /> : (
              <SlotPicker slots={slots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
            )}
          </div>
        </div>

        <div className="booking-right">
          <div className="booking-summary-card">
            <h3>Booking Summary</h3>
            <div className="summary-row"><span>Turf</span><span>{turf.name}</span></div>
            <div className="summary-row"><span>Date</span><span>{formatDate(selectedDate)}</span></div>
            <div className="summary-row">
              <span>Time</span>
              <span>{selectedSlot ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}` : "—"}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatCurrency(turf.price_per_slot)}</span>
            </div>
            {selectedSlot ? (
              <RazorpayButton slot={selectedSlot} turf={turf} onSuccess={handleBookingSuccess} />
            ) : (
              <p className="select-slot-hint">← Please select a time slot</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
