// app/lib/testDescribe.ts
import { getAuth } from "firebase/auth";

const ENDPOINT =
  process.env.EXPO_PUBLIC_AI_DESCRIBE_URL?.trim() ||
  "<<<MISSING EXPO_PUBLIC_AI_DESCRIBE_URL>>>";

export async function testDescribe(payload: any) {
  if (!ENDPOINT.startsWith("http")) {
    return { error: "bad-endpoint", hint: "Set EXPO_PUBLIC_AI_DESCRIBE_URL" };
  }

  const user = getAuth().currentUser;
  const idToken = user ? await user.getIdToken() : null;
  if (!idToken) return { error: "no-token" };

  const rsp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await rsp.text();
  console.log("describe", rsp.status, text);
  try {
    return JSON.parse(text);
  } catch {
    return { error: "non-json", status: rsp.status, body: text };
  }
}
