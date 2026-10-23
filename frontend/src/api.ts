let token = "";
export function setToken(value: string) {
  token = value;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const multipart = body instanceof FormData;
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-demo-token": token,
      ...(body !== undefined && !multipart
        ? { "content-type": "application/json" }
        : {}),
    },
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  if (!r.ok) {
    let message = `Request failed (${r.status})`;
    try {
      const data = await r.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }
  return r.headers.get("content-type")?.includes("application/json")
    ? r.json()
    : (r.text() as Promise<T>);
}
