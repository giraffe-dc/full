/**
 * Client for external Chat API
 * Used to connect to external admin panel or bot (e.g., Telegram)
 * 
 * API Documentation:
 * - GET /api/admin/chat-logs - Get chat sessions and messages
 * - POST /api/admin/chat-logs/reply - Send admin reply to a chat session
 */

import type { ChatLogResponse, ChatLogsResponse, ChatMessage } from "@/types/accounting";

export interface ChatApiClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface SendReplyParams {
  sessionId: string;
  message: string;
  adminName?: string;
}

export interface FetchChatsParams {
  limit?: number;
  sessionId?: string;
}

export class ChatApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ChatApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  /**
   * Fetch chat logs from local proxy API
   */
  async fetchChats(params?: FetchChatsParams): Promise<ChatLogsResponse> {
    const url = new URL(`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/chat-proxy`);

    if (params?.limit) {
      url.searchParams.set("limit", params.limit.toString());
    }
    if (params?.sessionId) {
      url.searchParams.set("sessionId", params.sessionId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send reply to a chat session through proxy
   */
  async sendReply(params: SendReplyParams): Promise<{ success: boolean; message: string }> {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/chat-proxy`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: params.sessionId,
        message: params.message,
        adminName: params.adminName || "Адміністратор",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get only admin mode chats
   */
  async fetchAdminChats(params?: FetchChatsParams): Promise<ChatLogResponse[]> {
    const result = await this.fetchChats(params);
    return result.logs.filter(log => log.mode === "admin");
  }
}

/**
 * Create a configured chat API client instance
 * Now points to internal proxy route by default
 */
export function createChatApiClient(baseUrl?: string): ChatApiClient {
  // Use current origin if no baseUrl provided
  const defaultBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return new ChatApiClient({
    baseUrl: baseUrl || defaultBaseUrl,
    apiKey: "", // No longer needed on frontend
  });
}

// Default export with default configuration
export default createChatApiClient;
