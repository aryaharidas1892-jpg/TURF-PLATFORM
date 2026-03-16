// src/components/ChatModal.jsx
import { useEffect, useRef, useState } from "react";
import {
    getChatRoomId,
    sendMessage,
    subscribeToMessages,
    ensureChatRoom,
    deleteChat,
} from "../services/chatService";

export default function ChatModal({ currentUser, otherPlayer, onClose }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const bottomRef = useRef(null);

    const roomId = getChatRoomId(currentUser.uid, otherPlayer.uid);

    // Ensure room document exists with participant metadata
    useEffect(() => {
        ensureChatRoom(roomId,
            { uid: currentUser.uid, displayName: currentUser.displayName },
            { uid: otherPlayer.uid, displayName: otherPlayer.full_name }
        ).catch(console.error);
    }, [roomId, currentUser, otherPlayer]);

    // Subscribe to real-time messages
    useEffect(() => {
        const unsubscribe = subscribeToMessages(roomId, setMessages);
        return () => unsubscribe();
    }, [roomId]);

    // Auto-scroll to the latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    async function handleSend(e) {
        e.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await sendMessage(
                roomId,
                currentUser.uid,
                currentUser.displayName || "Me",
                text
            );
            setText("");
        } catch (err) {
            console.error("Failed to send message:", err);
        }
        setSending(false);
    }

    async function handleDeleteChat() {
        setDeleting(true);
        try {
            await deleteChat(roomId);
            onClose(); // close modal after deletion
        } catch (err) {
            console.error("Failed to delete chat:", err);
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    function formatTime(ts) {
        if (!ts) return "";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }

    return (
        <div className="chat-overlay" onClick={onClose}>
            <div className="chat-modal" onClick={(e) => e.stopPropagation()}>

                {/* Delete confirmation banner */}
                {confirmDelete && (
                    <div className="chat-delete-confirm">
                        <span>🗑️ Delete this entire conversation?</span>
                        <div className="chat-delete-actions">
                            <button
                                className="chat-delete-cancel"
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="chat-delete-yes"
                                onClick={handleDeleteChat}
                                disabled={deleting}
                            >
                                {deleting ? "Deleting…" : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="chat-header">
                    <div className="chat-header-info">
                        <div className="chat-avatar">
                            {otherPlayer.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                            <strong>{otherPlayer.full_name}</strong>
                            <span className="chat-online-badge">● Online</span>
                        </div>
                    </div>
                    <div className="chat-header-actions">
                        <button
                            className="chat-delete-btn"
                            onClick={() => setConfirmDelete(true)}
                            title="Delete conversation"
                            aria-label="Delete conversation"
                        >
                            🗑️
                        </button>
                        <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.length === 0 && (
                        <div className="chat-empty">
                            <span>👋</span>
                            <p>Say hello to {otherPlayer.full_name}!</p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isMine = msg.senderUid === currentUser.uid;
                        return (
                            <div key={msg.id} className={`chat-bubble-wrap ${isMine ? "mine" : "theirs"}`}>
                                {!isMine && (
                                    <div className="chat-bubble-name">{msg.senderName}</div>
                                )}
                                <div className={`chat-bubble ${isMine ? "mine" : "theirs"}`}>
                                    <span className="chat-bubble-text">{msg.text}</span>
                                    <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form className="chat-input-row" onSubmit={handleSend}>
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type a message..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        autoFocus
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        className="chat-send-btn"
                        disabled={!text.trim() || sending}
                        aria-label="Send"
                    >
                        ➤
                    </button>
                </form>
            </div>
        </div>
    );
}
