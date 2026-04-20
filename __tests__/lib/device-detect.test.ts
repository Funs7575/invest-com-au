import { describe, it, expect } from "vitest";
import { detectDeviceType } from "@/lib/device-detect";

describe("detectDeviceType", () => {
  describe("mobile", () => {
    it("detects iPhone", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        ),
      ).toBe("mobile");
    });

    it("detects Android phone", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        ),
      ).toBe("mobile");
    });

    it("detects iPod Touch", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X) Mobile/15E148",
        ),
      ).toBe("mobile");
    });

    it("detects Blackberry", () => {
      expect(
        detectDeviceType("Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)"),
      ).toBe("mobile");
    });

    it("detects Opera Mini", () => {
      expect(
        detectDeviceType("Opera/9.80 (J2ME/MIDP; Opera Mini/9.80)"),
      ).toBe("mobile");
    });

    it("detects Windows Phone (IEMobile)", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0)",
        ),
      ).toBe("mobile");
    });
  });

  describe("tablet", () => {
    it("detects iPad", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        ),
      ).toBe("tablet");
    });

    it("detects generic 'tablet' UA substring", () => {
      expect(detectDeviceType("Mozilla/5.0 some_tablet_device")).toBe("tablet");
    });

    it("detects Android tablet (Android WITHOUT 'mobile')", () => {
      // Android without "mobile" substring is conventionally a tablet.
      expect(
        detectDeviceType(
          "Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 Safari/537.36",
        ),
      ).toBe("tablet");
    });

    it("detects Kindle Silk browser", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (Linux; U; en-us; KFSAWI Build/LVY48F) AppleWebKit/537.36 (KHTML, like Gecko) Silk/3.68",
        ),
      ).toBe("tablet");
    });
  });

  describe("desktop", () => {
    it("detects Chrome on macOS", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ),
      ).toBe("desktop");
    });

    it("detects Firefox on Windows", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        ),
      ).toBe("desktop");
    });

    it("detects Safari on macOS", () => {
      expect(
        detectDeviceType(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        ),
      ).toBe("desktop");
    });

    it("returns desktop for empty user-agent (defensive)", () => {
      expect(detectDeviceType("")).toBe("desktop");
    });

    it("returns desktop for unknown strings", () => {
      expect(detectDeviceType("SomeCustomBot/1.0")).toBe("desktop");
    });
  });
});
