import WebSocket from "ws";

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`[Mock Pulsoid WS] Server listening on ws://localhost:${PORT}`);

server.on("connection", (ws) => {
  console.log("[Mock Pulsoid WS] Client connected!");
  let hr = 70;

  const interval = setInterval(() => {
    // fluctuate HR between 65 and 110
    hr += Math.floor(Math.random() * 5) - 2;
    if (hr < 65) hr = 65;
    if (hr > 110) hr = 110;

    const payload = {
      measured_at: Date.now(),
      data: {
        heart_rate: hr,
      },
    };

    if (ws.readyState === WebSocket.OPEN) {
      console.log(`[Mock Pulsoid WS] Sending BPM: ${hr}`);
      ws.send(JSON.stringify(payload));
    }
  }, 1000);

  ws.on("close", () => {
    console.log("[Mock Pulsoid WS] Client disconnected.");
    clearInterval(interval);
  });
});
