import WebSocket from "ws";

export interface PulsoidMessage {
  measured_at: number;
  data: {
    heart_rate: number;
  };
}

export type HeartRateCallback = (bpm: number, measuredAt: number) => void;
export type StatusCallback = (status: "connecting" | "connected" | "disconnected" | "error", message?: string) => void;

export class PulsoidClient {
  private ws: WebSocket | null = null;
  private token: string;
  private customWsUrl?: string;
  private isDestroyed: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private onHeartRateCallback?: HeartRateCallback;
  private onStatusCallback?: StatusCallback;

  constructor(token: string, customWsUrl?: string) {
    this.token = token.trim();
    this.customWsUrl = customWsUrl?.trim();
  }

  public onHeartRate(cb: HeartRateCallback): this {
    this.onHeartRateCallback = cb;
    return this;
  }

  public onStatus(cb: StatusCallback): this {
    this.onStatusCallback = cb;
    return this;
  }

  public connect(): void {
    if (this.isDestroyed) return;

    let url: string;
    if (this.customWsUrl) {
      url = this.customWsUrl;
    } else {
      if (!this.token || this.token === "YOUR_PULSOID_TOKEN_HERE") {
        const msg = "Pulsoid token is not configured. Please set your token in config.json or PULSOID_TOKEN environment variable.";
        console.error(`[Pulsoid] ${msg}`);
        this.onStatusCallback?.("error", msg);
        return;
      }
      url = `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${encodeURIComponent(this.token)}`;
    }

    this.onStatusCallback?.("connecting", `Connecting to ${this.customWsUrl ? this.customWsUrl : "Pulsoid real-time feed"}...`);
    console.log(`[Pulsoid] Connecting to WebSocket: ${this.customWsUrl || "wss://dev.pulsoid.net/..."}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        this.reconnectAttempts = 0;
        console.log("[Pulsoid] Connected! Streaming heart rate data...");
        this.onStatusCallback?.("connected", "Connected to Pulsoid");
      });

      this.ws.on("message", (raw: WebSocket.RawData) => {
        try {
          const payload = JSON.parse(raw.toString()) as PulsoidMessage;
          if (payload && payload.data && typeof payload.data.heart_rate === "number") {
            const bpm = payload.data.heart_rate;
            const measuredAt = payload.measured_at || Date.now();
            this.onHeartRateCallback?.(bpm, measuredAt);
          }
        } catch (err: any) {
          console.warn("[Pulsoid] Failed to parse message:", raw.toString(), err.message);
        }
      });

      this.ws.on("close", (code: number, reason: Buffer) => {
        const reasonStr = reason.toString() || "Unknown reason";
        console.warn(`[Pulsoid] Disconnected (code: ${code}, reason: ${reasonStr})`);
        this.onStatusCallback?.("disconnected", `Code: ${code}, Reason: ${reasonStr}`);
        this.scheduleReconnect();
      });

      this.ws.on("error", (err: Error) => {
        console.error(`[Pulsoid] Socket Error: ${err.message}`);
        this.onStatusCallback?.("error", err.message);
      });
    } catch (err: any) {
      console.error(`[Pulsoid] Connection init error: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;

    // Exponential backoff: 2s, 4s, 8s, up to 30s max
    const delay = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;

    console.log(`[Pulsoid] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})...`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    console.log("[Pulsoid] Disconnected client.");
  }
}
