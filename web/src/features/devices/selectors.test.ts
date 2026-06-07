import { describe, expect, test } from "vitest";
import {
  filterDevices,
  getDeviceStateBucket,
} from "./selectors.ts";
import type {
  DeviceRecord,
  DeviceStateFilter,
} from "./types.ts";

const devices: DeviceRecord[] = [
  {
    id: "alpha-01",
    display_name: "Alpha Phone",
    jid: "11111@s.whatsapp.net",
    state: "logged_in",
  },
  {
    id: "beta-02",
    name: "Beta Tablet",
    jid: "22222@s.whatsapp.net",
    state: "connected",
  },
  {
    device: "gamma-03",
    display_name: "Gamma Bridge",
    jid: "33333@s.whatsapp.net",
    state: "custom_state",
  },
  {
    id: "delta-04",
    display_name: "Delta Box",
    jid: "44444@s.whatsapp.net",
    state: "",
  },
  {
    id: "epsilon-05",
    display_name: "Epsilon Hub",
    jid: "mixedcase@s.whatsapp.net",
    state: "connecting",
  },
];

describe("device selectors", () => {
  test("search matches device key, display name, and jid case-insensitively", () => {
    expect(
      filterDevices(devices, { searchQuery: "ALPHA", stateFilter: "All" }).map((device) => device.id),
    ).toEqual(["alpha-01"]);
    expect(
      filterDevices(devices, { searchQuery: "tablet", stateFilter: "All" }).map((device) => device.id),
    ).toEqual(["beta-02"]);
    expect(
      filterDevices(devices, { searchQuery: "MIXEDCASE", stateFilter: "All" }).map((device) => device.id),
    ).toEqual(["epsilon-05"]);
  });

  test("state filter all returns all devices", () => {
    expect(filterDevices(devices, { searchQuery: "", stateFilter: "All" }).length).toBe(
      devices.length,
    );
  });

  test("state filter matches known states only", () => {
    const filters: DeviceStateFilter[] = ["logged_in", "connected", "connecting", "disconnected"];

    for (const stateFilter of filters) {
      const result = filterDevices(devices, { searchQuery: "", stateFilter });
      expect(result.every((device) => getDeviceStateBucket(device.state) === stateFilter)).toBe(
        true,
      );
    }
  });

  test("other groups empty and unknown states", () => {
    expect(getDeviceStateBucket("")).toBe("Other");
    expect(getDeviceStateBucket(undefined)).toBe("Other");
    expect(getDeviceStateBucket("custom_state")).toBe("Other");

    expect(
      filterDevices(devices, { searchQuery: "", stateFilter: "Other" }).map(
        (device) => device.id ?? device.device,
      ),
    ).toEqual(["gamma-03", "delta-04"]);
  });

  test("search and state filter combine as intersection", () => {
    expect(
      filterDevices(devices, { searchQuery: "hub", stateFilter: "connecting" }).map(
        (device) => device.id,
      ),
    ).toEqual(["epsilon-05"]);
    expect(filterDevices(devices, { searchQuery: "hub", stateFilter: "connected" })).toEqual([]);
  });
});
