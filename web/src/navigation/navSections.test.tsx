import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import {
  SEND_MESSAGES_PATH,
  findActiveNavLeaf,
  navEntries,
} from "./navSections";
import { renderWithProviders } from "../test/render";

describe("navigation", () => {
  test("send messages route exists in the nav model", () => {
    const sendGroup = navEntries.find((entry) => "children" in entry && entry.label === "Send");

    expect(sendGroup).toBeTruthy();
    expect(sendGroup && "children" in sendGroup ? sendGroup.children[0]?.path : null).toBe(
      SEND_MESSAGES_PATH,
    );
    expect(findActiveNavLeaf(SEND_MESSAGES_PATH)?.label).toBe("Send Messages");
  });

  test("sidebar renders grouped send navigation and header follows child route", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <AppLayout />,
          children: [
            { index: true, element: <div>Dashboard</div> },
            { path: "console/devices", element: <div>Devices</div> },
            { path: "console/send/messages", element: <div>Send Messages Page</div> },
            { path: "console/api-docs", element: <div>API Docs</div> },
          ],
        },
      ],
      { initialEntries: [SEND_MESSAGES_PATH] },
    );

    renderWithProviders(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Send Messages" })).toBeInTheDocument();
    expect(screen.getAllByText("Send").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Send Messages" })).toHaveAttribute(
      "href",
      SEND_MESSAGES_PATH,
    );
  });
});
