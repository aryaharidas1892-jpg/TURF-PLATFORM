// src/pages/OwnerDashboard.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToOwnerTurfs } from "../services/ownerService";
import { subscribeToUserRequests } from "../services/turfRequestService";
import { subscribeToTurfBookings } from "../services/bookingService";
import { subscribeToBlockedSlots, blockSlotForOffline, unblockSlot } from "../services/slotService";
import AddTurfRequest from "./AddTurfRequest";
import LoadingSpinner from "../components/LoadingSpinner";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "turfs", label: "My Turfs", icon: "🏟️" },
  { key: "add", label: "Add Turf", icon: "➕" },
  { key: "requests", label: "My Requests", icon: "📋" },
  { key: "profile", label: "Profile", icon: "👤" },
];

// Generate all 1-hour time slots for a turf's operating hours
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
        <h3 style={{ marginBottom: 8 }}>🟠 Block Slot for Offline Booking</h3>
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
            🟠 Block Slot
          </button>
        </div>
      </div>
    </div>
  );
}

function TurfSlotsView({ turf }) {
  const [bookings, setBookings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockTarget, setBlockTarget] = useState(null); // { slot, dateStr }
  const [toggling, setToggling] = useState(null); // slot id being toggled
  const slots = generateSlots(turf.openingTime || "06:00", turf.closingTime || "22:00");

  // Generate next 7 days
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
    try {
      await blockSlotForOffline(turf.id, dateStr, fmt(h, m), note);
    } catch (err) { alert("Failed to block slot: " + err.message); }
    setToggling(null);
  }

  async function handleUnblock(slot, dateStr) {
    setToggling(`${dateStr}_${slot.startMin}`);
    const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const h = Math.floor(slot.startMin / 60), m = slot.startMin % 60;
    try {
      await unblockSlot(turf.id, dateStr, fmt(h, m));
    } catch (err) { alert("Failed to unblock slot: " + err.message); }
    setToggling(null);
  }

  function handleSlotClick(slot, dateStr) {
    const booked = isSlotBooked(bookings, dateStr, slot.startMin);
    const blocked = isSlotBlocked(blockedSlots, dateStr, slot.startMin);
    if (booked) return; // online booking — cannot change
    if (blocked) {
      if (window.confirm(`Unblock ${slot.label} on ${dateStr}? This will make it available for online booking.`)) {
        handleUnblock(slot, dateStr);
      }
    } else {
      setBlockTarget({ slot, dateStr });
    }
  }

  return (
    <div className="slots-container">
      {/* Stats */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div className="owner-stat-mini">
          <span>{totalBookings}</span><small>Online Bookings</small>
        </div>
        <div className="owner-stat-mini primary">
          <span>₹{totalRevenue}</span><small>Est. Revenue</small>
        </div>
        <div className="owner-stat-mini orange">
          <span>{offlineBlocked}</span><small>Offline Blocked</small>
        </div>
      </div>

      {/* Legend */}
      <div className="slots-legend">
        <span className="slot-chip available">🟢 Available</span>
        <span className="slot-chip booked">🔴 Online Booked</span>
        <span className="slot-chip offline">🟠 Blocked (Offline)</span>
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "6px 0 14px" }}>
        💡 Click <strong>any available slot</strong> to block it for an offline/walk-in customer. Click an 🟠 slot to unblock it.
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
                  title={
                    booked ? "Online booking — cannot change" :
                    blocked ? "Click to unblock (free up for online booking)" :
                    "Click to block for offline/walk-in customer"
                  }
                  onClick={() => !isToggling && handleSlotClick(slot, dateStr)}
                >
                  {isToggling ? "…" : slot.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Block Slot Modal */}
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

