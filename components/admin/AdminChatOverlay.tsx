"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChatAdmin } from "@/lib/use-chat-admin";
import styles from "./AdminChatOverlay.module.css";
import type { ChatLogResponse, ChatMessage } from "@/types/accounting";

export interface AdminChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AdminChatOverlay({ isOpen, onClose }: AdminChatOverlayProps) {
    const {
        chats,
        loading,
        error,
        sendReply,
        refresh,
        getMessagesForSession,
        total,
    } = useChatAdmin({
        pollingInterval: 15000,
        autoStart: isOpen,
    });

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const selectedChat = selectedSessionId ? chats.find(c => c.sessionId === selectedSessionId) : null;
    const messages = selectedChat && selectedSessionId ? getMessagesForSession(selectedSessionId) : [];

    // Scroll to bottom when messages update
    useEffect(() => {
        if (messagesEndRef.current && isOpen) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleSendReply = useCallback(async () => {
        if (!selectedSessionId || !replyMessage.trim() || sending) return;

        try {
            setSending(true);
            await sendReply(selectedSessionId, replyMessage.trim());
            setReplyMessage("");
        } catch (err) {
            console.error("Error sending reply:", err);
            alert("Не вдалося надіслати відповідь.");
        } finally {
            setSending(false);
        }
    }, [selectedSessionId, replyMessage, sendReply, sending]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <header className={styles.header}>
                <h2><span>💬</span> Підтримка користувачів</h2>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
                    &times;
                </button>
            </header>

            <div className={styles.container}>
                {/* Sessions List */}
                <aside className={styles.sessionsList}>
                    <div className={styles.listHeader}>
                        <h3 className="text-sm font-semibold text-gray-700">Активні чати</h3>
                        <div className="flex items-center gap-2">
                            <span className={styles.totalCount}>{total}</span>
                            <button
                                className={styles.refreshBtn}
                                onClick={refresh}
                                disabled={loading}
                            >
                                {loading ? "..." : "↻"}
                            </button>
                        </div>
                    </div>

                    <div className={styles.listContent}>
                        {chats.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Чати відсутні
                            </div>
                        ) : (
                            chats.map((chat) => {
                                const lastMsg = chat.messages[chat.messages.length - 1];
                                const isActive = chat.sessionId === selectedSessionId;
                                const isUnread = lastMsg?.role === "user";

                                return (
                                    <button
                                        key={chat.sessionId}
                                        className={`${styles.sessionItem} ${isActive ? styles.activeSession : ""}`}
                                        onClick={() => setSelectedSessionId(chat.sessionId)}
                                    >
                                        <div className={styles.sessionTop}>
                                            <span className={styles.sessionId}>
                                                {chat.deviceId.substring(0, 8)}
                                            </span>
                                            {isUnread && <span className={styles.unreadDot} />}
                                        </div>
                                        <p className={styles.lastMsg}>{lastMsg?.content || "Немає повідомлень"}</p>
                                        <span className={styles.time}>
                                            {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' }) : ""}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Chat Content */}
                <main className={styles.chatContent}>
                    {selectedChat ? (
                        <>
                            <div className={styles.messages}>
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.operatorRow}`}
                                    >
                                        <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.operatorBubble}`}>
                                            {msg.role === "operator" && (
                                                <div className={styles.adminName}>
                                                    🎧 {msg.adminName || "Адміністратор"}
                                                </div>
                                            )}
                                            <p>{msg.content}</p>
                                            <span className={styles.msgTime}>
                                                {new Date(msg.timestamp).toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={styles.inputArea}>
                                <div className={styles.inputWrapper}>
                                    <textarea
                                        className={styles.textarea}
                                        placeholder="Введіть повідомлення..."
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        disabled={sending}
                                    />
                                    <button
                                        className={styles.sendBtn}
                                        onClick={handleSendReply}
                                        disabled={sending || !replyMessage.trim()}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>💬</div>
                            <p>Оберіть сесію для відповіді</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default AdminChatOverlay;
