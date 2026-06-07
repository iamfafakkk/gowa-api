import { CssBaseline, ThemeProvider } from "@mui/material";
import { RouterProvider } from "react-router-dom";
import { DevicesProvider } from "./features/devices/DevicesContext";
import { router } from "./router";
import { appTheme } from "./theme";

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <DevicesProvider>
        <RouterProvider router={router} />
      </DevicesProvider>
    </ThemeProvider>
  );
}
