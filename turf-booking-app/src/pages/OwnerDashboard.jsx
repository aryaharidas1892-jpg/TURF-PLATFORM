// src/pages/OwnerDashboard.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToOwnerTurfs } from "../services/ownerService";
import { subscribeToUserRequests } from "../services/turfRequestService";
import { subscribeToTurfBookings, ownerCancelBooking } from "../services/bookingService";
import { subscribeToBlockedSlots, blockSlotForOffline, unblockSlot } from "../services/slotService";
import { deleteTurfCascade } from "../services/turfService";
import AddTurfRequest from "./AddTurfRequest";
import EditTurfModal from "../components/EditTurfModal";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  LayoutDashboard, Building2, PlusCircle, ClipboardList,
  User, LogOut, Calendar, Clock, DollarSign, Ban,
  CheckCircle2, AlertTriangle, X, ChevronRight, RefreshCw,
  Wallet, Shield, Pencil, Trash2
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";

const NAV_ITEMS = [
  { key: "overview",  label: "Overview",       Icon: LayoutDashboard },
  { key: "turfs",     label: "My Turfs",        Icon: Building2 },
  { key: "bookings",  label: "Bookings",        Icon: ClipboardList },
  { key: "add",       label: "Add Turf",        Icon: PlusCircle },
  { key: "requests",  label: "My Requests",     Icon: ClipboardList },
  { key: "profile",   label: "Profile",         Icon: User },
];

// ── Slot helpers ─────────────────────────────────────────────────────────────
function generateSlots(opening, closing) {
  const slots = [];
  const [oh, om] = opening.split(":").map(Number);
  const [ch, cm] = closing.split(":").map(Number);
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur + 60 <= end) {
    const h1 = Math.floor(cur / 60), m1 = cur % 60;
    const h2 = Math.floor((cur + 60) / 60), m2 = (cur + 60) % 60;
    const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ label: `${fmt(h1, m1)}–${fmt(h2, m2)}`, startMin: cur });
    cur += 60;
  }
  return slots;
}

function isSlotBooked(bookings, dateStr, startMin) {
  return bookings.some((b) => {
    if (b.date !== dateStr) return false;
    if (!b.startTime) return false;
    const [h, m] = b.startTime.split(":").map(Number);
    return h * 60 + m === startMin;
  });
}

function isSlotBlocked(blockedSlots, dateStr, startMin) {
  const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const h = Math.floor(startMin / 60);
  const m = startMin % 60;
  const startTime = fmt(h, m);
  return blockedSlots.some((b) => b.date === dateStr && b.startTime === startTime);
}

