import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: "#00796b",
    },
    secondary: {
      main: "#004d40",
    },
    background: {
      default: "#f4f7f4",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h2: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    h3: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
  },
});
