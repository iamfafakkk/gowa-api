import test from "node:test";
import assert from "node:assert/strict";
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

test("search matches device key, display name, and jid case-insensitively", () => {
  assert.deepEqual(
    filterDevices(devices, { searchQuery: "ALPHA", stateFilter: "All" }).map((device) => device.id),
    ["alpha-01"],
  );
  assert.deepEqual(
    filterDevices(devices, { searchQuery: "tablet", stateFilter: "All" }).map((device) => device.id),
    ["beta-02"],
  );
  assert.deepEqual(
    filterDevices(devices, { searchQuery: "MIXEDCASE", stateFilter: "All" }).map((device) => device.id),
    ["epsilon-05"],
  );
});

test("state filter all returns all devices", () => {
  assert.equal(filterDevices(devices, { searchQuery: "", stateFilter: "All" }).length, devices.length);
});

test("state filter matches known states only", () => {
  const filters: DeviceStateFilter[] = ["logged_in", "connected", "connecting", "disconnected"];

  for (const stateFilter of filters) {
    const result = filterDevices(devices, { searchQuery: "", stateFilter });
    assert.ok(result.every((device) => getDeviceStateBucket(device.state) === stateFilter));
  }
});

test("other groups empty and unknown states", () => {
  assert.equal(getDeviceStateBucket(""), "Other");
  assert.equal(getDeviceStateBucket(undefined), "Other");
  assert.equal(getDeviceStateBucket("custom_state"), "Other");

  assert.deepEqual(
    filterDevices(devices, { searchQuery: "", stateFilter: "Other" }).map((device) => device.id ?? device.device),
    ["gamma-03", "delta-04"],
  );
});

test("search and state filter combine as intersection", () => {
  assert.deepEqual(
    filterDevices(devices, { searchQuery: "hub", stateFilter: "connecting" }).map((device) => device.id),
    ["epsilon-05"],
  );
  assert.deepEqual(
    filterDevices(devices, { searchQuery: "hub", stateFilter: "connected" }),
    [],
  );
});