// ── Block Slot Modal ──────────────────────────────────────────────────────────
function BlockSlotModal({ slot, dateStr, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Ban size={18} color="#f59e0b" /> Block Slot for Offline Booking
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 16 }}>
          Marking <strong>{slot.label}</strong> on <strong>{dateStr}</strong> as booked will prevent online users from selecting it.
        </p>
        <div className="form-group">
          <label>Note (optional)</label>
          <input
            type="text"
            placeholder="e.g. Walk-in customer, Phone booking — John"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="btn-outline-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
            onClick={() => onConfirm(note)}
          >
            Block Slot
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Owner Cancel Booking Modal ────────────────────────────────────────────────
function OwnerCancelModal({ booking, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const refund80 = booking ? Math.round((booking.amount || 0) * 0.8) : 0;

  async function handleConfirm() {
    if (!reason.trim()) { alert("Please provide a cancellation reason."); return; }
    setSubmitting(true);
    await onConfirm(booking.id, reason);
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal owner-cancel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ocm-header">
          <div className="ocm-header-icon"><Ban size={22} color="#dc2626" /></div>
          <div>
            <h3>Cancel Booking</h3>
            <p>This will refund 80% of the booking amount to the user.</p>
          </div>
          <button className="disclaimer-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ocm-booking-info">
          <div className="ocm-row"><Calendar size={13} /><span>Date:</span><strong>{booking?.date}</strong></div>
          <div className="ocm-row"><Clock size={13} /><span>Time:</span><strong>{booking?.startTime} – {booking?.endTime}</strong></div>
          <div className="ocm-row"><Wallet size={13} /><span>Paid:</span><strong>{formatCurrency(booking?.amount || 0)}</strong></div>
          <div className="ocm-row refund"><Shield size={13} /><span>User Refund (80%):</span><strong>{formatCurrency(refund80)}</strong></div>
          <div className="ocm-row withheld"><AlertTriangle size={13} /><span>Withheld (20%):</span><strong>{formatCurrency((booking?.amount || 0) - refund80)}</strong></div>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Cancellation Reason <span className="req-star">*</span></label>
          <textarea
            rows={3}
            placeholder="e.g. Turf maintenance, waterlogging, power outage, emergency..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </div>

        <div className="atr-disclaimer" style={{ marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <p>The user will receive <strong>{formatCurrency(refund80)} as wallet coins</strong>. This action cannot be undone.</p>
        </div>

        <div className="modal-actions">
          <button className="btn-outline-sm" onClick={onClose} disabled={submitting}>Back</button>
          <button className="btn-danger-sm" onClick={handleConfirm} disabled={submitting || !reason.trim()}>
            {submitting ? "Cancelling…" : `Cancel & Refund ${formatCurrency(refund80)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Turf Slots View ──────────────────────────────────────────────────────────
function TurfSlotsView({ turf }) {
  const [bookings, setBookings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockTarget, setBlockTarget] = useState(null);
  const [toggling, setToggling] = useState(null);
  const slots = generateSlots(turf.openingTime || "06:00", turf.closingTime || "22:00");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split("T")[0],
      label: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
    };
  });

  useEffect(() => {
    if (!turf?.id) return;
    const unsub1 = subscribeToTurfBookings(turf.id, setBookings);
    const unsub2 = subscribeToBlockedSlots(turf.id, setBlockedSlots);
    return () => { unsub1(); unsub2(); };
  }, [turf.id]);

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const offlineBlocked = blockedSlots.length;

  async function handleBlockConfirm(note) {
    const { slot, dateStr } = blockTarget;
    setBlockTarget(null);
    setToggling(`${dateStr}_${slot.startMin}`);
    const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const h = Math.floor(slot.startMin / 60), m = slot.startMin % 60;
    try { await blockSlotForOffline(turf.id, dateStr, fmt(h, m), note); }
    catch (err) { alert("Failed to block slot: " + err.message); }
    setToggling(null);
  }

  async function handleUnblock(slot, dateStr) {
    setToggling(`${dateStr}_${slot.startMin}`);
    const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const h = Math.floor(slot.startMin / 60), m = slot.startMin % 60;
    try { await unblockSlot(turf.id, dateStr, fmt(h, m)); }
    catch (err) { alert("Failed to unblock slot: " + err.message); }
    setToggling(null);
  }

  function handleSlotClick(slot, dateStr) {
    const booked = isSlotBooked(bookings, dateStr, slot.startMin);
    const blocked = isSlotBlocked(blockedSlots, dateStr, slot.startMin);
    if (booked) return;
    if (blocked) {
      if (window.confirm(`Unblock ${slot.label} on ${dateStr}?`)) handleUnblock(slot, dateStr);
    } else {
      setBlockTarget({ slot, dateStr });
    }
  }

  return (
    <div className="slots-container">
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div className="owner-stat-mini"><span>{totalBookings}</span><small>Online Bookings</small></div>
        <div className="owner-stat-mini primary"><span>₹{totalRevenue}</span><small>Est. Revenue</small></div>
        <div className="owner-stat-mini orange"><span>{offlineBlocked}</span><small>Offline Blocked</small></div>
      </div>
      <div className="slots-legend">
        <span className="slot-chip available"><CheckCircle2 size={12} /> Available</span>
        <span className="slot-chip booked"><X size={12} /> Online Booked</span>
        <span className="slot-chip offline"><Ban size={12} /> Blocked (Offline)</span>
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "6px 0 14px" }}>
        Click any available slot to block it for an offline/walk-in customer.
      </p>
      <div className="slots-scroll">
        {days.map(({ dateStr, label }) => (
          <div key={dateStr} className="slot-day-col">
            <div className="slot-day-header">{label}</div>
            {slots.map((slot) => {
              const booked = isSlotBooked(bookings, dateStr, slot.startMin);
              const blocked = isSlotBlocked(blockedSlots, dateStr, slot.startMin);
              const isToggling = toggling === `${dateStr}_${slot.startMin}`;
              let chipClass = "available";
              if (booked) chipClass = "booked";
              else if (blocked) chipClass = "offline";
              return (
                <div
                  key={slot.startMin}
                  className={`slot-cell ${chipClass} ${!booked ? "clickable" : ""}`}
                  onClick={() => !isToggling && handleSlotClick(slot, dateStr)}
                >
                  {isToggling ? "…" : slot.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {blockTarget && (
        <BlockSlotModal
          slot={blockTarget.slot}
          dateStr={blockTarget.dateStr}
          onConfirm={handleBlockConfirm}
          onClose={() => setBlockTarget(null)}
        />
      )}
    </div>
  );
}

// ── Bookings Tab (new) — shows all bookings, owner can cancel ─────────────────
function BookingsTab({ turfs, currentUser }) {
  const [allBookings, setAllBookings] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [filterTurf, setFilterTurf] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const approvedTurfs = turfs.filter((t) => t.status === "approved");

  useEffect(() => {
    if (approvedTurfs.length === 0) return;
    const unsubs = approvedTurfs.map((turf) =>
      subscribeToTurfBookings(turf.id, (bookings) => {
        setAllBookings((prev) => {
          const others = prev.filter((b) => b.turfId !== turf.id);
          return [...others, ...bookings];
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [turfs]);

  async function handleOwnerCancel(bookingId, reason) {
    try {
      const result = await ownerCancelBooking(bookingId, currentUser.uid, reason);
      setCancelTarget(null);
      setSuccessMsg(`Booking cancelled. ${formatCurrency(result.refundCoins)} refunded to user's wallet.`);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  let displayed = allBookings;
  if (filterTurf !== "all") displayed = displayed.filter((b) => b.turfId === filterTurf);
  if (filterDate) displayed = displayed.filter((b) => b.date === filterDate);
  displayed = [...displayed].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="owner-bookings-tab">
      <div className="obt-controls">
        <select className="obt-filter" value={filterTurf} onChange={(e) => setFilterTurf(e.target.value)}>
          <option value="all">All Turfs</option>
          {approvedTurfs.map((t) => <option key={t.id} value={t.id}>{t.turfName}</option>)}
        </select>
        <input
          type="date"
          className="obt-filter date-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          placeholder="Filter by date"
        />
        {filterDate && <button className="btn-outline-sm" onClick={() => setFilterDate("")}>Clear</button>}
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="empty-state">
          <Calendar size={40} strokeWidth={1.5} style={{ marginBottom: 12, color: "var(--text-secondary)" }} />
          <p>No active bookings found for the selected filter.</p>
        </div>
      ) : (
        <div className="obt-list">
          {displayed.map((b) => {
            const isPast = b.date < today;
            return (
              <div key={b.id} className={`obt-card ${isPast ? "obt-past" : "obt-upcoming"}`}>
                <div className="obt-card-left">
                  <div className="obt-status-dot" />
                  <div>
                    <div className="obt-turf-name">{b.turfName}</div>
                    <div className="obt-details">
                      <span><Calendar size={12} /> {b.date}</span>
                      <span><Clock size={12} /> {b.startTime} – {b.endTime}</span>
                      <span><Wallet size={12} /> {formatCurrency(b.amount)}</span>
                    </div>
                    <div className="obt-user-ref">User: {b.userId?.slice(0, 14)}…</div>
                  </div>
                </div>
                {!isPast && (
                  <button
                    className="btn-danger-sm"
                    onClick={() => setCancelTarget(b)}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Ban size={13} /> Cancel
                  </button>
                )}
                {isPast && <span className="obt-past-label">Past</span>}
              </div>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <OwnerCancelModal
          booking={cancelTarget}
          onConfirm={handleOwnerCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ turfs, requests }) {
  const approved = turfs.filter((t) => t.status === "approved");
  const pending  = requests.filter((t) => t.status === "pending");
  const stats = [
    { label: "Approved Turfs",   value: approved.length, Icon: Building2,    color: "primary" },
    { label: "Pending Requests", value: pending.length,  Icon: Clock,        color: "accent" },
    { label: "Total Listings",   value: turfs.length,    Icon: ClipboardList, color: "gray" },
  ];

  return (
    <div>
      <div className="owner-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`owner-stat-card ${s.color}`}>
            <s.Icon size={22} className="owner-stat-icon-svg" />
            <span className="owner-stat-value">{s.value}</span>
            <span className="owner-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      {approved.length === 0 ? (
        <div className="empty-state">
          <Building2 size={40} strokeWidth={1.5} style={{ marginBottom: 12, color: "var(--text-secondary)" }} />
          <p>No approved turfs yet. Submit one from Add Turf.</p>
        </div>
      ) : (
        <div>
          <h3 style={{ margin: "24px 0 12px", fontWeight: 700 }}>Your Live Turfs</h3>
          <div className="owner-turf-cards">
            {approved.map((t) => (
              <div key={t.id} className="owner-turf-card">
                {t.imageUrl && <img src={t.imageUrl} alt={t.turfName} className="owner-turf-img" onError={(e) => e.target.style.display = "none"} />}
                <div className="owner-turf-info">
                  <h4>{t.turfName}</h4>
                  <p>{t.city} · ₹{t.pricePerHour}/hr</p>
                  <div className="mtr-chips" style={{ marginTop: 6 }}>
                    {(t.sports || []).slice(0, 3).map(s => <span key={s} className="mtr-chip sport">{s}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Turfs Tab ────────────────────────────────────────────────────────────────────
function MyTurfsTab({ turfs }) {
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState("");
  const approved = turfs.filter((t) => t.status === "approved");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  async function handleDelete(turf) {
    const confirmed = window.confirm(
      `⚠️ Delete "${turf.turfName || turf.name}"?\n\n` +
      `This will permanently remove:\n` +
      `• The turf listing\n` +
      `• All bookings (future ones get 80% refund)\n` +
      `• All reviews and blocked slots\n\n` +
      `This action CANNOT be undone.`
    );
    if (!confirmed) return;
    const doubleConfirm = window.confirm(`Are you absolutely sure you want to delete "${turf.turfName || turf.name}"?`);
    if (!doubleConfirm) return;

    setDeletingId(turf.id);
    try {
      await deleteTurfCascade(turf.id, turf.turfName || turf.name);
      setSelected(null);
      showToast(`✅ "${turf.turfName || turf.name}" has been deleted and all data cleaned up.`);
    } catch (err) {
      showToast(`❌ Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (approved.length === 0) {
    return (
      <div className="empty-state">
        <Building2 size={40} strokeWidth={1.5} style={{ marginBottom: 12, color: "var(--text-secondary)" }} />
        <p>No approved turfs yet. Submit one from <strong>Add Turf</strong>.</p>
      </div>
    );
  }

  return (
    <div>
      {toast && <div className="admin-toast" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>}

      {/* Edit modal */}
      {editTarget && (
        <EditTurfModal
          turf={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            showToast(`✅ "${editTarget.name || editTarget.turfName}" updated successfully!`);
            setEditTarget(null);
            // If we were viewing slots for this turf, reset so updated data shows
            if (selected?.id === editTarget.id) setSelected(null);
          }}
        />
      )}

      {!selected ? (
        <div className="owner-turf-cards">
          {approved.map((t) => {
            const isDeleting = deletingId === t.id;
            const coverImg = (Array.isArray(t.imageUrls) && t.imageUrls.length > 0)
              ? t.imageUrls[0]
              : t.imageUrl || null;
            return (
              <div key={t.id} className="owner-turf-card" style={{ position: "relative" }}>
                {coverImg && (
                  <img
                    src={coverImg}
                    alt={t.turfName}
                    className="owner-turf-img"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
                <div className="owner-turf-info" style={{ flex: 1 }}>
                  <h4>{t.turfName}</h4>
                  <p>{t.city} · ₹{t.pricePerHour}/slot · {t.openingTime}–{t.closingTime}</p>
                  <div className="mtr-chips" style={{ marginTop: 6 }}>
                    {(t.sports || []).slice(0, 3).map(s => <span key={s} className="mtr-chip sport">{s}</span>)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-outline-sm"
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                    onClick={() => setSelected(t)}
                    disabled={isDeleting}
                  >
                    View Slots <ChevronRight size={13} />
                  </button>
                  <button
                    className="btn-outline-sm"
                    style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", borderColor: "var(--accent)" }}
                    onClick={() => setEditTarget(t)}
                    disabled={isDeleting}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className="btn-danger-sm"
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                    onClick={() => handleDelete(t)}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? <><RefreshCw size={13} className="spin" /> Deleting…</>
                      : <><Trash2 size={13} /> Delete</>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button className="btn-outline" onClick={() => setSelected(null)}>
              ← Back to Turfs
            </button>
            <button
              className="btn-outline-sm"
              style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", borderColor: "var(--accent)" }}
              onClick={() => setEditTarget(selected)}
            >
              <Pencil size={13} /> Edit This Turf
            </button>
          </div>
          <h3 style={{ fontWeight: 800, marginBottom: 4 }}>{selected.turfName}</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: "0.875rem" }}>
            {selected.city} · {selected.openingTime}–{selected.closingTime}
          </p>
          <TurfSlotsView turf={selected} />
        </div>
      )}
    </div>
  );
}

// ── Requests Tab ──────────────────────────────────────────────────────────────
function RequestsTab({ requests }) {
  const STATUS_CONFIG = {
    pending:  { label: "Pending Review", color: "pending",  Icon: Clock },
    approved: { label: "Approved",       color: "approved", Icon: CheckCircle2 },
    rejected: { label: "Rejected",       color: "rejected", Icon: X },
  };
  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (requests.length === 0) {
    return <div className="empty-state"><ClipboardList size={40} strokeWidth={1.5} style={{ marginBottom: 12, color: "var(--text-secondary)" }} /><p>No turf requests submitted yet.</p></div>;
  }

  return (
    <div className="mtr-list">
      {requests.map((req) => {
        const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
        return (
          <div key={req.id} className="mtr-card">
            <div className="mtr-card-header">
              <div>
                <h3 className="mtr-turf-name">{req.turfName}</h3>
                <span className="mtr-city">{req.city}</span>
              </div>
              <span className={`mtr-status-badge ${cfg.color}`}>
                <cfg.Icon size={12} /> {cfg.label}
              </span>
            </div>
            <div className="mtr-info-grid">
              <div className="mtr-info-item"><span>Price</span><strong>₹{req.pricePerHour}/hr</strong></div>
              <div className="mtr-info-item"><span>Hours</span><strong>{req.openingTime}–{req.closingTime}</strong></div>
              <div className="mtr-info-item"><span>Submitted</span><strong>{fmtDate(req.submittedAt)}</strong></div>
            </div>
            {req.status === "rejected" && req.rejectionReason && (
              <div className="mtr-rejection-box">
                <strong>Reason:</strong>
                <p>{req.rejectionReason}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ currentUser }) {
  return (
    <div className="owner-profile">
      <div className="owner-profile-avatar">{(currentUser.displayName || "O")[0].toUpperCase()}</div>
      <h3>{currentUser.displayName || "Owner"}</h3>
      <p style={{ color: "var(--gray-400)", marginBottom: 24 }}>{currentUser.email}</p>
      <div className="owner-profile-badge"><CheckCircle2 size={14} /> Verified Turf Owner</div>
      <div className="owner-profile-info">
        <div className="owner-profile-row"><span>Email</span><strong>{currentUser.email}</strong></div>
        <div className="owner-profile-row"><span>Account Type</span><strong>Turf Owner</strong></div>
        <div className="owner-profile-row"><span>UID</span><strong style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{currentUser.uid}</strong></div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [turfs, setTurfs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let done = 0;
    const maybeDone = () => { if (++done >= 2) setLoading(false); };
    const unsub1 = subscribeToOwnerTurfs(currentUser.uid, (data) => { setTurfs(data); maybeDone(); }, maybeDone);
    const unsub2 = subscribeToUserRequests(currentUser.uid, (data) => { setRequests(data); maybeDone(); }, maybeDone);
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (loading) return <LoadingSpinner text="Loading your dashboard…" />;

  const activeItem = NAV_ITEMS.find((n) => n.key === activeTab);

  return (
    <div className="owner-dashboard">
      {/* Sidebar */}
      <aside className="owner-sidebar">
        <div className="owner-sidebar-brand">
          <Building2 size={20} /> TurfBook <span>Owner</span>
        </div>
        <nav className="owner-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`owner-nav-item ${activeTab === item.key ? "active" : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              <item.Icon size={17} className="owner-nav-icon" />
              {item.label}
            </button>
          ))}
        </nav>
        <button className="owner-nav-logout" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="owner-main">
        <div className="owner-main-header">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {activeItem && <activeItem.Icon size={22} />} {activeItem?.label}
            </h1>
            <p className="owner-main-subtitle">
              {activeTab === "overview"  && `Welcome back, ${currentUser.displayName || "Owner"}!`}
              {activeTab === "turfs"     && "View and manage your approved turfs with booking slots"}
              {activeTab === "bookings"  && "View all user bookings and cancel if needed (80% refund to user)"}
              {activeTab === "add"       && "Submit a new turf listing for admin review"}
              {activeTab === "requests"  && "Track the status of your turf listing submissions"}
              {activeTab === "profile"   && "Your owner account details"}
            </p>
          </div>
        </div>

        <div className="owner-content">
          {activeTab === "overview"  && <OverviewTab turfs={turfs} requests={requests} />}
          {activeTab === "turfs"     && <MyTurfsTab turfs={turfs} />}
          {activeTab === "bookings"  && <BookingsTab turfs={turfs} currentUser={currentUser} />}
          {activeTab === "add"       && <AddTurfRequest embeddedMode />}
          {activeTab === "requests"  && <RequestsTab requests={requests} />}
          {activeTab === "profile"   && <ProfileTab currentUser={currentUser} />}
        </div>
      </main>
    </div>
  );
}
