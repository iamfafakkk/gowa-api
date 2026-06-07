import { CssBaseline, ThemeProvider } from "@mui/material";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { DevicesContext, type DevicesContextValue } from "../features/devices/context";
import { appTheme } from "../theme";

type RenderOptions = {
  devicesContext?: DevicesContextValue;
};

export const defaultDevicesContext: DevicesContextValue = {
  devices: [],
  loading: false,
  refreshing: false,
  error: null,
  refreshDevices: async () => {},
  createDevice: async () => ({ id: "created-device" }),
  requestQrLogin: async () => ({ deviceId: "device", qrLink: "", qrDuration: 0 }),
  requestCodeLogin: async () => ({ deviceId: "device", pairCode: "" }),
  logoutDevice: async () => {},
  deleteDevice: async () => {},
};

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const devicesContext = options.devicesContext ?? defaultDevicesContext;

  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <DevicesContext.Provider value={devicesContext}>{ui}</DevicesContext.Provider>
    </ThemeProvider>,
  );
}
