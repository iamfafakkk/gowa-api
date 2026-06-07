import { withBasePath } from "../../config/runtime";
import type { SendMessageInput, SendMessageResult } from "./types";

type ApiEnvelope<T> = {
  code?: string;
  message?: string;
  results?: T;
};

type SendMessageResponse = {
  message_id?: string;
  job_id?: string;
  status?: string;
  device_id?: string;
  phone?: string;
};

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const queryParts: string[] = [];

  if (input.async) {
    queryParts.push("async=1");
  }
  if (input.delaySeconds !== undefined) {
    queryParts.push(`delay=${input.delaySeconds}`);
  }

  const endpoint = queryParts.length > 0 ? `/send/message?${queryParts.join("&")}` : "/send/message";

  const response = await fetch(withBasePath(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": encodeURIComponent(input.deviceId),
    },
    body: JSON.stringify({
      phone: input.phone.trim(),
      message: input.message,
    }),
  });

  const payload = await readJson<SendMessageResponse>(response);

  return {
    code: payload.code,
    message: payload.message ?? payload.results?.status ?? "Message sent successfully.",
    status: payload.results?.status,
    messageId: payload.results?.message_id,
    jobId: payload.results?.job_id,
    deviceId: payload.results?.device_id,
    phone: payload.results?.phone,
  };
}
