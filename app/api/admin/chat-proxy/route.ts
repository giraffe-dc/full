import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for external chat API
 * This keeps the API key secure on the server and avoids CORS issues.
 */
export async function GET(req: NextRequest) {
    const externalUrl = process.env.NEXT_PUBLIC_CHAT_EXTERNAL_URL;
    const apiKey = process.env.NOTIFICATIONS_API_KEY;

    if (!externalUrl || !apiKey) {
        return NextResponse.json(
            { error: "Server configuration missing (URL or API Key)" },
            { status: 500 }
        );
    }

    // Get search params from the incoming request
    const { searchParams } = new URL(req.url);
    const targetUrl = new URL(`${externalUrl}/api/admin/chat-logs`);

    // Forward all search params
    searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    // Always ensure the key is present
    targetUrl.searchParams.set("key", apiKey);

    try {
        const response = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || `External API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Chat Proxy GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch from external chat API" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const externalUrl = process.env.NEXT_PUBLIC_CHAT_EXTERNAL_URL;
    const apiKey = process.env.NOTIFICATIONS_API_KEY;

    if (!externalUrl || !apiKey) {
        return NextResponse.json(
            { error: "Server configuration missing (URL or API Key)" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const targetUrl = `${externalUrl}/api/admin/chat-logs/reply`;

        // Ensure API key is injected from server-side env
        const proxyBody = {
            ...body,
            key: apiKey,
        };

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(proxyBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || `External API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Chat Proxy POST Error:", error);
        return NextResponse.json(
            { error: "Failed to post to external chat API" },
            { status: 500 }
        );
    }
}
