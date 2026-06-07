import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DeviceHubRoundedIcon from "@mui/icons-material/DeviceHubRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const highlights = [
  {
    title: "Vite Foundation",
    description: "Fast local iteration and straightforward production builds.",
    icon: <BoltRoundedIcon fontSize="small" />,
  },
  {
    title: "MUI Components",
    description: "Consistent layout, theming, and accessible UI primitives.",
    icon: <PaletteRoundedIcon fontSize="small" />,
  },
  {
    title: "Router Ready",
    description: "Client-side route structure is already in place for expansion.",
    icon: <DeviceHubRoundedIcon fontSize="small" />,
  },
];

export function HomePage() {
  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(15,92,192,0.10) 0%, rgba(255,255,255,1) 48%, rgba(11,58,117,0.08) 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="overline" color="primary.main">
            Standalone Frontend
          </Typography>
          <Typography variant="h2">
            React + Material UI workspace for Gowa API.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
            Frontend ini hidup terpisah di `/web`, tidak menggantikan UI embedded lama,
            dan sudah siap dipakai untuk route baru serta integrasi API berikutnya.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              component={RouterLink}
              to="/about"
              variant="contained"
              endIcon={<ArrowOutwardRoundedIcon />}
            >
              Lihat struktur
            </Button>
            <Button
              href="https://mui.com/material-ui/"
              target="_blank"
              rel="noreferrer"
              variant="outlined"
            >
              MUI Docs
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {highlights.map((item) => (
          <Grid key={item.title} size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    bgcolor: "rgba(15, 92, 192, 0.10)",
                    color: "primary.main",
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="h6">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
