import { CssBaseline, ThemeProvider } from "@mui/material";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { DevicesProvider } from "./features/devices/DevicesContext";
import { router } from "./router";
import { appTheme } from "./theme";

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <DevicesProvider>
          <RouterProvider router={router} />
        </DevicesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
