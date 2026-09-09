// @ts-ignore
import osc from "osc";
import WebSocket from "ws";
import { VRChatOSCClient } from "./osc";
import { PulsoidClient } from "./pulsoid";

async function runE2ETest() {
  console.log("=== Starting E2E Integration Test ===");

  const receivedAddresses: Set<string> = new Set();
  let receivedHeartrateCount = 0;

  // 1. Start Mock VRChat OSC Receiver on port 9000
  const oscReceiver = new osc.UDPPort({
    localAddress: "127.0.0.1",
    localPort: 9000,
    metadata: true,
  });

  await new Promise<void>((resolve) => {
    oscReceiver.on("ready", () => {
      console.log("[Test VRChat OSC] Listening on UDP 9000");
      resolve();
    });
    oscReceiver.on("message", (msg: any) => {
      console.log(`[Test VRChat OSC Received] ${msg.address} ->`, JSON.stringify(msg.args));
      receivedAddresses.add(msg.address);
      if (msg.address.startsWith("/avatar/parameters/Heartrate")) {
        receivedHeartrateCount++;
      }
    });
    oscReceiver.open();
  });

  // 2. Start Mock Pulsoid WS Server on port 8080
  const wsServer = new WebSocket.Server({ port: 8080 });
  console.log("[Test Pulsoid WS Server] Listening on ws://127.0.0.1:8080");

  wsServer.on("connection", (client) => {
    console.log("[Test Pulsoid WS Server] Client connected. Sending test heart rate: 85 BPM...");
    client.send(
      JSON.stringify({
        measured_at: Date.now(),
        data: {
          heart_rate: 85,
        },
      })
    );
  });

  // 3. Start Bridge Client
  const config = {
    pulsoid: {
      token: "TEST_TOKEN",
      customWsUrl: "ws://127.0.0.1:8080",
    },
    vrchat: {
      oscHost: "127.0.0.1",
      oscPort: 9000,
    },
    chatbox: {
      enabled: true,
      template: "❤{HR} bpm",
      minIntervalMs: 1300,
    },
    heartrate: {
      skipZero: true,
    },
  };

  const oscClient = new VRChatOSCClient(config);
  await oscClient.open();

  const pulsoidClient = new PulsoidClient(config.pulsoid.token, config.pulsoid.customWsUrl);

  pulsoidClient.onHeartRate((bpm) => {
    console.log(`[Bridge Client] Received BPM: ${bpm}, sending to OSC...`);
    oscClient.sendHeartRate(bpm);
  });

  pulsoidClient.connect();

  // 4. Wait for messages to be received
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 5. Cleanup
  pulsoidClient.disconnect();
  oscClient.close();
  oscReceiver.close();
  wsServer.close();

  // 6. Assertions
  console.log("\n=== Test Results ===");
  const expectedAddresses = [
    "/avatar/parameters/Heartrate",
    "/avatar/parameters/Heartrate2",
    "/avatar/parameters/Heartrate3",
    "/chatbox/input",
  ];

  let success = true;
  for (const addr of expectedAddresses) {
    if (receivedAddresses.has(addr)) {
      console.log(`✅ Received expected OSC address: ${addr}`);
    } else {
      console.error(`❌ Missing expected OSC address: ${addr}`);
      success = false;
    }
  }

  if (success) {
    console.log("\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("\n💥 E2E TEST FAILED: Not all OSC addresses were received.");
    process.exit(1);
  }
}

runE2ETest().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exit(1);
});
