export const KNOWN_DEVICE_STATES = [
  "logged_in",
  "connected",
  "connecting",
  "disconnected",
] as const;

export type KnownDeviceState = (typeof KNOWN_DEVICE_STATES)[number];

export type DeviceState = KnownDeviceState | string;

export type DeviceStateFilter = "All" | KnownDeviceState | "Other";

export type DeviceRecord = {
  id?: string;
  device?: string;
  name?: string;
  display_name?: string;
  jid?: string;
  state?: DeviceState;
  created_at?: string;
};

export type DeviceSummary = {
  total: number;
  loggedIn: number;
  connected: number;
  disconnected: number;
};

export type CreateDeviceInput = {
  deviceId?: string;
};

export type LoginQrResult = {
  deviceId: string;
  qrLink: string;
  qrDuration: number;
};

export type LoginCodeInput = {
  deviceId: string;
  phone: string;
};

export type LoginCodeResult = {
  deviceId: string;
  pairCode: string;
};

export type DeviceConnectionStatus = {
  deviceId: string;
  isConnected: boolean;
  isLoggedIn: boolean;
};

export type ConfirmAction = "logout" | "delete";
