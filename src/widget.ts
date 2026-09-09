export function extractWidgetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/pulsoid\.net\/widget\/view\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export async function getWidgetReadToken(widgetUrlOrId: string): Promise<string> {
  const widgetId = extractWidgetId(widgetUrlOrId);

  const res = await fetch("https://pulsoid.net/v1/api/public/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rpc-method": "getWidget",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "getWidget",
      params: {
        widgetId: widgetId,
      },
      id: "1",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch widget data (HTTP ${res.status}): ${await res.text()}`);
  }

  const json: any = await res.json();
  if (json.error) {
    throw new Error(`Widget API error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  const token = json.result?.token;
  if (!token) {
    throw new Error("No access token found in widget response. Please verify your Widget URL / ID.");
  }

  return token;
}
