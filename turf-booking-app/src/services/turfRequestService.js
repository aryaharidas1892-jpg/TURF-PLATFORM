// src/services/turfRequestService.js
import { db } from "../firebase/firebase";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";

const REQUESTS = "turf_requests";
const TURFS = "turfs";

/** Submit a new turf listing request */
export async function submitTurfRequest(user, formData) {
    await addDoc(collection(db, REQUESTS), {
        // Submitter
        submittedById: user.uid,
        submittedByEmail: user.email || "",
        submittedByName: user.displayName || "User",
        // Form data
        ...formData,
        // Workflow
        status: "pending",
        rejectionReason: "",
        submittedAt: serverTimestamp(),
        reviewedAt: null,
    });
}

/** Real-time listener for logged-in user's own requests.
 *  Note: no orderBy here to avoid needing a composite Firestore index;
 *  we sort client-side instead.
 */
export function subscribeToUserRequests(userId, callback, onError) {
    const q = query(
        collection(db, REQUESTS),
        where("submittedById", "==", userId)
    );
    return onSnapshot(
        q,
        (snap) => {
            const docs = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .sort((a, b) => {
                    const ta = a.submittedAt?.toMillis?.() ?? 0;
                    const tb = b.submittedAt?.toMillis?.() ?? 0;
                    return tb - ta; // newest first
                });
            callback(docs);
        },
        (err) => {
            console.error("subscribeToUserRequests error:", err);
            if (onError) onError(err);
        }
    );
}

/** Real-time listener for all requests (admin) */
export function subscribeToAllRequests(callback, onError) {
    // Single-field orderBy is fine — Firestore auto-indexes single fields.
    const q = query(collection(db, REQUESTS), orderBy("submittedAt", "desc"));
    return onSnapshot(
        q,
        (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
            console.error("subscribeToAllRequests error:", err);
            if (onError) onError(err);
        }
    );
}

/** Approve a request: update status and write turf to `turfs` collection */
export async function approveRequest(requestId, requestData) {
    // Build the turf document from the request data
    const turfDoc = {
        name: requestData.turfName,
        description: requestData.description,
        price_per_slot: Number(requestData.pricePerHour), // Fixed: matched property name required by UI
        address: requestData.address,
        city: requestData.city,
        location: `${requestData.address}, ${requestData.city}`,
        mapsLink: requestData.mapsLink || "",
        openingTime: requestData.openingTime,
        closingTime: requestData.closingTime,
        sports: requestData.sports || [],
        amenities: requestData.amenities || [],
        imageUrl: requestData.image_url || requestData.imageUrl || "",
        imageUrls: requestData.imageUrls || (requestData.imageUrl ? [requestData.imageUrl] : []),
        ownerName: requestData.ownerName,
        ownerPhone: requestData.ownerPhone,
        ownerEmail: requestData.ownerEmail,
        rating: 0,
        reviewCount: 0,
        addedAt: serverTimestamp(),
        requestId,
    };

    // Add the turf document (use requestId as turfId for traceability)
    await setDoc(doc(db, TURFS, requestId), turfDoc);

    // Mark request as approved
    await updateDoc(doc(db, REQUESTS, requestId), {
        status: "approved",
        rejectionReason: "",
        reviewedAt: serverTimestamp(),
    });
}

/** Reject a request with a reason */
export async function rejectRequest(requestId, reason) {
    await updateDoc(doc(db, REQUESTS, requestId), {
        status: "rejected",
        rejectionReason: reason.trim(),
        reviewedAt: serverTimestamp(),
    });
}
