// src/pages/AddTurfRequest.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitTurfRequest } from "../services/turfRequestService";

// Cloudinary config (free image hosting — no paid plan needed)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const SPORTS_LIST = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Volleyball", "Hockey", "Kabaddi"];
const AMENITIES_LIST = ["Parking", "Changing Rooms", "Floodlights", "Washrooms", "Drinking Water", "Cafeteria", "First Aid", "CCTV Security"];

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_COUNT = 5;

const INITIAL = {
    turfName: "", description: "",
    pricePerHour: "",
    address: "", city: "", mapsLink: "",
    openingTime: "06:00", closingTime: "22:00",
    sports: [], amenities: [],
    imageFiles: [], imagePreviews: [],
    ownerName: "", ownerPhone: "", ownerEmail: "",
};

function toggle(arr, val) {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

/** Upload image to Cloudinary (free tier — no paid plan needed) */
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
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Upload failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.secure_url;
}

export default function AddTurfRequest({ embeddedMode = false }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [uploadStatus, setUploadStatus] = useState(""); // progress text

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    function validate() {
        const required = ["turfName", "description", "pricePerHour", "address", "city", "openingTime", "closingTime", "ownerName", "ownerPhone", "ownerEmail"];
        for (const k of required) {
            if (!form[k]?.toString().trim()) {
                setError(`Please fill in: ${k.replace(/([A-Z])/g, " $1")}`);
                return false;
            }
        }
        if (form.sports.length === 0) { setError("Select at least one sport."); return false; }
        if (form.amenities.length === 0) { setError("Select at least one amenity."); return false; }
        if (isNaN(Number(form.pricePerHour)) || Number(form.pricePerHour) <= 0) {
            setError("Enter a valid price per hour."); return false;
        }
        if (!/^\d{10}$/.test(form.ownerPhone.replace(/\s/g, ""))) {
            setError("Enter a valid 10-digit phone number."); return false;
        }
        setError(""); return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        setUploadStatus("");
        try {
            const imageUrls = [];
            const failedUploads = [];

            // Upload each image to Cloudinary
            if (form.imageFiles.length > 0) {
                for (let i = 0; i < form.imageFiles.length; i++) {
                    const file = form.imageFiles[i];
                    setUploadStatus(`Uploading image ${i + 1} of ${form.imageFiles.length}…`);
                    try {
                        const url = await uploadToCloudinary(file);
                        imageUrls.push(url);
                    } catch (uploadErr) {
                        console.error(`Image ${i + 1} upload failed:`, uploadErr.message);
                        failedUploads.push(file.name);
                    }
                }
            }

            // Warn user if images failed but still allow submission
            if (failedUploads.length > 0 && imageUrls.length === 0 && form.imageFiles.length > 0) {
                const proceed = window.confirm(
                    `⚠️ All ${failedUploads.length} image(s) failed to upload.\n\n` +
                    `Please check your Cloudinary credentials in the .env file.\n\n` +
                    `Do you still want to submit without images?`
                );
                if (!proceed) {
                    setSubmitting(false);
                    setUploadStatus("");
                    setError(`Image upload failed for: ${failedUploads.join(", ")}. Check Cloudinary config in .env file.`);
                    return;
                }
            } else if (failedUploads.length > 0) {
                setUploadStatus(`⚠️ ${failedUploads.length} image(s) failed, ${imageUrls.length} succeeded. Continuing…`);
            }

            setUploadStatus("Submitting request…");
            const { imageFiles, imagePreviews, ...restForm } = form;
            await submitTurfRequest(currentUser, {
                ...restForm,
                imageUrls,
                imageUrl: imageUrls[0] || "", // backward compat
            });
            setSubmitted(true);
        } catch (err) {
            setError("Failed to submit: " + err.message);
        } finally {
            setSubmitting(false);
            setUploadStatus("");
        }
    }

    if (submitted) {
        const inner = (
            <div className="atr-success">
                <div className="atr-success-icon">🏟️</div>
                <h2>Request Submitted!</h2>
                <p>Thank you! Our team will review your turf listing and get back to you. This usually takes 1–3 business days.</p>
                {!embeddedMode && (
                    <div className="atr-success-actions">
                        <Link to="/my-turf-requests" className="btn-primary">View My Requests</Link>
                        <Link to="/" className="btn-outline">Go Home</Link>
                    </div>
                )}
            </div>
        );
        return embeddedMode ? inner : <div className="page-container">{inner}</div>;
    }

    const content = (
        <>
            {!embeddedMode && (
                <div className="page-header">
                    <h1>List Your Turf 🏟️</h1>
                    <p>Fill in the details below — our team will review and add your turf to the platform.</p>
                </div>
            )}
            <form className="atr-form" onSubmit={handleSubmit} noValidate>

                {/* Basic Info */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📋 Basic Information</h2>
                    <div className="form-group">
                        <label>Turf Name *</label>
                        <input type="text" placeholder="e.g. Green Arena Sports Club" value={form.turfName} onChange={(e) => set("turfName", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Description *</label>
                        <textarea rows={3} placeholder="Describe your turf — surface type, size, features..." value={form.description} onChange={(e) => set("description", e.target.value)} />
                    </div>
                </div>

                {/* Pricing */}
                <div className="atr-section">
                    <h2 className="atr-section-title">💰 Pricing</h2>
                    <div className="form-group">
                        <label>Price per Hour (₹) *</label>
                        <input type="number" min="1" placeholder="e.g. 800" value={form.pricePerHour} onChange={(e) => set("pricePerHour", e.target.value)} />
                    </div>
                </div>

                {/* Location */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📍 Location</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Address *</label>
                            <input type="text" placeholder="Street / Area / Landmark" value={form.address} onChange={(e) => set("address", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>City *</label>
                            <input type="text" placeholder="e.g. Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Google Maps Link <span className="optional-label">(optional)</span></label>
                        <input type="url" placeholder="https://maps.google.com/..." value={form.mapsLink} onChange={(e) => set("mapsLink", e.target.value)} />
                    </div>
                </div>

                {/* Timings */}
                <div className="atr-section">
                    <h2 className="atr-section-title">🕐 Operating Hours</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Opening Time *</label>
                            <input type="time" value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Closing Time *</label>
                            <input type="time" value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Sports */}
                <div className="atr-section">
                    <h2 className="atr-section-title">⚽ Sports Available *</h2>
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
                    <h2 className="atr-section-title">🏗️ Amenities Available *</h2>
                    <div className="atr-checkbox-grid">
                        {AMENITIES_LIST.map((a) => (
                            <label key={a} className={`atr-checkbox-item ${form.amenities.includes(a) ? "checked" : ""}`}>
                                <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => set("amenities", toggle(form.amenities, a))} />
                                {a}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Media — OPTIONAL */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📸 Turf Photos <span className="optional-label">(optional)</span></h2>
                    <div className="form-group">
                        <label>
                            Upload Photos
                            <span className="optional-label"> (JPEG, PNG, or WebP · max {MAX_IMAGE_SIZE_MB}MB each · up to {MAX_IMAGE_COUNT} photos)</span>
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                                const selectedFiles = Array.from(e.target.files);
                                const validFiles = [];
                                const rejectedNames = [];

                                selectedFiles.forEach((file) => {
                                    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                                        rejectedNames.push(`${file.name} (exceeds ${MAX_IMAGE_SIZE_MB}MB)`);
                                    } else {
                                        validFiles.push(file);
                                    }
                                });

                                if (rejectedNames.length > 0) {
                                    setError(`These files were too large and skipped: ${rejectedNames.join(", ")}`);
                                } else {
                                    setError("");
                                }

                                // Merge with existing, cap at MAX_IMAGE_COUNT
                                const combined = [...form.imageFiles, ...validFiles].slice(0, MAX_IMAGE_COUNT);
                                const previews = combined.map((f) => URL.createObjectURL(f));
                                set("imageFiles", combined);
                                set("imagePreviews", previews);
                                // reset input so same files can be re-added after removal
                                e.target.value = "";
                            }}
                        />
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 6 }}>
                            {form.imageFiles.length}/{MAX_IMAGE_COUNT} photo{form.imageFiles.length !== 1 ? "s" : ""} selected
                        </p>
                    </div>

                    {/* Preview gallery */}
                    {form.imagePreviews.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8 }}>Preview:</p>
                            <div className="atr-img-gallery">
                                {form.imagePreviews.map((src, idx) => (
                                    <div key={idx} className="atr-img-gallery-item">
                                        <img src={src} alt={`Turf photo ${idx + 1}`} className="atr-img-preview" />
                                        <button
                                            type="button"
                                            className="atr-img-remove-btn"
                                            onClick={() => {
                                                const newFiles = form.imageFiles.filter((_, i) => i !== idx);
                                                const newPreviews = form.imagePreviews.filter((_, i) => i !== idx);
                                                set("imageFiles", newFiles);
                                                set("imagePreviews", newPreviews);
                                            }}
                                            title="Remove photo"
                                        >
                                            ✕
                                        </button>
                                        {idx === 0 && <span className="atr-img-primary-badge">Cover</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Contact */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📞 Owner / Contact Details</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Owner Name *</label>
                            <input type="text" placeholder="Full name" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" placeholder="10-digit mobile" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Owner Email *</label>
                        <input type="email" placeholder="owner@example.com" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
                    </div>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}
                {uploadStatus && <div className="alert alert-info">⏳ {uploadStatus}</div>}

                <div className="atr-disclaimer">
                    <span>🔒</span>
                    <p>By submitting, you confirm that all details are accurate and the turf is genuine. Fraudulent submissions will be permanently banned.</p>
                </div>

                <button type="submit" className="btn-pay" disabled={submitting}>
                    {submitting ? (uploadStatus || "Submitting Request…") : "Submit Turf Listing Request →"}
                </button>
            </form>
        </>
    );

    return embeddedMode ? content : <div className="page-container">{content}</div>;
}
