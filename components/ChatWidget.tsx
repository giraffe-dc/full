"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/types/accounting";

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

/**
 * Chat Widget component for website visitors
 * Allows users to send messages and receive replies from admin
 */
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
      
      // Add message to local state optimistically
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

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    try {
      const url = new URL(`${baseUrl}/api/chat/poll`);
      url.searchParams.set("sessionId", sessionId);
      if (lastTimestampRef.current) {
        url.searchParams.set("lastTimestamp", lastTimestampRef.current);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error("Failed to poll messages");
      }

      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          // Filter out duplicate messages
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

  // Start polling on mount
  useEffect(() => {
    // Initial poll
    pollMessages();
    
    // Set up polling interval
    pollingRef.current = setInterval(pollMessages, pollingInterval);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pollMessages, pollingInterval]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !loading) {
      sendMessage(inputMessage.trim());
    }
  };

  // Toggle chat window
  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat toggle button */}
      <button
        onClick={toggleOpen}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors relative"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-green-600 text-white px-4 py-3">
            <h3 className="font-semibold">Чат з адміністратором</h3>
            <p className="text-sm text-green-100">Онлайн</p>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <p>Ласкаво просимо!</p>
                <p>Напишіть ваше повідомлення, і ми відповімо найближчим часом.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-green-600 text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {msg.role === "operator" && (
                      <div className="text-xs text-green-600 font-medium mb-1">
                        {adminLabel}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`text-xs mt-1 ${
                      msg.role === "user" ? "text-green-100" : "text-gray-400"
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Введіть повідомлення..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
