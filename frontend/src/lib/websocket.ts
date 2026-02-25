const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type WSMessage = {
  type: string;
  [key: string]: unknown;
};

export function createWishlistSocket(
  wishlistId: string,
  onMessage: (msg: WSMessage) => void,
  options: { token?: string; shareToken?: string } = {}
): { close: () => void } {
  let ws: WebSocket | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let retries = 0;
  let closed = false;

  function connect() {
    if (closed) return;

    const url = new URL(`${WS_URL}/ws/${wishlistId}`);

    // Prefer explicit token, fallback to localStorage
    const token = options.token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
    if (token) {
      url.searchParams.append("token", token);
    }

    if (options.shareToken) {
      url.searchParams.append("share_token", options.shareToken);
    }

    ws = new WebSocket(url.toString());

    ws.onopen = () => {
      retries = 0;
      pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        if (msg.type !== "pong") {
          onMessage(msg);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (pingInterval) clearInterval(pingInterval);
      if (!closed && retries < 5) {
        const delay = Math.min(1000 * Math.pow(2, retries), 16000);
        retries++;
        reconnectTimeout = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    },
  };
}