function OverviewTab({ turfs, requests }) {
  const approved = turfs.filter((t) => t.status === "approved");
  const pending = requests.filter((t) => t.status === "pending");
  const stats = [
    { label: "Approved Turfs", value: approved.length, icon: "🏟️", color: "primary" },
    { label: "Pending Requests", value: pending.length, icon: "🕐", color: "accent" },
    { label: "Total Listings", value: turfs.length, icon: "📋", color: "gray" },
  ];

  return (
    <div>
      <div className="owner-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`owner-stat-card ${s.color}`}>
            <span className="owner-stat-icon">{s.icon}</span>
            <span className="owner-stat-value">{s.value}</span>
            <span className="owner-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {approved.length === 0 ? (
        <div className="empty-state">
          <p>🏟️ You don't have any approved turfs yet.</p>
          <p style={{ fontSize: "0.875rem", color: "var(--gray-400)", marginTop: 8 }}>
            Submit a turf listing — once approved it will appear here.
          </p>
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

function MyTurfsTab({ turfs }) {
  const [selected, setSelected] = useState(null);
  const approved = turfs.filter((t) => t.status === "approved");

  if (approved.length === 0) {
    return (
      <div className="empty-state">
        <p>🏟️ No approved turfs yet. Submit one from <strong>Add Turf</strong>.</p>
      </div>
    );
  }

  return (
    <div>
      {!selected ? (
        <div className="owner-turf-cards">
          {approved.map((t) => (
            <div key={t.id} className="owner-turf-card clickable" onClick={() => setSelected(t)}>
              {t.imageUrl && <img src={t.imageUrl} alt={t.turfName} className="owner-turf-img" onError={(e) => e.target.style.display = "none"} />}
              <div className="owner-turf-info">
                <h4>{t.turfName}</h4>
                <p>{t.city} · ₹{t.pricePerHour}/hr · {t.openingTime}–{t.closingTime}</p>
                <div className="mtr-chips" style={{ marginTop: 6 }}>
                  {(t.sports || []).map(s => <span key={s} className="mtr-chip sport">{s}</span>)}
                </div>
              </div>
              <span className="owner-turf-view-btn">View Slots →</span>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button className="btn-outline" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>
            ← Back to Turfs
          </button>
          <h3 style={{ fontWeight: 800, marginBottom: 4 }}>{selected.turfName}</h3>
          <p style={{ color: "var(--gray-400)", marginBottom: 16, fontSize: "0.875rem" }}>{selected.city} · {selected.openingTime}–{selected.closingTime}</p>
          <TurfSlotsView turf={selected} />
        </div>
      )}
    </div>
  );
}

function RequestsTab({ requests }) {
  const STATUS_CONFIG = {
    pending: { label: "Pending Review", color: "pending", icon: "🕐" },
    approved: { label: "Approved", color: "approved", icon: "✅" },
    rejected: { label: "Rejected", color: "rejected", icon: "❌" },
  };
  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (requests.length === 0) {
    return <div className="empty-state"><p>📋 No turf requests submitted yet.</p></div>;
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
              <span className={`mtr-status-badge ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
            </div>
            <div className="mtr-info-grid">
              <div className="mtr-info-item"><span>Price</span><strong>₹{req.pricePerHour}/hr</strong></div>
              <div className="mtr-info-item"><span>Hours</span><strong>{req.openingTime}–{req.closingTime}</strong></div>
              <div className="mtr-info-item"><span>Submitted</span><strong>{fmtDate(req.submittedAt)}</strong></div>
            </div>
            {req.status === "rejected" && req.rejectionReason && (
              <div className="mtr-rejection-box">
                <strong>❌ Reason:</strong>
                <p>{req.rejectionReason}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProfileTab({ currentUser }) {
  return (
    <div className="owner-profile">
      <div className="owner-profile-avatar">
        {(currentUser.displayName || "O")[0].toUpperCase()}
      </div>
      <h3>{currentUser.displayName || "Owner"}</h3>
      <p style={{ color: "var(--gray-400)", marginBottom: 24 }}>{currentUser.email}</p>
      <div className="owner-profile-badge">✅ Verified Turf Owner</div>
      <div className="owner-profile-info">
        <div className="owner-profile-row">
          <span>Email</span>
          <strong>{currentUser.email}</strong>
        </div>
        <div className="owner-profile-row">
          <span>Account Type</span>
          <strong>Turf Owner</strong>
        </div>
        <div className="owner-profile-row">
          <span>UID</span>
          <strong style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{currentUser.uid}</strong>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="owner-dashboard">
      {/* Sidebar */}
      <aside className="owner-sidebar">
        <div className="owner-sidebar-brand">🏟️ TurfBook <span>Owner</span></div>
        <nav className="owner-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`owner-nav-item ${activeTab === item.key ? "active" : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="owner-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <button className="owner-nav-logout" onClick={handleLogout}>🚪 Logout</button>
      </aside>

      {/* Main Content */}
      <main className="owner-main">
        <div className="owner-main-header">
          <div>
            <h1>{NAV_ITEMS.find((n) => n.key === activeTab)?.icon} {NAV_ITEMS.find((n) => n.key === activeTab)?.label}</h1>
            <p className="owner-main-subtitle">
              {activeTab === "overview" && `Welcome back, ${currentUser.displayName || "Owner"}!`}
              {activeTab === "turfs" && "View and manage your approved turfs with booking slots"}
              {activeTab === "add" && "Submit a new turf listing for admin review"}
              {activeTab === "requests" && "Track the status of your turf listing submissions"}
              {activeTab === "profile" && "Your owner account details"}
            </p>
          </div>
        </div>

        <div className="owner-content">
          {activeTab === "overview" && <OverviewTab turfs={turfs} requests={requests} />}
          {activeTab === "turfs" && <MyTurfsTab turfs={turfs} />}
          {activeTab === "add" && <AddTurfRequest embeddedMode />}
          {activeTab === "requests" && <RequestsTab requests={requests} />}
          {activeTab === "profile" && <ProfileTab currentUser={currentUser} />}
        </div>
      </main>
    </div>
  );
}
