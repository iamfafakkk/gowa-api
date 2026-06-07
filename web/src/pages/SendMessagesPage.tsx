import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { getDeviceKey, getDeviceName } from "../features/devices/selectors";
import { useDevices } from "../features/devices/useDevices";
import { sendMessage } from "../features/send/api";
import { DEVICES_PATH } from "../navigation/navSections";

type SubmitSuccessState = {
  message: string;
  details?: string[];
};

function getDelayError(value: string): string | null {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    return null;
  }

  const parsedDelay = Number(trimmedValue);
  if (!Number.isInteger(parsedDelay) || parsedDelay < 0) {
    return "Delay must be 0 seconds or more.";
  }

  return null;
}

export function SendMessagesPage() {
  const { devices, loading } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [sendAsync, setSendAsync] = useState(false);
  const [delaySecondsInput, setDelaySecondsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<SubmitSuccessState | null>(null);
  const delayError = getDelayError(delaySecondsInput);

  const loggedInDevices = useMemo(
    () =>
      devices.filter((device) => device.state === "logged_in" && Boolean(getDeviceKey(device))),
    [devices],
  );
  const hasLoggedInDevices = loggedInDevices.length > 0;

  useEffect(() => {
    const deviceIds = new Set(loggedInDevices.map((device) => getDeviceKey(device)));

    if (loggedInDevices.length === 1) {
      setSelectedDeviceId(loggedInDevices[0] ? getDeviceKey(loggedInDevices[0]) : "");
      return;
    }

    setSelectedDeviceId((current) => (deviceIds.has(current) ? current : ""));
  }, [loggedInDevices]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDeviceId || !recipient.trim() || !message.trim()) {
      setSubmitError("Sender device, recipient, and message are required.");
      setSubmitSuccess(null);
      return;
    }

    let delaySeconds: number | undefined;
    const trimmedDelay = delaySecondsInput.trim();
    if (trimmedDelay !== "") {
      if (delayError) {
        setSubmitError(delayError);
        setSubmitSuccess(null);
        return;
      }
      delaySeconds = Number(trimmedDelay);
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await sendMessage({
        deviceId: selectedDeviceId,
        phone: recipient,
        message,
        async: sendAsync,
        delaySeconds,
      });

      if (sendAsync) {
        const details: string[] = [];

        if (result.jobId) {
          details.push(`job_id: ${result.jobId}`);
        }
        if (result.status) {
          details.push(`status: ${result.status}`);
        }

        setSubmitSuccess({
          message: "Async job accepted. Delivery will continue in the background.",
          details,
        });
      } else {
        setSubmitSuccess({
          message: result.status ?? result.message,
        });
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <Stack spacing={0.5}>
              <Typography variant="overline" color="primary.main">
                Send
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                Send Messages
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
                Kirim satu pesan outbound dari device yang sudah login tanpa pindah ke API client.
                Sync mode menunggu hasil kirim langsung, sedangkan async mode hanya menerima
                accepted response dan `job_id` untuk background delivery.
              </Typography>
            </Stack>

            <Button
              component={RouterLink}
              to={DEVICES_PATH}
              variant="outlined"
              endIcon={<ArrowOutwardRoundedIcon />}
            >
              Open Devices
            </Button>
          </Stack>

          {!loading && !hasLoggedInDevices ? (
            <Alert
              severity="warning"
              action={
                <Button
                  component={RouterLink}
                  to={DEVICES_PATH}
                  color="inherit"
                  size="small"
                  endIcon={<ArrowOutwardRoundedIcon />}
                >
                  Devices
                </Button>
              }
            >
              No logged-in device is available yet. Login a device first before sending messages.
            </Alert>
          ) : null}

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          {submitSuccess ? (
            <Alert severity="success">
              <Stack spacing={0.5}>
                <span>{submitSuccess.message}</span>
                {submitSuccess.details?.map((detail) => (
                  <Fragment key={detail}>
                    <span>{detail}</span>
                  </Fragment>
                ))}
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <Paper
        component="form"
        onSubmit={(event) => void handleSubmit(event)}
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(9, 30, 66, 0.08)",
        }}
      >
        <Stack spacing={2.5}>
          <TextField
            select
            label="Sender device"
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            disabled={!hasLoggedInDevices || submitting}
            required
            fullWidth
            helperText={
              hasLoggedInDevices
                ? "Only devices with logged_in state are available as senders."
                : "No sender can be selected until a device reaches logged_in state."
            }
          >
            {loggedInDevices.map((device) => {
              const deviceId = getDeviceKey(device);

              return (
                <MenuItem key={deviceId} value={deviceId}>
                  {getDeviceName(device)} ({deviceId})
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            label="Recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="62812xxxxxxx@s.whatsapp.net"
            disabled={!hasLoggedInDevices || submitting}
            required
            fullWidth
          />

          <TextField
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write the outbound message here."
            disabled={!hasLoggedInDevices || submitting}
            required
            fullWidth
            multiline
            minRows={6}
          />

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={sendAsync}
                  onChange={(event) => setSendAsync(event.target.checked)}
                  disabled={!hasLoggedInDevices || submitting}
                />
              }
              label="Send asynchronously"
            />
            <FormHelperText>
              Async mode only enqueues the job. The success state here confirms accepted/queued,
              not final message delivery.
            </FormHelperText>
          </FormGroup>

          <TextField
            label="Delay in seconds"
            value={delaySecondsInput}
            onChange={(event) => setDelaySecondsInput(event.target.value)}
            type="text"
            disabled={!hasLoggedInDevices || submitting}
            fullWidth
            error={Boolean(delayError)}
            slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
            helperText={
              delayError ??
              (sendAsync
                ? "Optional. After the job is accepted, the background worker waits this many seconds before the actual send starts."
                : "Optional. The app waits this many seconds before the actual send starts.")
            }
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SendRoundedIcon />}
              disabled={!hasLoggedInDevices || submitting}
            >
              {submitting ? "Sending..." : "Send Message"}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
              Sender stays selected and form values stay available after submit for quick retry or
              editing.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
