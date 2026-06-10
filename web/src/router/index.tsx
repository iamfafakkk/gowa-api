import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { appBasePath } from "../config/runtime";
import { useAuth } from "../features/auth/AuthContext";
import { AppLayout } from "../layouts/AppLayout";
import {
  API_DOCS_PATH,
  DEVICES_PATH,
  firstNavItemPath,
  SEND_MESSAGES_PATH,
  USERS_PATH,
} from "../navigation/navSections";
import { DashboardPage } from "../pages/DashboardPage";
import { DevicesPage } from "../pages/DevicesPage";
import { LoginPage } from "../pages/LoginPage";
import { SendMessagesPage } from "../pages/SendMessagesPage";
import { UsersPage } from "../pages/UsersPage";

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // or a minimal loading indicator
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  // Public login route
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: DEVICES_PATH.slice(1),
            element: <DevicesPage />,
          },
          {
            path: USERS_PATH.slice(1),
            element: <UsersPage />,
          },
          {
            path: SEND_MESSAGES_PATH.slice(1),
            element: <SendMessagesPage />,
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
    ],
  },
], {
  basename: appBasePath || undefined,
});
