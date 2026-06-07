import { createContext } from "react";
import type {
  CreateDeviceInput,
  DeviceRecord,
  LoginCodeInput,
  LoginCodeResult,
  LoginQrResult,
} from "./types";

export type DevicesContextValue = {
  devices: DeviceRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshDevices: () => Promise<void>;
  createDevice: (input: CreateDeviceInput) => Promise<DeviceRecord>;
  requestQrLogin: (deviceId: string) => Promise<LoginQrResult>;
  requestCodeLogin: (input: LoginCodeInput) => Promise<LoginCodeResult>;
  logoutDevice: (deviceId: string) => Promise<void>;
  deleteDevice: (deviceId: string) => Promise<void>;
};

export const DevicesContext = createContext<DevicesContextValue | null>(null);
