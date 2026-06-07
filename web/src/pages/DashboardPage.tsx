import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import PortableWifiOffRoundedIcon from "@mui/icons-material/PortableWifiOffRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { buildDeviceSummary } from "../features/devices/selectors";
import { useDevices } from "../features/devices/useDevices";

const summaryItems = [
  {
    key: "total",
    label: "Total Devices",
    icon: <DevicesRoundedIcon fontSize="small" />,
    accent: "rgba(9, 95, 76, 0.12)",
  },
  {
    key: "loggedIn",
    label: "Logged In",
    icon: <LockOpenRoundedIcon fontSize="small" />,
    accent: "rgba(27, 94, 32, 0.12)",
  },
  {
    key: "connected",
    label: "Connected",
    icon: <LinkRoundedIcon fontSize="small" />,
    accent: "rgba(0, 105, 92, 0.12)",
  },
  {
    key: "disconnected",
    label: "Disconnected",
    icon: <PortableWifiOffRoundedIcon fontSize="small" />,
    accent: "rgba(173, 20, 87, 0.10)",
  },
] as const;

export function DashboardPage() {
  const { devices, loading, refreshing, error, refreshDevices } = useDevices();
  const summary = buildDeviceSummary(devices);

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(9, 30, 66, 0.08)",
          background:
            "radial-gradient(circle at top left, rgba(0,150,136,0.18), transparent 32%), linear-gradient(145deg, #ffffff 0%, #f2fbf8 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
          >
            <Box>
              <Typography variant="overline" color="primary.main">
                Dashboard
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                Device health at a glance
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 680, mt: 1 }}>
                Summary ini dihitung langsung dari live device list yang sama dengan halaman
                Devices, jadi status login dan koneksi akan sinkron setelah setiap action.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void refreshDevices()}
                disabled={refreshing}
              >
                Refresh
              </Button>
              <Button
                component={RouterLink}
                to="/devices"
                variant="contained"
                endIcon={<ArrowOutwardRoundedIcon />}
              >
                Open Devices
              </Button>
            </Stack>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {summaryItems.map((item) => (
          <Grid key={item.key} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid rgba(9, 30, 66, 0.08)",
                height: "100%",
              }}
            >
              <Stack spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: item.accent,
                    color: "primary.main",
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography color="text.secondary">{item.label}</Typography>
                  {loading ? (
                    <Skeleton variant="text" width={72} height={52} />
                  ) : (
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>
                      {summary[item.key]}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {!loading && devices.length === 0 ? (
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            border: "1px dashed rgba(9, 30, 66, 0.18)",
            bgcolor: "rgba(255,255,255,0.9)",
          }}
        >
          <Stack spacing={2.5} sx={{ alignItems: "flex-start" }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                display: "grid",
                placeItems: "center",
                borderRadius: 3,
                bgcolor: "rgba(0,150,136,0.12)",
                color: "primary.main",
              }}
            >
              <HubRoundedIcon />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.75 }}>
                No devices registered yet
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 680 }}>
                Create the first device from the Devices page, then start login with QR or
                pairing code from the row action there.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/devices"
              variant="contained"
              endIcon={<ArrowOutwardRoundedIcon />}
            >
              Go to Devices
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
