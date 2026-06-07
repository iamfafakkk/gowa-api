import {
  KNOWN_DEVICE_STATES,
  type DeviceRecord,
  type DeviceState,
  type DeviceStateFilter,
  type DeviceSummary,
} from "./types.ts";

export const DEVICE_STATE_FILTER_OPTIONS: DeviceStateFilter[] = [
  "All",
  ...KNOWN_DEVICE_STATES,
  "Other",
];

export function getDeviceKey(device: DeviceRecord): string {
  return device.id ?? device.device ?? "";
}

export function getDeviceName(device: DeviceRecord): string {
  return device.display_name ?? device.name ?? "Unassigned";
}

export function getDeviceStateBucket(state?: DeviceState): DeviceStateFilter {
  if (!state) {
    return "Other";
  }

  if (KNOWN_DEVICE_STATES.includes(state as (typeof KNOWN_DEVICE_STATES)[number])) {
    return state as DeviceStateFilter;
  }

  return "Other";
}

export function matchesDeviceSearch(device: DeviceRecord, searchQuery: string): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [getDeviceKey(device), getDeviceName(device), device.jid ?? ""].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

export function filterDevices(
  devices: DeviceRecord[],
  filters: { searchQuery: string; stateFilter: DeviceStateFilter },
): DeviceRecord[] {
  return devices.filter((device) => {
    const matchesSearch = matchesDeviceSearch(device, filters.searchQuery);
    const matchesState =
      filters.stateFilter === "All" ||
      getDeviceStateBucket(device.state) === filters.stateFilter;

    return matchesSearch && matchesState;
  });
}

export function buildDeviceSummary(devices: DeviceRecord[]): DeviceSummary {
  let loggedIn = 0;
  let connected = 0;

  for (const device of devices) {
    if (device.state === "logged_in") {
      loggedIn += 1;
      continue;
    }

    if (device.state === "connected") {
      connected += 1;
    }
  }

  return {
    total: devices.length,
    loggedIn,
    connected,
    disconnected: Math.max(devices.length - loggedIn - connected, 0),
  };
}
