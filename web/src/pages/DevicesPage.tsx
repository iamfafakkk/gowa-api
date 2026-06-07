import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { DeviceLoginDialog } from "../components/DeviceLoginDialog";
import {
  DEVICE_STATE_FILTER_OPTIONS,
  filterDevices,
  getDeviceKey,
  getDeviceName,
} from "../features/devices/selectors";
import type {
  ConfirmAction,
  DeviceRecord,
  DeviceStateFilter,
} from "../features/devices/types";
import { useDevices } from "../features/devices/useDevices";

type ConfirmState = {
  action: ConfirmAction;
  device: DeviceRecord;
} | null;

function stateTone(state?: string): "default" | "success" | "warning" {
  if (state === "logged_in" || state === "connected") {
    return "success";
  }

  if (state === "connecting") {
    return "warning";
  }

  return "default";
}

export function DevicesPage() {
  const {
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
  } = useDevices();
  const [deviceId, setDeviceId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loginDevice, setLoginDevice] = useState<DeviceRecord | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<DeviceStateFilter>("All");
  const filteredDevices = filterDevices(devices, { searchQuery, stateFilter });

  async function handleCreateDevice() {
    setCreating(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const created = await createDevice({ deviceId });
      const nextId = getDeviceKey(created) || deviceId.trim();
      setDeviceId("");
      setFormSuccess(`Device ${nextId} created successfully.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create device.");
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmState) {
      return;
    }

    setActionBusy(true);

    try {
      const targetId = getDeviceKey(confirmState.device);

      if (confirmState.action === "logout") {
        await logoutDevice(targetId);
      } else {
        await deleteDevice(targetId);
      }

      setConfirmState(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(9, 30, 66, 0.08)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { lg: "center" } }}
          >
            <Stack spacing={0.5}>
              <Typography variant="overline" color="primary.main">
                Devices
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                Manage device sessions
              </Typography>
              <Typography color="text.secondary">
                Create device IDs, trigger login flows, then maintain each session from the same
                table.
              </Typography>
            </Stack>

            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => void refreshDevices()}
              disabled={refreshing}
            >
              Refresh
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          {formSuccess ? <Alert severity="success">{formSuccess}</Alert> : null}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { md: "flex-start" } }}
          >
            <TextField
              label="Device ID"
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              placeholder="Optional, leave blank to auto-generate"
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 52,
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => void handleCreateDevice()}
              disabled={creating}
              sx={{
                minWidth: { md: 180 },
                minHeight: 52,
              }}
            >
              Create Device
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          border: "1px solid rgba(9, 30, 66, 0.08)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{
            p: 2,
            borderBottom: "1px solid rgba(9, 30, 66, 0.08)",
            alignItems: { md: "center" },
          }}
        >
          <TextField
            label="Search devices"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by device, name, or JID"
            fullWidth
          />
          <TextField
            select
            label="State"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as DeviceStateFilter)}
            sx={{ minWidth: { md: 220 } }}
          >
            {DEVICE_STATE_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Device</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>JID</TableCell>
              <TableCell>State</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Stack spacing={0.75} sx={{ py: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      No devices available
                    </Typography>
                    <Typography color="text.secondary">
                      Create a device above, then use Login to start QR or pairing-code auth.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && devices.length > 0 && filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Stack spacing={0.75} sx={{ py: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      No matching results
                    </Typography>
                    <Typography color="text.secondary">
                      Try a different search or reset the state filter to All.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : null}

            {filteredDevices.map((device) => {
              const key = getDeviceKey(device);

              return (
                <TableRow hover key={key}>
                  <TableCell sx={{ fontWeight: 700 }}>{key}</TableCell>
                  <TableCell>{getDeviceName(device)}</TableCell>
                  <TableCell>{device.jid || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={device.state || "unknown"}
                      color={stateTone(device.state)}
                      variant={device.state === "logged_in" ? "filled" : "outlined"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction={{ xs: "column", lg: "row" }}
                      spacing={1}
                      sx={{ justifyContent: "flex-end" }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<QrCode2RoundedIcon />}
                        onClick={() => setLoginDevice(device)}
                      >
                        Login
                      </Button>
                      {device.state === "logged_in" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ExitToAppRoundedIcon />}
                          onClick={() => setConfirmState({ action: "logout", device })}
                        >
                          Logout
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        onClick={() => setConfirmState({ action: "delete", device })}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {loginDevice ? (
        <DeviceLoginDialog
          key={getDeviceKey(loginDevice)}
          device={loginDevice}
          onClose={() => setLoginDevice(null)}
          onLoginSuccess={() => refreshDevices()}
          onRequestQr={(currentId) => requestQrLogin(currentId)}
          onRequestCode={(currentId, phone) => requestCodeLogin({ deviceId: currentId, phone })}
        />
      ) : null}

      {confirmState ? (
        <Dialog open onClose={() => setConfirmState(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {confirmState.action === "logout" ? "Logout device?" : "Delete device?"}
          </DialogTitle>
          <DialogContent>
            <Typography color="text.secondary">
              {confirmState.action === "logout"
                ? "This will end the current WhatsApp session for the selected device."
                : "This will remove the device from the list. Make sure you already logged out if you need a clean session purge."}
            </Typography>
            <Typography sx={{ mt: 2, fontWeight: 700 }}>
              {getDeviceKey(confirmState.device)}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setConfirmState(null)} disabled={actionBusy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={confirmState.action === "delete" ? "error" : "primary"}
              onClick={() => void handleConfirmAction()}
              disabled={actionBusy}
            >
              {confirmState.action === "logout" ? "Confirm Logout" : "Confirm Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
}
