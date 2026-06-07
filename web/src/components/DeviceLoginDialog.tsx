import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import PasswordRoundedIcon from "@mui/icons-material/PasswordRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getDeviceConnectionStatus } from "../features/devices/api";
import type { DeviceRecord } from "../features/devices/types";
import { getDeviceKey, getDeviceName } from "../features/devices/selectors";

const QR_STATUS_POLL_INTERVAL_MS = 2000;
const QR_STATUS_ERROR_THRESHOLD = 3;
const QR_SUCCESS_CLOSE_DELAY_MS = 1200;

type DeviceLoginDialogProps = {
  device: DeviceRecord;
  onClose: () => void;
  onLoginSuccess?: () => Promise<void> | void;
  onRequestQr: (deviceId: string) => Promise<{ qrLink: string; qrDuration: number }>;
  onRequestCode: (deviceId: string, phone: string) => Promise<{ pairCode: string }>;
};

export function DeviceLoginDialog({
  device,
  onClose,
  onLoginSuccess,
  onRequestQr,
  onRequestCode,
}: DeviceLoginDialogProps) {
  const deviceId = getDeviceKey(device);
  const [tab, setTab] = useState<"qr" | "code">("qr");
  const [qrLink, setQrLink] = useState("");
  const [qrDuration, setQrDuration] = useState(0);
  const [qrRequestKey, setQrRequestKey] = useState(0);
  const [phone, setPhone] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pollRequestInFlightRef = useRef(false);
  const consecutivePollErrorsRef = useRef(0);
  const qrReadyForPolling = tab === "qr" && Boolean(qrLink) && qrRequestKey > 0 && !successMessage;

  function clearPollingTimer() {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function stopPolling(clearFeedback: boolean) {
    clearPollingTimer();
    clearCloseTimer();
    pollRequestInFlightRef.current = false;
    consecutivePollErrorsRef.current = 0;
    if (clearFeedback) {
      setPollingError(null);
      setSuccessMessage(null);
    }
  }

  useEffect(() => {
    if (!qrDuration) {
      return;
    }

    const timer = window.setInterval(() => {
      setQrDuration((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [qrDuration]);

  useEffect(() => {
    if (qrDuration > 0) {
      return;
    }

    clearPollingTimer();
  }, [qrDuration]);

  useEffect(() => {
    if (!qrReadyForPolling) {
      clearPollingTimer();
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      if (cancelled || pollRequestInFlightRef.current) {
        return;
      }

      pollRequestInFlightRef.current = true;

      try {
        const status = await getDeviceConnectionStatus(deviceId);
        if (cancelled) {
          return;
        }

        consecutivePollErrorsRef.current = 0;
        setPollingError(null);

        if (status.isConnected || status.isLoggedIn) {
          clearPollingTimer();
          clearCloseTimer();
          setQrDuration(0);
          setSuccessMessage("Device connected. Closing this dialog...");

          try {
            await onLoginSuccess?.();
          } catch (refreshErr) {
            setPollingError(
              refreshErr instanceof Error
                ? refreshErr.message
                : "Device connected, but failed to refresh device status.",
            );
          }

          closeTimerRef.current = window.setTimeout(() => {
            onClose();
          }, QR_SUCCESS_CLOSE_DELAY_MS);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        consecutivePollErrorsRef.current += 1;
        if (consecutivePollErrorsRef.current >= QR_STATUS_ERROR_THRESHOLD) {
          setPollingError(
            err instanceof Error
              ? err.message
              : "Unable to verify device status right now. QR is still active.",
          );
        }
      } finally {
        pollRequestInFlightRef.current = false;
      }
    }

    void checkStatus();
    pollingTimerRef.current = window.setInterval(() => {
      void checkStatus();
    }, QR_STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearPollingTimer();
      pollRequestInFlightRef.current = false;
    };
  }, [deviceId, onClose, onLoginSuccess, qrReadyForPolling]);

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current !== null) {
        window.clearInterval(pollingTimerRef.current);
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      pollRequestInFlightRef.current = false;
      consecutivePollErrorsRef.current = 0;
    };
  }, []);

  async function handleRequestQr() {
    setSubmitting(true);
    setError(null);
    stopPolling(true);
    setQrLink("");
    setQrDuration(0);

    try {
      const result = await onRequestQr(deviceId);
      setQrLink(result.qrLink);
      setQrDuration(result.qrDuration);
      setQrRequestKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request QR login.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestCode() {
    setSubmitting(true);
    setError(null);
    stopPolling(true);
    setQrLink("");
    setQrDuration(0);

    try {
      const result = await onRequestCode(deviceId, phone);
      setPairCode(result.pairCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request pairing code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Login Device
          </Typography>
          <Typography color="text.secondary">
            {getDeviceName(device)} · <code>{deviceId}</code>
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Tabs
            value={tab}
            onChange={(_, value) => {
              if (value !== "qr") {
                stopPolling(true);
              }
              setTab(value);
              setError(null);
            }}
            variant="fullWidth"
          >
            <Tab icon={<QrCode2RoundedIcon />} iconPosition="start" label="QR Login" value="qr" />
            <Tab
              icon={<PasswordRoundedIcon />}
              iconPosition="start"
              label="Login With Code"
              value="code"
            />
          </Tabs>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {pollingError ? <Alert severity="warning">{pollingError}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          {tab === "qr" ? (
            <Stack spacing={2.5}>
              <Alert severity="info">
                Scan from WhatsApp Linked Devices. Request a new QR if the countdown expires.
              </Alert>
              <Button
                variant="contained"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void handleRequestQr()}
                disabled={submitting}
              >
                {qrLink ? "Refresh QR" : "Request QR"}
              </Button>
              <Box
                sx={{
                  minHeight: 280,
                  borderRadius: 4,
                  border: "1px dashed rgba(9, 30, 66, 0.18)",
                  bgcolor: "rgba(247, 250, 252, 0.9)",
                  display: "grid",
                  placeItems: "center",
                  p: 3,
                }}
              >
                {qrLink ? (
                  <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      component="img"
                      src={qrLink}
                      alt="WhatsApp QR login"
                      sx={{
                        width: "100%",
                        maxWidth: 260,
                        aspectRatio: "1 / 1",
                        objectFit: "contain",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Expires in {qrDuration} seconds
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
                    <QrCode2RoundedIcon sx={{ fontSize: 42, color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      QR login ready
                    </Typography>
                    <Typography color="text.secondary">
                      Request a QR first, then scan it from the WhatsApp mobile app.
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <Alert severity="info">
                Enter the phone number tied to this WhatsApp account to generate the pairing code.
              </Alert>
              <TextField
                label="Phone Number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="62812xxxxxxx"
                fullWidth
              />
              <Button
                variant="contained"
                onClick={() => void handleRequestCode()}
                disabled={submitting || !phone.trim()}
              >
                Generate Pairing Code
              </Button>
              <Divider />
              <Box
                sx={{
                  borderRadius: 4,
                  border: "1px solid rgba(9, 30, 66, 0.10)",
                  bgcolor: "rgba(247, 250, 252, 0.92)",
                  p: 3,
                }}
              >
                <Typography variant="overline" color="primary.main">
                  Pairing Code
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "0.12em" }}>
                  {pairCode || "------"}
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
