/**
 * Tests for the marketplace-event adapter (C1 / mm06).
 *
 * Mocks the underlying `lib/notifications` primitives — the adapter
 * shouldn't reach the DB itself, only forward to `notifyUser` and
 * `notifyUserByEmail` with the right column-name mapping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockNotifyUser, mockNotifyUserByEmail } = vi.hoisted(() => ({
  mockNotifyUser: vi.fn(),
  mockNotifyUserByEmail: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
  notifyUserByEmail: (...args: unknown[]) => mockNotifyUserByEmail(...args),
}));

import {
  enqueueUserNotification,
  enqueueUserNotificationByEmail,
} from "@/lib/user-notifications";

beforeEach(() => {
  mockNotifyUser.mockReset();
  mockNotifyUserByEmail.mockReset();
});

describe("enqueueUserNotification", () => {
  it("forwards the spec interface to notifyUser with mapped column names", async () => {
    mockNotifyUser.mockResolvedValueOnce(true);
    const ok = await enqueueUserNotification({
      authUserId: "user-uuid-1",
      kind: "brief_accepted",
      title: "Pro accepted",
      body: "Re: your request",
      href: "/briefs/abc",
    });
    expect(ok).toBe(true);
    expect(mockNotifyUser).toHaveBeenCalledOnce();
    const call = mockNotifyUser.mock.calls[0]?.[0] as Record<string, unknown>;
    // Spec column names map to legacy table columns.
    expect(call.userId).toBe("user-uuid-1");
    expect(call.type).toBe("brief_accepted");
    expect(call.title).toBe("Pro accepted");
    expect(call.body).toBe("Re: your request");
    expect(call.linkUrl).toBe("/briefs/abc");
  });

  it("refuses to write when authUserId is missing", async () => {
    const ok = await enqueueUserNotification({
      authUserId: "",
      kind: "generic",
      title: "Anonymous",
    });
    expect(ok).toBe(false);
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it("forwards null body / href without crashing the mapper", async () => {
    mockNotifyUser.mockResolvedValueOnce(true);
    const ok = await enqueueUserNotification({
      authUserId: "u1",
      kind: "topup_succeeded",
      title: "Topped up",
    });
    expect(ok).toBe(true);
    const call = mockNotifyUser.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.body).toBeNull();
    expect(call.linkUrl).toBeNull();
  });
});

describe("enqueueUserNotificationByEmail", () => {
  it("returns false when the email is empty", async () => {
    const ok = await enqueueUserNotificationByEmail("", {
      kind: "generic",
      title: "x",
    });
    expect(ok).toBe(false);
    expect(mockNotifyUserByEmail).not.toHaveBeenCalled();
  });

  it("forwards to notifyUserByEmail and surfaces notified", async () => {
    mockNotifyUserByEmail.mockResolvedValueOnce({
      notified: true,
      userId: "u1",
    });
    const ok = await enqueueUserNotificationByEmail("alice@example.com", {
      kind: "brief_accepted",
      title: "Pro accepted",
      body: "Re: foo",
      href: "/briefs/foo",
    });
    expect(ok).toBe(true);
    expect(mockNotifyUserByEmail).toHaveBeenCalledOnce();
    const [email, input] = mockNotifyUserByEmail.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(email).toBe("alice@example.com");
    expect(input.type).toBe("brief_accepted");
    expect(input.title).toBe("Pro accepted");
    expect(input.linkUrl).toBe("/briefs/foo");
  });

  it("returns false when no matching auth user", async () => {
    mockNotifyUserByEmail.mockResolvedValueOnce({
      notified: false,
      reason: "no_matching_user",
    });
    const ok = await enqueueUserNotificationByEmail("ghost@example.com", {
      kind: "generic",
      title: "x",
    });
    expect(ok).toBe(false);
  });
});
