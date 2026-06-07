import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

type FeaturePlaceholderPageProps = {
  section: string;
  title: string;
  description: string;
};

const checklistItems = [
  "Layout and route are ready for this feature.",
  "Business flow and forms can be implemented incrementally.",
  "API wiring stays unchanged until the real feature is built.",
];

export function FeaturePlaceholderPage({
  section,
  title,
  description,
}: FeaturePlaceholderPageProps) {
  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(10, 37, 64, 0.08)",
          background:
            "linear-gradient(155deg, rgba(0,150,136,0.12) 0%, rgba(255,255,255,1) 48%, rgba(12,75,66,0.08) 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
          >
            <Chip
              label={section}
              color="primary"
              icon={<InfoOutlinedIcon />}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label="Planned"
              variant="outlined"
              icon={<PendingActionsRoundedIcon />}
              sx={{ fontWeight: 700, bgcolor: "rgba(255,255,255,0.78)" }}
            />
          </Stack>

          <Box>
            <Typography variant="h3" sx={{ mb: 1, fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              {description}
            </Typography>
          </Box>

          <Alert
            icon={<ConstructionRoundedIcon fontSize="inherit" />}
            severity="info"
            sx={{
              border: "1px solid rgba(0, 105, 92, 0.18)",
              bgcolor: "rgba(255,255,255,0.82)",
            }}
          >
            This route is a v1 placeholder for the upcoming `/web` feature surface.
          </Alert>
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(10, 37, 64, 0.08)",
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            What is ready here
          </Typography>
          <Stack spacing={1.25}>
            {checklistItems.map((item) => (
              <Stack
                key={item}
                direction="row"
                spacing={1.25}
                sx={{ alignItems: "flex-start" }}
              >
                <ArrowForwardRoundedIcon
                  sx={{ mt: "2px", color: "primary.main", fontSize: 20 }}
                />
                <Typography color="text.secondary">{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
