"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChatApiClient, createChatApiClient, type FetchChatsParams } from "@/lib/chat-api-client";
import type { ChatLogResponse, ChatMessage } from "@/types/accounting";

export interface UseChatAdminOptions {
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollingInterval?: number;
  /** Auto-start polling on mount (default: true) */
  autoStart?: boolean;
  /** Filter to only admin mode chats (default: true) */
  adminModeOnly?: boolean;
  /** Custom API key (uses env by default) */
  apiKey?: string;
  /** Custom base URL (uses window.location.origin by default) */
  baseUrl?: string;
}

export interface UseChatAdminReturn {
  /** List of chat sessions */
  chats: ChatLogResponse[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Send a reply to a chat session */
  sendReply: (sessionId: string, message: string, adminName?: string) => Promise<void>;
  /** Refresh chats manually */
  refresh: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Get messages for a specific session */
  getMessagesForSession: (sessionId: string) => ChatMessage[];
  /** Total number of chats */
  total: number;
}

/**
 * React hook for admin chat functionality
 * Connects to external chat API to fetch and reply to customer messages
 */
export function useChatAdmin(options: UseChatAdminOptions = {}): UseChatAdminReturn {
  const {
    pollingInterval = 30000,
    autoStart = true,
    adminModeOnly = true,
    apiKey,
    baseUrl,
  } = options;

  const [chats, setChats] = useState<ChatLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const clientRef = useRef<ChatApiClient | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize client
  useEffect(() => {
    try {
      clientRef.current = createChatApiClient(baseUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize chat client");
      setLoading(false);
    }
  }, [baseUrl]);

  // Fetch chats function
  const fetchChats = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const params: FetchChatsParams = { limit: 50 };
      const result = await clientRef.current.fetchChats(params);

      setTotal(result.total);

      let filteredLogs = result.logs;
      if (adminModeOnly) {
        filteredLogs = result.logs.filter(log => log.mode === "admin");
      }

      setChats(filteredLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch chats");
    } finally {
      setLoading(false);
    }
  }, [adminModeOnly]);

  // Send reply function
  const sendReply = useCallback(async (sessionId: string, message: string, adminName?: string) => {
    if (!clientRef.current) {
      throw new Error("Chat client not initialized");
    }

    await clientRef.current.sendReply({
      sessionId,
      message,
      adminName,
    });

    // Refresh chats after sending reply
    await fetchChats();
  }, [fetchChats]);

  // Get messages for a specific session
  const getMessagesForSession = useCallback((sessionId: string): ChatMessage[] => {
    const chat = chats.find(c => c.sessionId === sessionId);
    return chat?.messages || [];
  }, [chats]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchChats();
  }, [fetchChats]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      fetchChats();
    }, pollingInterval);
  }, [fetchChats, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Auto-start polling
  useEffect(() => {
    if (autoStart) {
      fetchChats();
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, fetchChats, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    chats,
    loading,
    error,
    sendReply,
    refresh,
    startPolling,
    stopPolling,
    getMessagesForSession,
    total,
  };
}

export default useChatAdmin;
