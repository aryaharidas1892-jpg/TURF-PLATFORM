// src/components/EditTurfModal.jsx
import { useState } from "react";
import { updateTurf } from "../services/turfService";
import { X, Save, Upload, Trash2 } from "lucide-react";

const SPORTS_LIST = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Volleyball", "Hockey", "Kabaddi"];
const AMENITIES_LIST = ["Parking", "Changing Rooms", "Floodlights", "Washrooms", "Drinking Water", "Cafeteria", "First Aid", "CCTV Security"];
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_COUNT = 5;

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "turf_images");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.secure_url;
}

function toggle(arr, val) {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export default function EditTurfModal({ turf, onClose, onSaved }) {
  const existingUrls = Array.isArray(turf.imageUrls) && turf.imageUrls.length > 0
    ? turf.imageUrls
    : turf.imageUrl ? [turf.imageUrl] : [];

  const [form, setForm] = useState({
    name: turf.name || turf.turfName || "",
    description: turf.description || "",
    price_per_slot: turf.price_per_slot ?? turf.pricePerHour ?? "",
    address: turf.address || "",
    city: turf.city || "",
    mapsLink: turf.mapsLink || "",
    openingTime: turf.openingTime || "06:00",
    closingTime: turf.closingTime || "22:00",
    sports: turf.sports || [],
    amenities: turf.amenities || [],
    imageUrls: existingUrls,          // kept existing URLs
    newImageFiles: [],                // new local files to upload
    newImagePreviews: [],             // blob preview URLs
  });

  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  /* ── Validation ── */
  function validate() {
    if (!form.name.trim()) { setError("Turf name is required."); return false; }
    if (!form.price_per_slot || isNaN(Number(form.price_per_slot)) || Number(form.price_per_slot) <= 0) {
      setError("Enter a valid price per slot."); return false;
    }
    if (!form.address.trim() || !form.city.trim()) { setError("Address and city are required."); return false; }
    if (form.sports.length === 0) { setError("Select at least one sport."); return false; }
    if (form.amenities.length === 0) { setError("Select at least one amenity."); return false; }
    setError(""); return true;
  }

  /* ── Remove an existing saved image ── */
  function removeExistingImage(idx) {
    set("imageUrls", form.imageUrls.filter((_, i) => i !== idx));
  }

  /* ── Pick new local image files ── */
  function handleNewImages(e) {
    const selected = Array.from(e.target.files);
    const valid = [];
    const rejected = [];
    selected.forEach((f) => {
      if (f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) rejected.push(f.name);
      else valid.push(f);
    });
    if (rejected.length) setError(`Too large (max ${MAX_IMAGE_SIZE_MB}MB): ${rejected.join(", ")}`);
    else setError("");

    const totalSlots = MAX_IMAGE_COUNT - form.imageUrls.length;
    const combined = [...form.newImageFiles, ...valid].slice(0, totalSlots);
    const previews = combined.map((f) => URL.createObjectURL(f));
    set("newImageFiles", combined);
    set("newImagePreviews", previews);
    e.target.value = "";
  }

  /* ── Remove a pending new image ── */
  function removeNewImage(idx) {
    set("newImageFiles", form.newImageFiles.filter((_, i) => i !== idx));
    set("newImagePreviews", form.newImagePreviews.filter((_, i) => i !== idx));
  }

  /* ── Save ── */
  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setUploadStatus("");

    try {
      // Upload any new images
      const uploadedUrls = [];
      for (let i = 0; i < form.newImageFiles.length; i++) {
        setUploadStatus(`Uploading image ${i + 1} of ${form.newImageFiles.length}…`);
        try {
          const url = await uploadToCloudinary(form.newImageFiles[i]);
          uploadedUrls.push(url);
        } catch (err) {
          console.error("Image upload failed:", err.message);
        }
      }

      const finalUrls = [...form.imageUrls, ...uploadedUrls];
      setUploadStatus("Saving changes…");

      await updateTurf(turf.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        price_per_slot: Number(form.price_per_slot),
        address: form.address.trim(),
        city: form.city.trim(),
        location: `${form.address.trim()}, ${form.city.trim()}`,
        mapsLink: form.mapsLink.trim(),
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        sports: form.sports,
        amenities: form.amenities,
        imageUrl: finalUrls[0] || "",
        imageUrls: finalUrls,
      });

      onSaved?.();
      onClose();
    } catch (err) {
      setError("Failed to save: " + err.message);
    } finally {
      setSaving(false);
      setUploadStatus("");
    }
  }

  const totalImages = form.imageUrls.length + form.newImageFiles.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal edit-turf-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: "95%", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.2rem", margin: 0 }}>✏️ Edit Turf</h2>
          <button className="disclaimer-close" onClick={onClose} disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} noValidate>

          {/* Basic Info */}
          <div className="atr-section">
            <h3 className="atr-section-title">📋 Basic Information</h3>
            <div className="form-group">
              <label>Turf Name *</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          {/* Pricing */}
          <div className="atr-section">
            <h3 className="atr-section-title">💰 Price per Slot (₹)</h3>
            <div className="form-group">
              <input
                type="number" min="1"
                value={form.price_per_slot}
                onChange={(e) => set("price_per_slot", e.target.value)}
              />
            </div>
          </div>

          {/* Hours */}
          <div className="atr-section">
            <h3 className="atr-section-title">🕐 Operating Hours</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Opening Time</label>
                <input type="time" value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Closing Time</label>
                <input type="time" value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="atr-section">
            <h3 className="atr-section-title">📍 Location</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Address *</label>
                <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="form-group">
                <label>City *</label>
                <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Google Maps Link <span className="optional-label">(optional)</span></label>
              <input type="url" placeholder="https://maps.google.com/..." value={form.mapsLink} onChange={(e) => set("mapsLink", e.target.value)} />
            </div>
          </div>

          {/* Sports */}
          <div className="atr-section">
            <h3 className="atr-section-title">⚽ Sports Available *</h3>
            <div className="atr-checkbox-grid">
              {SPORTS_LIST.map((sport) => (
                <label key={sport} className={`atr-checkbox-item ${form.sports.includes(sport) ? "checked" : ""}`}>
                  <input type="checkbox" checked={form.sports.includes(sport)} onChange={() => set("sports", toggle(form.sports, sport))} />
                  {sport}
                </label>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="atr-section">
            <h3 className="atr-section-title">🏗️ Amenities *</h3>
            <div className="atr-checkbox-grid">
              {AMENITIES_LIST.map((a) => (
                <label key={a} className={`atr-checkbox-item ${form.amenities.includes(a) ? "checked" : ""}`}>
                  <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => set("amenities", toggle(form.amenities, a))} />
                  {a}
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="atr-section">
            <h3 className="atr-section-title">📸 Photos <span className="optional-label">({totalImages}/{MAX_IMAGE_COUNT})</span></h3>

            {/* Existing images */}
            {form.imageUrls.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8 }}>Current photos:</p>
                <div className="atr-img-gallery">
                  {form.imageUrls.map((src, idx) => (
                    <div key={idx} className="atr-img-gallery-item">
                      <img src={src} alt={`Photo ${idx + 1}`} className="atr-img-preview"
                        onError={(e) => { e.target.style.opacity = 0.3; }} />
                      <button type="button" className="atr-img-remove-btn" onClick={() => removeExistingImage(idx)} title="Remove photo">
                        <Trash2 size={12} />
                      </button>
                      {idx === 0 && <span className="atr-img-primary-badge">Cover</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new images */}
            {totalImages < MAX_IMAGE_COUNT && (
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Upload size={14} /> Add Photos
                  <span className="optional-label">(JPEG/PNG/WebP · max {MAX_IMAGE_SIZE_MB}MB each)</span>
                </label>
                <input type="file" accept="image/*" multiple onChange={handleNewImages} />
              </div>
            )}

            {/* New image previews */}
            {form.newImagePreviews.length > 0 && (
              <div className="atr-img-gallery" style={{ marginTop: 8 }}>
                {form.newImagePreviews.map((src, idx) => (
                  <div key={idx} className="atr-img-gallery-item">
                    <img src={src} alt={`New photo ${idx + 1}`} className="atr-img-preview" />
                    <button type="button" className="atr-img-remove-btn" onClick={() => removeNewImage(idx)}>
                      <X size={12} />
                    </button>
                    <span className="atr-img-primary-badge" style={{ background: "var(--accent)" }}>New</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>}
          {uploadStatus && <div className="alert alert-info" style={{ marginBottom: 12 }}>⏳ {uploadStatus}</div>}

          {/* Actions */}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Save size={15} />
              {saving ? (uploadStatus || "Saving…") : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
