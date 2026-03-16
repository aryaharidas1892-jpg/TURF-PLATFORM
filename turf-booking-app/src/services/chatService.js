// src/services/chatService.js
import { db } from "../firebase/firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    where,
    getDocs,
    deleteDoc,
    writeBatch,
} from "firebase/firestore";


/**
 * Generate a deterministic chat room ID from two user UIDs.
 * Sorting ensures both users get the same room ID regardless of who initiates.
 */
export function getChatRoomId(uid1, uid2) {
    return [uid1, uid2].sort().join("_");
}

/**
 * Ensure the chat room document exists with participant metadata.
 * Called whenever a conversation is opened, so both sides can query their chats.
 */
export async function ensureChatRoom(roomId, user1, user2) {
    // user1 / user2 = { uid, displayName }
    const roomRef = doc(db, "chats", roomId);
    await setDoc(
        roomRef,
        {
            participants: [user1.uid, user2.uid],
            names: {
                [user1.uid]: user1.displayName || "Player",
                [user2.uid]: user2.displayName || "Player",
            },
            updatedAt: serverTimestamp(),
        },
        { merge: true } // don't overwrite existing fields like lastMessage
    );
}

/**
 * Send a message and update the room's lastMessage metadata.
 */
export async function sendMessage(roomId, senderUid, senderName, text) {
    const trimmed = text.trim();
    const messagesRef = collection(db, "chats", roomId, "messages");
    await addDoc(messagesRef, {
        senderUid,
        senderName,
        text: trimmed,
        createdAt: serverTimestamp(),
    });

    // Update room-level last message preview
    const roomRef = doc(db, "chats", roomId);
    await setDoc(
        roomRef,
        {
            lastMessage: trimmed,
            lastMessageSenderUid: senderUid,
            lastMessageAt: serverTimestamp(),
        },
        { merge: true }
    );
}

/**
 * Subscribe to real-time messages in a chat room.
 * Returns an unsubscribe function to detach the listener.
 */
export function subscribeToMessages(roomId, callback) {
    const messagesRef = collection(db, "chats", roomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
        callback(messages);
    });
}

/**
 * Subscribe to all chat rooms that a user participates in.
 * Returns an unsubscribe function.
 */
export function subscribeToUserChats(userId, callback) {
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", userId)
    );
    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => c.lastMessage) // only show rooms with at least one message
            .sort((a, b) => {
                const ta = a.lastMessageAt?.toMillis?.() ?? 0;
                const tb = b.lastMessageAt?.toMillis?.() ?? 0;
                return tb - ta; // newest first
            });
        callback(chats);
    });
}

/**
 * Delete an entire chat conversation for both users.
 * Deletes all messages in the subcollection, then the parent room document.
 */
export async function deleteChat(roomId) {
    const messagesRef = collection(db, "chats", roomId, "messages");
    const snapshot = await getDocs(messagesRef);

    // Batch-delete all messages (Firestore limit: 500 ops per batch)
    const BATCH_SIZE = 400;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }

    // Delete the room document itself
    await deleteDoc(doc(db, "chats", roomId));
}
