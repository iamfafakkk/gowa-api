import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

export const DASHBOARD_PATH = "/";
export const DEVICES_PATH = "/console/devices";
export const API_DOCS_PATH = "/console/api-docs";

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: DASHBOARD_PATH,
    icon: <DashboardRoundedIcon fontSize="small" />,
  },
  {
    label: "Devices",
    path: DEVICES_PATH,
    icon: <DevicesRoundedIcon fontSize="small" />,
  },
  {
    label: "API DOCS",
    path: API_DOCS_PATH,
    icon: <MenuBookRoundedIcon fontSize="small" />,
  },
];

export const firstNavItemPath = navItems[0]?.path ?? "/";
