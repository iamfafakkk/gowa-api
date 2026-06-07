import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { navItems } from "../navigation/navSections";

const drawerWidth = 316;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2.25,
          borderBottom: "1px solid rgba(10, 37, 64, 0.08)",
          background:
            "linear-gradient(180deg, rgba(0,150,136,0.10) 0%, rgba(255,255,255,1) 88%)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              display: "grid",
              placeItems: "center",
              borderRadius: 2.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              boxShadow: "0 14px 28px rgba(0, 150, 136, 0.18)",
            }}
          >
            <WhatsAppIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              Gowa API
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              Web Console
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.25, py: 1.5 }}>
        <List disablePadding sx={{ display: "grid", gap: 0.5 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                onClick={onNavigate}
                sx={{
                  borderRadius: 3,
                  px: 1.4,
                  py: 1.25,
                  border: "1px solid transparent",
                  bgcolor: isActive ? "rgba(0, 150, 136, 0.12)" : "transparent",
                  borderColor: isActive ? "rgba(0, 150, 136, 0.24)" : "transparent",
                  "&:hover": {
                    bgcolor: "rgba(0, 150, 136, 0.08)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? "primary.main" : "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <Typography
                  sx={{
                    fontWeight: isActive ? 700 : 600,
                    color: "text.primary",
                  }}
                >
                  {item.label}
                </Typography>
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const activeItem =
    navItems.find((item) => location.pathname === item.path) ?? navItems[0] ?? null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(16px)",
          bgcolor: "rgba(245, 248, 246, 0.84)",
          borderBottom: "1px solid rgba(10, 37, 64, 0.08)",
        }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: 72 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>

          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              Standalone SPA
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {activeItem?.label ?? "Web Console"}
            </Typography>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        <Box
          component="nav"
          sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
          aria-label="feature navigation"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                boxSizing: "border-box",
              },
            }}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </Drawer>

          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                boxSizing: "border-box",
                borderRight: "1px solid rgba(10, 37, 64, 0.08)",
              },
            }}
          >
            <SidebarContent />
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
