import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import {
  API_DOCS_PATH,
  DASHBOARD_PATH,
  DEVICES_PATH,
  firstNavItemPath,
} from "../navigation/navSections";
import { DashboardPage } from "../pages/DashboardPage";
import { DevicesPage } from "../pages/DevicesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={firstNavItemPath} replace />,
      },
      {
        path: DASHBOARD_PATH.slice(1),
        element: <DashboardPage />,
      },
      {
        path: DEVICES_PATH.slice(1),
        element: <DevicesPage />,
      },
      {
        path: API_DOCS_PATH.slice(1),
        lazy: async () => {
          const module = await import("../pages/ApiDocsPage");

          return { Component: module.ApiDocsPage };
        },
      },
      {
        path: "*",
        element: <Navigate to={firstNavItemPath} replace />,
      },
    ],
  },
]);
