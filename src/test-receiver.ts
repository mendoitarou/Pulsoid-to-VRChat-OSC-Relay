// @ts-ignore
import osc from "osc";

const PORT = 9000;
console.log(`[Mock VRChat OSC] Starting OSC Receiver on UDP port ${PORT}...`);

const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: PORT,
  metadata: true,
});

udpPort.on("message", (oscMsg: any) => {
  console.log(`[Mock VRChat OSC Received] Address: ${oscMsg.address}, Args:`, JSON.stringify(oscMsg.args));
});

udpPort.on("error", (err: Error) => {
  console.error("[Mock VRChat OSC] Error:", err.message);
});

udpPort.on("ready", () => {
  console.log(`[Mock VRChat OSC] Listening for OSC packets on port ${PORT}. Ready!`);
});

udpPort.open();
