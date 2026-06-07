import { afterEach, describe, expect, test, vi } from "vitest";
import { sendMessage } from "./api";

describe("sendMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("calls send message endpoint with payload and device header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Success",
        results: { message_id: "mid-1", status: "message success" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMessage({
      deviceId: "device alpha",
      phone: "628123456789@s.whatsapp.net",
      message: "hello",
    });

    expect(fetchMock).toHaveBeenCalledWith("/send/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": "device%20alpha",
      },
      body: JSON.stringify({
        phone: "628123456789@s.whatsapp.net",
        message: "hello",
      }),
    });
    expect(result).toEqual({
      code: undefined,
      message: "Success",
      status: "message success",
      messageId: "mid-1",
    });
  });

  test("calls async send message endpoint when async mode is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        message: "Job accepted",
        results: {
          job_id: "job-123",
          status: "queued",
          device_id: "device-alpha",
          phone: "628123456789@s.whatsapp.net",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMessage({
      deviceId: "device alpha",
      phone: "628123456789@s.whatsapp.net",
      message: "hello",
      async: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/send/message?async=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": "device%20alpha",
      },
      body: JSON.stringify({
        phone: "628123456789@s.whatsapp.net",
        message: "hello",
      }),
    });
    expect(result).toEqual({
      code: undefined,
      message: "Job accepted",
      status: "queued",
      jobId: "job-123",
      deviceId: "device-alpha",
      phone: "628123456789@s.whatsapp.net",
    });
  });

  test("calls send message endpoint with delay query for sync mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Success",
        results: { message_id: "mid-1", status: "message success" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await sendMessage({
      deviceId: "device alpha",
      phone: "628123456789@s.whatsapp.net",
      message: "hello",
      delaySeconds: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith("/send/message?delay=5", expect.any(Object));
  });

  test("calls async send message endpoint with delay query when enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        message: "Job accepted",
        results: {
          job_id: "job-123",
          status: "queued",
          device_id: "device-alpha",
          phone: "628123456789@s.whatsapp.net",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await sendMessage({
      deviceId: "device alpha",
      phone: "628123456789@s.whatsapp.net",
      message: "hello",
      async: true,
      delaySeconds: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith("/send/message?async=1&delay=5", expect.any(Object));
  });
});
