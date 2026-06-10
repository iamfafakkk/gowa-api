import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../features/auth/AuthContext";

export function LoginPage() {
  const { login, loading, error: authError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!username.trim() || !password) {
      setFormError("Username and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = formError || authError;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          border: "1px solid rgba(10, 37, 64, 0.08)",
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" color="primary.main">
              Gowa API
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Web Console Login
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Sign in with a console user account.
            </Typography>
          </Box>

          {displayError ? <Alert severity="error">{displayError}</Alert> : null}

          {/* Main login form - only this remains after removing legacy Basic Auth completely */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                fullWidth
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || loading}
              >
                {submitting || loading ? "Signing in..." : "Sign In"}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary">
            First run? Create the initial admin via the API (POST /auth/users) or the management panel after the first login.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
