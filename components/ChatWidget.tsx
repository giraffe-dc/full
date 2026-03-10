"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/types/accounting";
import styles from "./ChatWidget.module.css";

export interface ChatWidgetProps {
  /** API endpoint for sending messages */
  apiUrl?: string;
  /** Session ID (auto-generated if not provided) */
  sessionId?: string;
  /** Device ID (auto-generated if not provided) */
  deviceId?: string;
  /** Chat mode: 'admin', 'bot', or 'mixed' */
  mode?: "admin" | "bot" | "mixed";
  /** Polling interval in ms (default: 60000 = 1 minute) */
  pollingInterval?: number;
  /** Admin name to display for operator messages */
  adminLabel?: string;
  /** User name to display */
  userLabel?: string;
  /** Custom class name */
  className?: string;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate a unique device ID (stored in localStorage)
 */
function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "dev_unknown";

  let deviceId = localStorage.getItem("chat_device_id");
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("chat_device_id", deviceId);
  }
  return deviceId;
}

export function ChatWidget({
  apiUrl,
  sessionId: propSessionId,
  deviceId: propDeviceId,
  mode = "admin",
  pollingInterval = 60000,
  adminLabel = "🎧 Адміністратор",
  userLabel = "Ви",
  className = "",
}: ChatWidgetProps) {
  const [sessionId] = useState(() => propSessionId || generateSessionId());
  const [deviceId] = useState(() => propDeviceId || getOrCreateDeviceId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const baseUrl = apiUrl || (typeof window !== "undefined" ? window.location.origin : "");

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          deviceId,
          message,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: "user",
          content: message,
          timestamp: result.timestamp || new Date().toISOString(),
        },
      ]);

      setInputMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Не вдалося надіслати повідомлення. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, sessionId, deviceId, mode]);

  // Poll messages
  const pollMessages = useCallback(async () => {
    try {
      const url = new URL(`${baseUrl}/api/chat/poll`);
      url.searchParams.set("sessionId", sessionId);
      if (lastTimestampRef.current) {
        url.searchParams.set("lastTimestamp", lastTimestampRef.current);
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to poll messages");
      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const existingTimestamps = new Set(prev.map(m => m.timestamp));
          const newMessages = data.messages.filter(
            (m: ChatMessage) => !existingTimestamps.has(m.timestamp)
          );

          if (newMessages.length > 0 && !isOpen) {
            setUnreadCount(prev => prev + newMessages.length);
          }

          return [...prev, ...newMessages];
        });

        if (data.lastTimestamp) {
          lastTimestampRef.current = data.lastTimestamp;
        }
      }
    } catch (err) {
      console.error("Error polling messages:", err);
    }
  }, [baseUrl, sessionId, isOpen]);

  useEffect(() => {
    pollMessages();
    pollingRef.current = setInterval(pollMessages, pollingInterval);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [pollMessages, pollingInterval]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !loading) {
      sendMessage(inputMessage.trim());
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setUnreadCount(0);
  };

  return (
    <div className={`${styles.chatWrapper} ${className}`}>
      {/* Toggle button */}
      <button
        onClick={toggleOpen}
        className={styles.toggleBtn}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
        {unreadCount > 0 && (
          <span className={styles.unreadBadge}>{unreadCount}</span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className={styles.window}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>💬</div>
            <div className={styles.headerInfo}>
              <h3>Підтримка Giraffe</h3>
              <div className={styles.statusText}>
                <span className={styles.statusDot} /> Онлайн
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messagesArea}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✨</div>
                <p><b>Привіт! 👋</b><br />Напишіть ваше питання, і наш адміністратор відповість вам найближчим часом.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.operatorRow}`}
                >
                  <div
                    className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.operatorBubble
                      }`}
                  >
                    {msg.role === "operator" && (
                      <div className={styles.operatorName}>
                        {adminLabel}
                      </div>
                    )}
                    <div className={styles.content}>{msg.content}</div>
                    <span className={styles.msgTime}>
                      {new Date(msg.timestamp).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Введіть повідомлення..."
                className={styles.inputField}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className={styles.sendBtn}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
