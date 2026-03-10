"use client";

import { useState, useCallback } from "react";
import { useChatAdmin } from "@/lib/use-chat-admin";
import type { ChatLogResponse, ChatMessage } from "@/types/accounting";
import styles from "./ChatAdminPanel.module.css";

export interface ChatAdminPanelProps {
  /** Base URL for API (defaults to window.location.origin) */
  baseUrl?: string;
  /** Polling interval in ms (default: 30000) */
  pollingInterval?: number;
  /** Custom class name */
  className?: string;
}

export function ChatAdminPanel({
  baseUrl,
  pollingInterval = 30000,
  className = "",
}: ChatAdminPanelProps) {
  const {
    chats,
    loading,
    error,
    sendReply,
    refresh,
    getMessagesForSession,
    total,
  } = useChatAdmin({
    baseUrl,
    pollingInterval,
    adminModeOnly: true,
    autoStart: true,
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  const selectedChat = selectedSessionId ? chats.find(c => c.sessionId === selectedSessionId) : null;
  const messages = selectedChat && selectedSessionId ? getMessagesForSession(selectedSessionId) : [];

  const handleSendReply = useCallback(async () => {
    if (!selectedSessionId || !replyMessage.trim()) return;

    try {
      setSending(true);
      await sendReply(selectedSessionId, replyMessage.trim());
      setReplyMessage("");
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Не вдалося надіслати відповідь. Спробуйте ще раз.");
    } finally {
      setSending(false);
    }
  }, [selectedSessionId, replyMessage, sendReply]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className={`${styles.adminPanel} ${className}`}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <h2>Active Chats</h2>
            <span className={styles.totalBadge}>{total}</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className={styles.refreshBtn}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm">
            <p className="font-semibold">Error</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        )}

        <div className={styles.chatList}>
          {loading && chats.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading sessions...</div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No active chats</div>
          ) : (
            chats.map((chat) => {
              const lastMessage = chat.messages[chat.messages.length - 1];
              const isSelected = chat.sessionId === selectedSessionId;
              const hasUnread = lastMessage?.role === "user";

              return (
                <button
                  key={chat.sessionId}
                  onClick={() => setSelectedSessionId(chat.sessionId)}
                  className={`${styles.chatItem} ${isSelected ? styles.activeItem : ""}`}
                >
                  <div className={styles.itemTop}>
                    <span className={styles.deviceId}>
                      {chat.deviceId.substring(0, 12)}...
                    </span>
                    {hasUnread && <span className={styles.unreadDot} />}
                  </div>
                  <p className={styles.lastMsgPreview}>
                    {lastMessage?.content || "No messages"}
                  </p>
                  <span className={styles.itemTime}>
                    {lastMessage?.timestamp
                      ? new Date(lastMessage.timestamp).toLocaleTimeString("uk-UA", {
                        hour: '2-digit', minute: '2-digit'
                      })
                      : ""}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.mainContent}>
        {selectedSessionId && selectedChat ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.sessionIdInfo}>Session ID: {selectedSessionId}</div>
            </div>

            <div className={styles.messagesContainer}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.operatorRow}`}
                >
                  <div
                    className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.operatorBubble
                      }`}
                  >
                    {msg.role === "operator" && (
                      <div className={styles.operatorLabel}>
                        🎧 {msg.adminName || "Administrator"}
                      </div>
                    )}
                    <div className={styles.msgContent}>{msg.content}</div>
                    <span className={styles.msgTime}>
                      {new Date(msg.timestamp).toLocaleString("uk-UA")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.replyArea}>
              <div className={styles.replyInputWrapper}>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  className={styles.textarea}
                  disabled={sending}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyMessage.trim()}
                  className={styles.sendBtn}
                >
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.nothingSelected}>
            <div className={styles.emptyIcon}>💬</div>
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatAdminPanel;
