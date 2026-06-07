import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DeviceRecord } from "../features/devices/types";
import { renderWithProviders, defaultDevicesContext } from "../test/render";
import { SendMessagesPage } from "./SendMessagesPage";

const sendMessageMock = vi.fn();

vi.mock("../features/send/api", () => ({
  sendMessage: (input: unknown) => sendMessageMock(input),
}));

function buildDevicesContext(devices: DeviceRecord[]) {
  return {
    ...defaultDevicesContext,
    devices,
  };
}

describe("SendMessagesPage", () => {
  beforeEach(() => {
    sendMessageMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("shows empty state when no logged-in devices exist", () => {
    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "dev-1", display_name: "Dev 1", state: "connected" },
        ]),
      },
    );

    expect(
      screen.getByText("No logged-in device is available yet. Login a device first before sending messages."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  });

  test("sender select shows only logged_in devices", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "logged-1", display_name: "Logged One", state: "logged_in" },
          { id: "logged-2", display_name: "Logged Two", state: "logged_in" },
          { id: "connected-1", display_name: "Connected One", state: "connected" },
        ]),
      },
    );

    await user.click(screen.getByRole("combobox", { name: "Sender device" }));

    expect(screen.getByRole("option", { name: "Logged One (logged-1)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Logged Two (logged-2)" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Connected One (connected-1)" }),
    ).not.toBeInTheDocument();
  });

  test("single logged-in device is auto-selected", async () => {
    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "only-device", display_name: "Only Device", state: "logged_in" },
        ]),
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Sender device" })).toHaveTextContent(
        "Only Device (only-device)",
      );
    });
  });

  test("shows success alert after submit", async () => {
    const user = userEvent.setup();
    sendMessageMock.mockResolvedValue({
      message: "Success",
      status: "message success",
      messageId: "mid-1",
    });

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({
        deviceId: "sender-1",
        phone: "628123456789@s.whatsapp.net",
        message: "hello there",
        async: false,
        delaySeconds: undefined,
      });
    });
    expect(await screen.findByText("message success")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net")).toHaveValue(
      "628123456789@s.whatsapp.net",
    );
    expect(screen.getByPlaceholderText("Write the outbound message here.")).toHaveValue(
      "hello there",
    );
  });

  test("submits async mode and shows accepted summary", async () => {
    const user = userEvent.setup();
    sendMessageMock.mockResolvedValue({
      message: "Job accepted",
      status: "queued",
      jobId: "job-123",
      deviceId: "sender-1",
      phone: "628123456789@s.whatsapp.net",
    });

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.click(screen.getByRole("checkbox", { name: "Send asynchronously" }));
    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({
        deviceId: "sender-1",
        phone: "628123456789@s.whatsapp.net",
        message: "hello there",
        async: true,
        delaySeconds: undefined,
      });
    });

    expect(await screen.findByText("Async job accepted. Delivery will continue in the background.")).toBeInTheDocument();
    expect(screen.getByText("job_id: job-123")).toBeInTheDocument();
    expect(screen.getByText("status: queued")).toBeInTheDocument();
  });

  test("shows error alert when request fails", async () => {
    const user = userEvent.setup();
    sendMessageMock.mockRejectedValue(new Error("backend says no"));

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText("backend says no")).toBeInTheDocument();
  });

  test("shows async submit error when request fails", async () => {
    const user = userEvent.setup();
    sendMessageMock.mockRejectedValue(new Error("async backend says no"));

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.click(screen.getByRole("checkbox", { name: "Send asynchronously" }));
    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText("async backend says no")).toBeInTheDocument();
  });

  test("submits sync mode with delay seconds", async () => {
    const user = userEvent.setup();
    sendMessageMock.mockResolvedValue({
      message: "Success",
      status: "message success",
      messageId: "mid-1",
    });

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    await user.type(screen.getByLabelText("Delay in seconds"), "5");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({
        deviceId: "sender-1",
        phone: "628123456789@s.whatsapp.net",
        message: "hello there",
        async: false,
        delaySeconds: 5,
      });
    });
  });

  test("submits async mode with delay seconds", async () => {
    const user = userEvent.setup();
    sendMessageMock.mockResolvedValue({
      message: "Job accepted",
      status: "queued",
      jobId: "job-123",
    });

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.click(screen.getByRole("checkbox", { name: "Send asynchronously" }));
    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    await user.type(screen.getByLabelText("Delay in seconds"), "5");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({
        deviceId: "sender-1",
        phone: "628123456789@s.whatsapp.net",
        message: "hello there",
        async: true,
        delaySeconds: 5,
      });
    });
  });

  test("blocks invalid negative delay input", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MemoryRouter>
        <SendMessagesPage />
      </MemoryRouter>,
      {
        devicesContext: buildDevicesContext([
          { id: "sender-1", display_name: "Sender One", state: "logged_in" },
        ]),
      },
    );

    await user.type(
      screen.getByPlaceholderText("62812xxxxxxx@s.whatsapp.net"),
      "628123456789@s.whatsapp.net",
    );
    await user.type(screen.getByPlaceholderText("Write the outbound message here."), "hello there");
    const delayField = screen.getByLabelText("Delay in seconds");
    await user.type(delayField, "-1");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText("Delay must be 0 seconds or more.")).toBeInTheDocument();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
