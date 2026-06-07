import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const setupItems = [
  "Vite + React + TypeScript",
  "React Router browser routing",
  "Material UI theme provider and baseline",
  "Starter layout and placeholder pages",
  "Vite /api proxy for future backend calls",
];

export function AboutPage() {
  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2}>
        <Typography variant="h4">About this setup</Typography>
        <Typography color="text.secondary">
          Target awalnya adalah menyediakan fondasi frontend modern di `/web`
          tanpa mengganggu `src/views` yang masih dipakai aplikasi Go saat ini.
        </Typography>
        <List disablePadding>
          {setupItems.map((item) => (
            <ListItem key={item} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleRoundedIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Paper>
  );
}
