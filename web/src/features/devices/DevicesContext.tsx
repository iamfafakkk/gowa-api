import {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createDevice as createDeviceRequest,
  deleteDevice as deleteDeviceRequest,
  listDevices,
  loginDeviceQr,
  loginDeviceWithCode,
  logoutDevice as logoutDeviceRequest,
} from "./api";
import type {
  CreateDeviceInput,
  DeviceRecord,
  LoginCodeInput,
} from "./types";
import { DevicesContext } from "./context";

export function DevicesProvider({ children }: PropsWithChildren) {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshDevices() {
    setRefreshing(true);
    setError(null);

    try {
      const nextDevices = await listDevices();
      setDevices(nextDevices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshDevices();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function createDevice(input: CreateDeviceInput) {
    const created = await createDeviceRequest(input);
    await refreshDevices();
    return created;
  }

  async function requestQrLogin(deviceId: string) {
    const result = await loginDeviceQr(deviceId);
    await refreshDevices();
    return result;
  }

  async function requestCodeLogin(input: LoginCodeInput) {
    const result = await loginDeviceWithCode(input);
    await refreshDevices();
    return result;
  }

  async function logoutDevice(deviceId: string) {
    await logoutDeviceRequest(deviceId);
    await refreshDevices();
  }

  async function deleteDevice(deviceId: string) {
    await deleteDeviceRequest(deviceId);
    await refreshDevices();
  }

  return (
    <DevicesContext.Provider
      value={{
        devices,
        loading,
        refreshing,
        error,
        refreshDevices,
        createDevice,
        requestQrLogin,
        requestCodeLogin,
        logoutDevice,
        deleteDevice,
      }}
    >
      {children}
    </DevicesContext.Provider>
  );
}
