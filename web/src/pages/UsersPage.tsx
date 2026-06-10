import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import type { ConsoleUser, CreateUserInput } from "../features/auth/types";

type CreateState = {
  open: boolean;
  username: string;
  password: string;
  role: string;
  error: string | null;
  busy: boolean;
};

type ConfirmDelete = {
  user: ConsoleUser;
} | null;

export function UsersPage() {
  const {
    user: currentUser,
    users,
    loading,
    error,
    refreshUsers,
    createUser,
    deleteUser,
  } = useAuth();

  const [createState, setCreateState] = useState<CreateState>({
    open: false,
    username: "",
    password: "",
    role: "admin",
    error: null,
    busy: false,
  });
  const [confirm, setConfirm] = useState<ConfirmDelete>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void refreshUsers().catch(() => {});
  }, [refreshUsers]);

  async function handleCreate() {
    setCreateState((s) => ({ ...s, error: null, busy: true }));
    setActionError(null);
    setSuccess(null);

    const input: CreateUserInput = {
      username: createState.username.trim(),
      password: createState.password,
      role: createState.role || "admin",
    };

    if (!input.username || !input.password) {
      setCreateState((s) => ({ ...s, error: "Username and password required.", busy: false }));
      return;
    }

    try {
      await createUser(input);
      setSuccess(`User ${input.username} created.`);
      setCreateState({ open: false, username: "", password: "", role: "admin", error: null, busy: false });
      await refreshUsers();
    } catch (e) {
      setCreateState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : "Failed to create user.",
        busy: false,
      }));
    }
  }

  async function handleConfirmDelete() {
    if (!confirm) return;
    setActionError(null);
    setSuccess(null);
    try {
      await deleteUser(confirm.user.id);
      setSuccess(`User ${confirm.user.username} deleted.`);
      setConfirm(null);
      await refreshUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete user.");
    }
  }

  const isSelf = (u: ConsoleUser) => currentUser?.id === u.id;

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: { xs: 3, md: 4 }, border: "1px solid rgba(10, 37, 64, 0.08)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="overline" color="primary.main">Access Control</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Console Users</Typography>
            <Typography color="text.secondary" variant="body2">Manage accounts that can log into the web console.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void refreshUsers()} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setCreateState((s) => ({ ...s, open: true, error: null }))}
            >
              Create User
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {(error || actionError) && <Alert severity="error">{error || actionError}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <TableContainer component={Paper} sx={{ border: "1px solid rgba(10, 37, 64, 0.08)" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ color: "text.secondary" }}>
                  No users yet. Create the first admin.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{u.username}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "never"}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      onClick={() => setConfirm({ user: u })}
                      disabled={isSelf(u)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create dialog */}
      <Dialog open={createState.open} onClose={() => setCreateState((s) => ({ ...s, open: false }))} fullWidth maxWidth="xs">
        <DialogTitle>Create Console User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createState.error && <Alert severity="error">{createState.error}</Alert>}
            <TextField
              label="Username"
              value={createState.username}
              onChange={(e) => setCreateState((s) => ({ ...s, username: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={createState.password}
              onChange={(e) => setCreateState((s) => ({ ...s, password: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Role"
              value={createState.role}
              onChange={(e) => setCreateState((s) => ({ ...s, role: e.target.value }))}
              fullWidth
              helperText="Use 'admin' (default) or 'viewer'"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateState((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createState.busy}>
            {createState.busy ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{confirm?.user.username}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
