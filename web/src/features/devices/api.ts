import type {
  CreateDeviceInput,
  DeviceConnectionStatus,
  DeviceRecord,
  LoginCodeInput,
  LoginCodeResult,
  LoginQrResult,
} from "./types";
import { withBasePath } from "../../config/runtime";

type ApiEnvelope<T> = {
  message?: string;
  results?: T;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return (payload.results ?? payload) as T;
}

function withDeviceHeader(deviceId: string): HeadersInit {
  return {
    "X-Device-Id": encodeURIComponent(deviceId),
  };
}

export async function listDevices(): Promise<DeviceRecord[]> {
  const response = await fetch(withBasePath("/devices"));
  const results = await readJson<DeviceRecord[]>(response);
  return Array.isArray(results) ? results : [];
}

export async function createDevice(input: CreateDeviceInput): Promise<DeviceRecord> {
  const response = await fetch(withBasePath("/devices"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_id: input.deviceId?.trim() || undefined,
    }),
  });

  return readJson<DeviceRecord>(response);
}

export async function loginDeviceQr(deviceId: string): Promise<LoginQrResult> {
  const response = await fetch(withBasePath("/app/login"), {
    headers: withDeviceHeader(deviceId),
  });

  const results = await readJson<{
    device_id?: string;
    qr_link?: string;
    qr_duration?: number;
  }>(response);

  return {
    deviceId: results.device_id ?? deviceId,
    qrLink: results.qr_link ?? "",
    qrDuration: Number(results.qr_duration ?? 0),
  };
}

export async function loginDeviceWithCode(input: LoginCodeInput): Promise<LoginCodeResult> {
  const params = new URLSearchParams({ phone: input.phone });
  const response = await fetch(withBasePath(`/app/login-with-code?${params.toString()}`), {
    headers: withDeviceHeader(input.deviceId),
  });

  const results = await readJson<{
    device_id?: string;
    pair_code?: string;
  }>(response);

  return {
    deviceId: results.device_id ?? input.deviceId,
    pairCode: results.pair_code ?? "",
  };
}

export async function getDeviceConnectionStatus(
  deviceId: string,
): Promise<DeviceConnectionStatus> {
  const response = await fetch(withBasePath("/app/status"), {
    headers: withDeviceHeader(deviceId),
  });

  const results = await readJson<{
    device_id?: string;
    is_connected?: boolean;
    is_logged_in?: boolean;
  }>(response);

  return {
    deviceId: results.device_id ?? deviceId,
    isConnected: Boolean(results.is_connected),
    isLoggedIn: Boolean(results.is_logged_in),
  };
}

export async function logoutDevice(deviceId: string): Promise<void> {
  const response = await fetch(withBasePath("/app/logout"), {
    headers: withDeviceHeader(deviceId),
  });

  await readJson(response);
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const response = await fetch(withBasePath(`/devices/${encodeURIComponent(deviceId)}`), {
    method: "DELETE",
  });

  await readJson(response);
}
