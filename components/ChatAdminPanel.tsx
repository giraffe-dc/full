"use client";

import { useState, useCallback } from "react";
import { useChatAdmin } from "@/lib/use-chat-admin";
import type { ChatLogResponse, ChatMessage } from "@/types/accounting";

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
    <div className={`flex h-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Chat list */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Чати</h2>
            <span className="text-sm text-gray-500">{total} всього</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="mt-2 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            {loading ? "Оновлення..." : "↻ Оновити"}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm">
            <p className="font-medium">Помилка</p>
            <p>{error}</p>
          </div>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading && chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Завантаження...
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Немає активних чатів
            </div>
          ) : (
            <ul>
              {chats.map((chat) => {
                const lastMessage = chat.messages[chat.messages.length - 1];
                const isSelected = chat.sessionId === selectedSessionId;
                const hasUnread = lastMessage?.role === "user";

                return (
                  <li key={chat.sessionId}>
                    <button
                      onClick={() => setSelectedSessionId(chat.sessionId)}
                      className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-green-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-800 truncate">
                          {chat.deviceId.substring(0, 12)}...
                        </span>
                        {hasUnread && (
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {lastMessage?.content || "Немає повідомлень"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {lastMessage?.timestamp
                          ? new Date(lastMessage.timestamp).toLocaleString("uk-UA")
                          : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Chat messages and reply */}
      <div className="flex-1 flex flex-col">
        {selectedSessionId && selectedChat ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-green-600 text-white"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {msg.role === "operator" && msg.adminName && (
                      <div className="text-xs text-green-600 font-medium mb-1">
                        🎧 {msg.adminName}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`text-xs mt-1 ${
                      msg.role === "user" ? "text-green-100" : "text-gray-400"
                    }`}>
                      {new Date(msg.timestamp).toLocaleString("uk-UA")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500">
                  Сесія: {selectedSessionId}
                </span>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введіть відповідь..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                  rows={3}
                  disabled={sending}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyMessage.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                >
                  {sending ? "Відправка..." : "Відправити"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Оберіть чат зі списку
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatAdminPanel;
