import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
];

export function AppLayout() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar
          sx={{
            gap: 2,
            borderBottom: "1px solid rgba(15, 92, 192, 0.12)",
            backdropFilter: "blur(16px)",
            bgcolor: "rgba(243, 246, 251, 0.82)",
          }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ flexGrow: 1, alignItems: "center" }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <WhatsAppIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Gowa API
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                Web Console
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                color="inherit"
                sx={{
                  px: 1.75,
                  color: "text.primary",
                  "&.active": {
                    bgcolor: "rgba(15, 92, 192, 0.08)",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Outlet />
      </Container>

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            color: "text.secondary",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <MenuBookRoundedIcon fontSize="small" />
          <Typography variant="body2">
            React Router and Material UI starter in `/web`
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
