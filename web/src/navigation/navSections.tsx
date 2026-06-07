import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmsRoundedIcon from "@mui/icons-material/SmsRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import type { ReactNode } from "react";

export type NavLeafItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

export type NavGroup = {
  label: string;
  icon: ReactNode;
  children: NavLeafItem[];
};

export type NavEntry = NavLeafItem | NavGroup;

export const DASHBOARD_PATH = "/";
export const DEVICES_PATH = "/console/devices";
export const SEND_MESSAGES_PATH = "/console/send/messages";
export const API_DOCS_PATH = "/console/api-docs";

export const navEntries: NavEntry[] = [
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
    label: "Send",
    icon: <SendRoundedIcon fontSize="small" />,
    children: [
      {
        label: "Send Messages",
        path: SEND_MESSAGES_PATH,
        icon: <SmsRoundedIcon fontSize="small" />,
      },
    ],
  },
  {
    label: "API DOCS",
    path: API_DOCS_PATH,
    icon: <MenuBookRoundedIcon fontSize="small" />,
  },
];

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const navItems = navEntries.flatMap((entry) =>
  isNavGroup(entry) ? entry.children : [entry],
);

export function findActiveNavLeaf(pathname: string): NavLeafItem | null {
  return navItems.find((item) => item.path === pathname) ?? null;
}

export function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.children.some((item) => item.path === pathname);
}

export const firstNavItemPath = navItems[0]?.path ?? "/";
