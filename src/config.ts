import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  pulsoid: {
    widgetUrlOrId?: string;
    token?: string;
    clientId?: string;
    customWsUrl?: string;
  };
  vrchat: {
    oscHost: string;
    oscPort: number;
  };
  chatbox: {
    enabled: boolean;
    template: string;
    minIntervalMs: number;
  };
  heartrate: {
    skipZero: boolean;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  pulsoid: {
    widgetUrlOrId: "",
    token: "",
  },
  vrchat: {
    oscHost: "127.0.0.1",
    oscPort: 9000,
  },
  chatbox: {
    enabled: false,
    template: "❤{HR} bpm",
    minIntervalMs: 1300,
  },
  heartrate: {
    skipZero: true,
  },
};

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

export function loadConfig(): AppConfig {
  let fileConfig: Partial<AppConfig> = {};

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch (err) {
      console.error(`[Config] Failed to parse ${CONFIG_PATH}:`, err);
    }
  } else {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
      console.log(`[Config] Created template config file at: ${CONFIG_PATH}`);
    } catch {
      // Ignored if read-only
    }
  }

  const config: AppConfig = {
    pulsoid: {
      widgetUrlOrId: process.env.PULSOID_WIDGET_URL || fileConfig.pulsoid?.widgetUrlOrId || DEFAULT_CONFIG.pulsoid.widgetUrlOrId,
      token: process.env.PULSOID_TOKEN || fileConfig.pulsoid?.token || DEFAULT_CONFIG.pulsoid.token,
      clientId: process.env.PULSOID_CLIENT_ID || fileConfig.pulsoid?.clientId,
      customWsUrl: process.env.PULSOID_CUSTOM_WS_URL || fileConfig.pulsoid?.customWsUrl,
    },
    vrchat: {
      oscHost: process.env.VRC_OSC_HOST || fileConfig.vrchat?.oscHost || DEFAULT_CONFIG.vrchat.oscHost,
      oscPort: Number(process.env.VRC_OSC_PORT) || fileConfig.vrchat?.oscPort || DEFAULT_CONFIG.vrchat.oscPort,
    },
    chatbox: {
      enabled: process.env.CHATBOX_ENABLED !== undefined
        ? process.env.CHATBOX_ENABLED === "true"
        : (fileConfig.chatbox?.enabled ?? DEFAULT_CONFIG.chatbox.enabled),
      template: process.env.CHATBOX_TEMPLATE || fileConfig.chatbox?.template || DEFAULT_CONFIG.chatbox.template,
      minIntervalMs: fileConfig.chatbox?.minIntervalMs ?? DEFAULT_CONFIG.chatbox.minIntervalMs,
    },
    heartrate: {
      skipZero: fileConfig.heartrate?.skipZero ?? DEFAULT_CONFIG.heartrate.skipZero,
    },
  };

  return config;
}

export function saveConfig(config: AppConfig): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    console.log(`[Config] Configuration saved to: ${CONFIG_PATH}`);
  } catch (err: any) {
    console.warn(`[Config] Could not write ${CONFIG_PATH}:`, err.message);
  }
}
