// @ts-ignore
import osc from "osc";
import { AppConfig } from "./config";

export class VRChatOSCClient {
  private udpPort: any;
  private isReady: boolean = false;
  private lastChatboxSendTime: number = 0;
  private pendingChatboxText: string | null = null;
  private chatboxTimer: NodeJS.Timeout | null = null;

  constructor(private config: AppConfig) {
    this.udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: 0, // bind to an ephemeral port
      remoteAddress: this.config.vrchat.oscHost,
      remotePort: this.config.vrchat.oscPort,
      metadata: true,
    });

    this.udpPort.on("error", (err: Error) => {
      console.error("[OSC] Error:", err.message);
    });
  }

  public open(): Promise<void> {
    return new Promise((resolve) => {
      this.udpPort.on("ready", () => {
        this.isReady = true;
        console.log(
          `[OSC] Ready. Target VRChat at ${this.config.vrchat.oscHost}:${this.config.vrchat.oscPort}`
        );
        resolve();
      });

      this.udpPort.open();
    });
  }

  public sendHeartRate(bpm: number): void {
    if (!this.isReady) {
      return;
    }

    if (bpm === 0 && this.config.heartrate.skipZero) {
      console.log("[OSC] Got heart rate 0 bpm, skipping parameter update...");
      return;
    }

    // Parameters compatible with vrc-osc-miband-hrm:
    // 1. Heartrate: float from -1 to 1 (bpm / 127 - 1)
    const heartrateFloat = bpm / 127.0 - 1.0;
    // 2. Heartrate2: float from 0 to 1 (bpm / 255)
    const heartrateFloat01 = bpm / 255.0;
    // 3. Heartrate3: int from 0 to 255 (bpm)
    const heartrateInt = Math.round(bpm);

    this.udpPort.send({
      address: "/avatar/parameters/Heartrate",
      args: [{ type: "f", value: heartrateFloat }],
    });

    this.udpPort.send({
      address: "/avatar/parameters/Heartrate2",
      args: [{ type: "f", value: heartrateFloat01 }],
    });

    this.udpPort.send({
      address: "/avatar/parameters/Heartrate3",
      args: [{ type: "i", value: heartrateInt }],
    });

    if (this.config.chatbox.enabled) {
      this.queueChatboxMessage(bpm);
    }
  }

  private queueChatboxMessage(bpm: number): void {
    const text = this.config.chatbox.template.replace("{HR}", String(bpm)) + "    ";
    this.pendingChatboxText = text;

    const now = Date.now();
    const interval = this.config.chatbox.minIntervalMs;
    const elapsed = now - this.lastChatboxSendTime;

    if (elapsed >= interval) {
      this.sendChatboxNow();
    } else if (!this.chatboxTimer) {
      const waitTime = interval - elapsed;
      this.chatboxTimer = setTimeout(() => {
        this.chatboxTimer = null;
        this.sendChatboxNow();
      }, waitTime);
    }
  }

  private sendChatboxNow(): void {
    if (!this.pendingChatboxText || !this.isReady) return;

    const text = this.pendingChatboxText;
    this.pendingChatboxText = null;
    this.lastChatboxSendTime = Date.now();

    this.udpPort.send({
      address: "/chatbox/input",
      args: [
        { type: "s", value: text },
        { type: "T", value: true }, // Immediate display
      ],
    });
  }

  public close(): void {
    if (this.chatboxTimer) {
      clearTimeout(this.chatboxTimer);
      this.chatboxTimer = null;
    }
    if (this.isReady) {
      this.udpPort.close();
      this.isReady = false;
      console.log("[OSC] Closed connection.");
    }
  }
}
