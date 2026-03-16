// src/components/ChatInbox.jsx
import { useEffect, useState } from "react";
import { subscribeToUserChats } from "../services/chatService";

export default function ChatInbox({ currentUser, onOpenChat }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToUserChats(currentUser.uid, (chats) => {
            setConversations(chats);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser.uid]);

    function getOtherName(chat) {
        const otherUid = chat.participants?.find((uid) => uid !== currentUser.uid);
        return chat.names?.[otherUid] || "Unknown Player";
    }

    function getOtherUid(chat) {
        return chat.participants?.find((uid) => uid !== currentUser.uid);
    }

    function formatTime(ts) {
        if (!ts) return "";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        return isToday
            ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }

    if (loading) return null;
    if (conversations.length === 0) return null;

    return (
        <div className="inbox-section">
            <div className="inbox-header">
                <h3>💬 Messages <span className="inbox-count">{conversations.length}</span></h3>
                <p>Conversations from other players</p>
            </div>
            <div className="inbox-list">
                {conversations.map((chat) => {
                    const otherName = getOtherName(chat);
                    const otherUid = getOtherUid(chat);
                    const isMine = chat.lastMessageSenderUid === currentUser.uid;

                    return (
                        <div key={chat.id} className="inbox-item">
                            <div className="inbox-avatar">
                                {otherName[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="inbox-info">
                                <div className="inbox-name">{otherName}</div>
                                <div className="inbox-preview">
                                    {isMine && <span className="inbox-you">You: </span>}
                                    {chat.lastMessage}
                                </div>
                            </div>
                            <div className="inbox-meta">
                                <span className="inbox-time">
                                    {formatTime(chat.lastMessageAt)}
                                </span>
                                <button
                                    className="btn-reply"
                                    onClick={() =>
                                        onOpenChat({
                                            uid: otherUid,
                                            full_name: otherName,
                                        })
                                    }
                                >
                                    Reply
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
