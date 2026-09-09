import readline from "readline";
import { loadConfig, saveConfig } from "./config";
import { VRChatOSCClient } from "./osc";
import { PulsoidClient } from "./pulsoid";
import { getWidgetReadToken } from "./widget";
import { runDeviceAuthFlow } from "./auth";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function resolvePulsoidToken(config: any): Promise<string> {
  // 1. Direct token if already configured
  if (
    config.pulsoid.token &&
    config.pulsoid.token !== "YOUR_PULSOID_TOKEN_HERE" &&
    config.pulsoid.token.trim() !== ""
  ) {
    return config.pulsoid.token;
  }

  // 2. Free Widget URL / ID mode (100% Free, no BRO plan, no OAuth credentials required)
  const rawWidget = config.pulsoid.widgetUrlOrId?.trim() || "";
  const isValidWidgetInput =
    rawWidget !== "" &&
    !rawWidget.includes("YOUR_WIDGET_ID");

  if (isValidWidgetInput) {
    console.log("[Setup] Fetching real-time streaming token from your Pulsoid Widget...");
    const token = await getWidgetReadToken(rawWidget);
    console.log("✅ Successfully connected to your Pulsoid Widget!");
    return token;
  }

  // 3. User's own OAuth Client ID (if explicitly provided)
  if (config.pulsoid.clientId && config.pulsoid.clientId.trim() !== "") {
    console.log("[Setup] Authenticating with your custom Pulsoid Client ID...");
    const token = await runDeviceAuthFlow(config.pulsoid.clientId);
    config.pulsoid.token = token;
    saveConfig(config);
    return token;
  }

  // 4. Prompt user for Widget URL
  console.log("\n=======================================================");
  console.log("             PULSOID SETUP (100% FREE)");
  console.log("=======================================================");
  console.log("No BRO subscription or API registration needed!");
  console.log("You can use any Pulsoid Widget URL (used in OBS overlays):");
  console.log("1. Open https://pulsoid.net/ui/widgets in your browser.");
  console.log("2. Create or copy a Widget URL (e.g. https://pulsoid.net/widget/view/xxxx-xxxx).");
  console.log("3. Paste the Widget URL below:\n");

  const widgetUrl = await askQuestion("Enter your Pulsoid Widget URL: ");
  if (!widgetUrl) {
    console.error("Widget URL was not entered. Exiting...");
    process.exit(1);
  }

  config.pulsoid.widgetUrlOrId = widgetUrl;
  console.log("\n[Setup] Connecting to widget...");
  const token = await getWidgetReadToken(widgetUrl);
  saveConfig(config);
  console.log("✅ Widget verified! Configuration saved to config.json.\n");
  return token;
}

async function main() {
  console.log("==================================================");
  console.log("    Pulsoid to VRChat OSC Relay (vrc-osc-hrm)");
  console.log("==================================================");

  const config = loadConfig();

  let token = "";
  if (!config.pulsoid.customWsUrl) {
    try {
      token = await resolvePulsoidToken(config);
    } catch (err: any) {
      console.error(`\n[Setup Error] ${err.message}`);
      process.exit(1);
    }
  }

  // 1. Initialize OSC Client for VRChat
  const oscClient = new VRChatOSCClient(config);
  await oscClient.open();

  // 2. Initialize Pulsoid Client
  const pulsoidClient = new PulsoidClient(token, config.pulsoid.customWsUrl);

  pulsoidClient.onHeartRate((bpm, measuredAt) => {
    const timeStr = new Date(measuredAt).toLocaleTimeString();
    const hr1 = (bpm / 127 - 1).toFixed(3);
    const hr2 = (bpm / 255).toFixed(3);
    console.log(
      `[${timeStr}] ❤️  Heart Rate: ${bpm} BPM | OSC Sent (Float: ${hr1}, Float01: ${hr2}, Int: ${bpm})`
    );
    oscClient.sendHeartRate(bpm);
  });

  pulsoidClient.onStatus((status, message) => {
    console.log(`[Status] Pulsoid: ${status}${message ? ` (${message})` : ""}`);
  });

  pulsoidClient.connect();

  // Graceful shutdown
  const cleanup = () => {
    console.log("\n[Shutdown] Stopping service...");
    pulsoidClient.disconnect();
    oscClient.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
