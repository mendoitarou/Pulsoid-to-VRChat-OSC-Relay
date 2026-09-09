import { exec } from "child_process";

export interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface TokenSuccessResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export function openBrowser(url: string): void {
  try {
    const cmd =
      process.platform === "darwin"
        ? `open "${url}"`
        : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, () => {});
  } catch {
    // Silently ignore if not in GUI environment
  }
}

export async function initiateDeviceAuth(clientId: string): Promise<DeviceAuthResponse> {
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    scope: "data:heart_rate:read",
  });

  const res = await fetch("https://pulsoid.net/oauth2/device_authorization", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to initiate device auth (${res.status}): ${errorText}`);
  }

  return (await res.json()) as DeviceAuthResponse;
}

export async function pollForToken(
  clientId: string,
  deviceCode: string,
  intervalSeconds: number = 3,
  expiresInSeconds: number = 600
): Promise<string> {
  const startTime = Date.now();
  const timeoutMs = expiresInSeconds * 1000;
  const pollIntervalMs = Math.max(2000, intervalSeconds * 1000);

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const params = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: clientId.trim(),
    });

    const res = await fetch("https://pulsoid.net/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (res.ok) {
      const data = (await res.json()) as TokenSuccessResponse;
      return data.access_token;
    }

    const errData: any = await res.json().catch(() => ({}));
    const error = errData.error || "";

    if (error === "authorization_pending") {
      process.stdout.write(".");
      continue;
    }

    if (error === "invalid_grant") {
      const desc = errData.error_description || "";
      if (desc.includes("user didn't grant access")) {
        throw new Error("Authorization rejected: User denied access in the browser.");
      }
      if (desc.includes("access token already issued")) {
        throw new Error("Authorization error: Token was already issued for this code.");
      }
      throw new Error(`Invalid grant: ${desc || "Unknown error"}`);
    }

    if (error === "expired_token") {
      throw new Error("Authorization timeout: The device code has expired. Please try again.");
    }

    throw new Error(`OAuth error (${res.status}): ${error} - ${errData.error_description || ""}`);
  }

  throw new Error("Device authorization timed out. Please try again.");
}

export async function runDeviceAuthFlow(clientId: string): Promise<string> {
  console.log("\n[OAuth] Requesting device authorization from Pulsoid...");
  const authData = await initiateDeviceAuth(clientId);

  const authUrl = authData.verification_uri_complete || `${authData.verification_uri}?user_code=${authData.user_code}`;

  console.log("\n=======================================================");
  console.log("            PULSOID OAUTH AUTHORIZATION");
  console.log("=======================================================");
  console.log("Please authorize this application by visiting:");
  console.log(`👉 \x1b[36m${authUrl}\x1b[0m\n`);
  console.log(`User Code: \x1b[33m${authData.user_code}\x1b[0m`);
  console.log("=======================================================");
  console.log("Attempting to open your browser automatically...");
  openBrowser(authUrl);

  process.stdout.write("Waiting for authorization in browser");
  const token = await pollForToken(
    clientId,
    authData.device_code,
    authData.interval || 3,
    authData.expires_in || 600
  );

  console.log("\n✅ Authorization successful! Access token obtained.");
  return token;
}
