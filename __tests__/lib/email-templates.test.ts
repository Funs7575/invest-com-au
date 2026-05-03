import { describe, it, expect } from "vitest";
import {
  baseTemplate,
  welcomeEmail,
  feeChangeAlertEmail,
  feeDigestEmail,
  campaignApprovedEmail,
  campaignRejectedEmail,
  lowBalanceEmail,
  weeklyDigestEmail,
  campaignPerformanceEmail,
  brokerWelcomeEmail,
  setupGuideEmail,
  firstCampaignTipsEmail,
  checkInEmail,
  quizFollowUp1Email,
  quizFollowUp2Email,
  quizFollowUp3Email,
  notificationFooter,
  brokerDripEmail4,
  brokerDripEmail5,
} from "@/lib/email-templates";

describe("baseTemplate", () => {
  it("wraps content in a full HTML doc with meta tags", () => {
    const html = baseTemplate("<p>Hello</p>");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain("<p>Hello</p>");
  });

  it("includes the Office viewport block for Outlook compatibility", () => {
    const html = baseTemplate("<p/>");
    expect(html).toContain("mso");
    expect(html).toContain("PixelsPerInch");
  });

  it("adds a hidden preheader block when provided", () => {
    const html = baseTemplate("<p>x</p>", "Check out the latest fees");
    expect(html).toContain("Check out the latest fees");
    expect(html).toContain("display:none");
  });

  it("escapes HTML special chars in the preheader (XSS guard)", () => {
    const html = baseTemplate("<p/>", '<script>alert("x")</script>');
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
  });

  it("omits the preheader block entirely when not provided", () => {
    const html = baseTemplate("<p>x</p>");
    // The preheader wrapper should not appear
    expect(html).not.toContain("display:none");
  });
});

describe("welcomeEmail", () => {
  it("addresses the user by name", () => {
    const html = welcomeEmail("Jane");
    expect(html).toContain("Jane");
    expect(html).toMatch(/Welcome/i);
  });

  it("falls back to 'there' when name is empty", () => {
    const html = welcomeEmail("");
    expect(html).toContain("Hi there");
  });

  it("escapes malicious names (XSS guard)", () => {
    const html = welcomeEmail("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});

describe("feeChangeAlertEmail", () => {
  it("renders a row per change with old/new fee visible", () => {
    const html = feeChangeAlertEmail([
      { broker: "Stake", slug: "stake", oldFee: "$3", newFee: "$5" },
      { broker: "CMC", slug: "cmc", oldFee: "$11", newFee: "$9.90" },
    ]);
    expect(html).toContain("Stake");
    expect(html).toContain("$3");
    expect(html).toContain("$5");
    expect(html).toContain("CMC");
    expect(html).toContain("$11");
    expect(html).toContain("$9.90");
  });

  it("URL-encodes broker slugs in links", () => {
    const html = feeChangeAlertEmail([
      { broker: "Strange Broker", slug: "weird slug", oldFee: "$1", newFee: "$2" },
    ]);
    expect(html).toContain("/go/weird%20slug");
  });

  it("escapes broker display names (XSS guard)", () => {
    const html = feeChangeAlertEmail([
      { broker: "<script>x</script>", slug: "s", oldFee: "$1", newFee: "$2" },
    ]);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("campaignApprovedEmail", () => {
  it("includes campaign name and broker name", () => {
    const html = campaignApprovedEmail("Winter Push", "Stake");
    expect(html).toContain("Winter Push");
    expect(html).toContain("Stake");
    expect(html).toContain("Approved");
  });

  it("escapes XSS in campaign and broker names", () => {
    const html = campaignApprovedEmail('<script>x</script>', '<b>Broker</b>');
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;");
  });
});

describe("campaignRejectedEmail", () => {
  it("includes campaign name and broker name", () => {
    const html = campaignRejectedEmail("Summer Sale", "CMC");
    expect(html).toContain("Summer Sale");
    expect(html).toContain("CMC");
  });

  it("includes reason block when reason is provided", () => {
    const html = campaignRejectedEmail("Summer Sale", "CMC", "Content policy violation");
    expect(html).toContain("Content policy violation");
    expect(html).toContain("Reason");
  });

  it("omits reason block when reason is not provided", () => {
    const html = campaignRejectedEmail("Summer Sale", "CMC");
    expect(html).not.toContain("Content policy violation");
    // The reason label should not appear
    expect(html).not.toContain("policy violation");
  });

  it("escapes XSS in reason field", () => {
    const html = campaignRejectedEmail("X", "Y", "<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});

describe("feeDigestEmail", () => {
  it("renders fee changes with all fields visible", () => {
    const html = feeDigestEmail(
      [{ broker: "Stake", slug: "stake", field: "asx_fee", oldValue: "$3", newValue: "$5", changedAt: "2026-01-15T00:00:00Z" }],
      "Week of 15 Jan 2026"
    );
    expect(html).toContain("Stake");
    expect(html).toContain("$3");
    expect(html).toContain("$5");
    expect(html).toContain("Week of 15 Jan 2026");
  });

  it("capitalises field names from snake_case", () => {
    const html = feeDigestEmail(
      [{ broker: "X", slug: "x", field: "asx_fee", oldValue: "a", newValue: "b", changedAt: "2026-01-01T00:00:00Z" }],
      "Test week"
    );
    expect(html).toContain("Asx Fee");
  });

  it("escapes XSS in broker name", () => {
    const html = feeDigestEmail(
      [{ broker: "<script>xss</script>", slug: "s", field: "f", oldValue: "a", newValue: "b", changedAt: "2026-01-01T00:00:00Z" }],
      "Week"
    );
    expect(html).not.toContain("<script>xss</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("lowBalanceEmail", () => {
  it("shows balance and threshold amounts", () => {
    const html = lowBalanceEmail("Stake", 12.50, 50);
    expect(html).toContain("Stake");
    expect(html).toContain("$12.50");
    expect(html).toContain("$50.00");
  });

  it("shows zero-balance warning block when balance is 0", () => {
    const html = lowBalanceEmail("CMC", 0, 20);
    expect(html).toContain("$0.00");
    expect(html).toContain("paused");
  });

  it("does not show paused warning when balance is positive", () => {
    const html = lowBalanceEmail("CMC", 10, 50);
    expect(html).not.toContain("paused");
  });

  it("escapes broker name (XSS guard)", () => {
    const html = lowBalanceEmail("<b>Bad</b>", 5, 20);
    expect(html).not.toContain("<b>Bad</b>");
    expect(html).toContain("&lt;b&gt;");
  });
});

describe("weeklyDigestEmail", () => {
  it("renders with populated data", () => {
    const html = weeklyDigestEmail({
      feeChanges: [{ broker: "Stake", field: "asx_fee", oldValue: "$3", newValue: "$5" }],
      newArticles: [{ title: "Best ETF Brokers", slug: "best-etf-brokers", category: "Guide", readTime: 5 }],
      activeDeals: [{ broker: "CMC", slug: "cmc", dealText: "Free brokerage", expiry: "31 Dec 2026" }],
    });
    expect(html).toContain("Stake");
    expect(html).toContain("Best ETF Brokers");
    expect(html).toContain("CMC");
    expect(html).toContain("Free brokerage");
    expect(html).toContain("Exp 31 Dec 2026");
  });

  it("shows empty-state messages when arrays are empty", () => {
    const html = weeklyDigestEmail({ feeChanges: [], newArticles: [], activeDeals: [] });
    expect(html).toContain("No fee changes this week");
    expect(html).toContain("No new articles this week");
    expect(html).toContain("No active deals right now");
  });

  it("omits readTime when not provided", () => {
    const html = weeklyDigestEmail({
      feeChanges: [],
      newArticles: [{ title: "Article", slug: "article" }],
      activeDeals: [],
    });
    expect(html).toContain("Article");
    // default category "Guide" should appear
    expect(html).toContain("Guide");
  });

  it("shows 'Ongoing' when deal expiry is absent", () => {
    const html = weeklyDigestEmail({
      feeChanges: [],
      newArticles: [],
      activeDeals: [{ broker: "X", slug: "x", dealText: "Deal" }],
    });
    expect(html).toContain("Ongoing");
  });
});

describe("campaignPerformanceEmail", () => {
  it("renders performance stats", () => {
    const html = campaignPerformanceEmail({
      campaignName: "Spring Campaign",
      clicks: 1234,
      conversions: 56,
      spend: 789.50,
      ctr: 4.5,
    });
    expect(html).toContain("Spring Campaign");
    expect(html).toContain("1,234");
    expect(html).toContain("4.5%");
    expect(html).toContain("$789.50");
  });

  it("shows conversion celebration line when conversions > 0", () => {
    const html = campaignPerformanceEmail({ campaignName: "X", clicks: 100, conversions: 5, spend: 50, ctr: 5 });
    expect(html).toContain("5 conversions tracked yesterday");
  });

  it("omits conversion line when conversions is zero", () => {
    const html = campaignPerformanceEmail({ campaignName: "X", clicks: 50, conversions: 0, spend: 20, ctr: 2 });
    expect(html).not.toContain("conversions tracked yesterday");
  });
});

describe("brokerWelcomeEmail", () => {
  it("addresses broker by name and company", () => {
    const html = brokerWelcomeEmail("Alice", "Stake Pty Ltd");
    expect(html).toContain("Alice");
    expect(html).toContain("Stake Pty Ltd");
    expect(html).toContain("Partner Portal");
  });

  it("falls back to 'there' and 'your company' on empty strings", () => {
    const html = brokerWelcomeEmail("", "");
    expect(html).toContain("Hi there");
    expect(html).toContain("your company");
  });

  it("escapes XSS in broker name", () => {
    const html = brokerWelcomeEmail("<script>x</script>", "Y");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("setupGuideEmail", () => {
  it("produces valid HTML with all steps incomplete", () => {
    const html = setupGuideEmail("Bob", "CMC", false, false, false);
    expect(html).toContain("Bob");
    expect(html).toContain("CMC");
  });

  it("produces valid HTML with all steps complete", () => {
    const html = setupGuideEmail("Bob", "CMC", true, true, true);
    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain("<!DOCTYPE html>");
  });
});

describe("firstCampaignTipsEmail", () => {
  it("includes broker name and campaign tips content", () => {
    const html = firstCampaignTipsEmail("Carol", "SelfWealth");
    expect(html).toContain("Carol");
    expect(html).toContain("SelfWealth");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("falls back gracefully on empty name", () => {
    const html = firstCampaignTipsEmail("", "SelfWealth");
    expect(html).toContain("Hi there");
  });
});

describe("checkInEmail", () => {
  it("shows active campaign content when hasActiveCampaign is true", () => {
    const html = checkInEmail("Dave", "Pearler", true);
    expect(html).toContain("Dave");
    expect(html).toContain("Pearler");
  });

  it("shows inactive campaign content when hasActiveCampaign is false", () => {
    const html = checkInEmail("Dave", "Pearler", false);
    expect(html).toContain("Dave");
    expect(html.length).toBeGreaterThan(100);
  });
});

describe("quizFollowUp1Email", () => {
  it("renders with required fields only", () => {
    const html = quizFollowUp1Email(
      "Eve",
      { name: "Stake", slug: "stake" },
      null,
      null
    );
    expect(html).toContain("Eve");
    expect(html).toContain("Stake");
  });

  it("includes experience level and investment range when provided", () => {
    const html = quizFollowUp1Email(
      "Eve",
      { name: "Stake", slug: "stake", rating: 4.5, asx_fee: "$3", chess_sponsored: true, pros: ["Low fees", "CHESS"] },
      "beginner",
      "$5,000–$20,000"
    );
    expect(html).toContain("beginner");
    expect(html).toContain("$5,000");
  });

  it("shows rating when provided", () => {
    const html = quizFollowUp1Email("X", { name: "Y", slug: "y", rating: 4.2 }, null, null);
    expect(html).toContain("4.2");
  });

  it("shows CHESS sponsored badge when chess_sponsored is true", () => {
    const html = quizFollowUp1Email("X", { name: "Y", slug: "y", chess_sponsored: true }, null, null);
    expect(html).toContain("CHESS");
  });

  it("escapes XSS in broker name", () => {
    const html = quizFollowUp1Email("X", { name: "<script>xss</script>", slug: "s" }, null, null);
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("quizFollowUp2Email", () => {
  it("renders with broker list", () => {
    const html = quizFollowUp2Email(
      "Frank",
      [{ name: "Stake", slug: "stake", rating: 4.5, asx_fee: "$3", us_fee: "$0" }],
      "ETF investing"
    );
    expect(html).toContain("Frank");
    expect(html).toContain("Stake");
    expect(html).toContain("ETF investing");
  });

  it("renders with null tradingInterest", () => {
    const html = quizFollowUp2Email("Frank", [{ name: "CMC", slug: "cmc" }], null);
    expect(html).toContain("Frank");
    expect(html).toContain("CMC");
  });
});

describe("quizFollowUp3Email", () => {
  it("renders with active deal", () => {
    const html = quizFollowUp3Email(
      "Grace",
      { name: "Pearler", slug: "pearler", affiliate_url: "https://pearler.com", deal_text: "First month free" },
      true
    );
    expect(html).toContain("Grace");
    expect(html).toContain("Pearler");
    expect(html).toContain("First month free");
  });

  it("renders without active deal", () => {
    const html = quizFollowUp3Email(
      "Grace",
      { name: "Pearler", slug: "pearler" },
      false
    );
    expect(html).toContain("Grace");
    expect(html.length).toBeGreaterThan(100);
  });
});

describe("notificationFooter", () => {
  it("includes unsubscribe link with encoded email when provided", () => {
    const footer = notificationFooter("test@example.com");
    expect(footer).toContain("test%40example.com");
    expect(footer).toContain("Unsubscribe");
  });

  it("uses generic unsubscribe URL when no email provided", () => {
    const footer = notificationFooter();
    expect(footer).toContain("/unsubscribe");
    expect(footer).not.toContain("?email=");
  });

  it("includes Privacy link", () => {
    const footer = notificationFooter();
    expect(footer).toContain("/privacy");
  });
});

describe("brokerDripEmail4", () => {
  it("renders top broker matches", () => {
    const html = brokerDripEmail4("Helen", [
      { name: "Stake", slug: "stake", tagline: "Best for US shares", asx_fee: "$3", rating: 4.5, affiliateUrl: "https://stake.com.au" },
      { name: "CMC", slug: "cmc", tagline: null, asx_fee: "$11", rating: null, affiliateUrl: "https://cmcmarkets.com" },
    ]);
    expect(html).toContain("Helen");
    expect(html).toContain("Stake");
    expect(html).toContain("Best for US shares");
    expect(html).toContain("CMC");
  });

  it("falls back gracefully on empty name", () => {
    const html = brokerDripEmail4("", []);
    expect(html).toContain("Hi there");
  });
});

describe("brokerDripEmail5", () => {
  it("renders with active deal", () => {
    const html = brokerDripEmail5(
      "Ivan",
      { name: "Stake", slug: "stake", tagline: "Top platform", affiliateUrl: "https://stake.com.au" },
      true,
      "Zero brokerage for 30 days"
    );
    expect(html).toContain("Ivan");
    expect(html).toContain("Stake");
    expect(html).toContain("Zero brokerage for 30 days");
  });

  it("renders without deal", () => {
    const html = brokerDripEmail5(
      "Ivan",
      { name: "Stake", slug: "stake", tagline: null, affiliateUrl: "https://stake.com.au" },
      false
    );
    expect(html).toContain("Ivan");
    expect(html.length).toBeGreaterThan(100);
  });

  it("falls back gracefully on empty name", () => {
    const html = brokerDripEmail5("", { name: "X", slug: "x", tagline: null, affiliateUrl: "https://x.com" }, false);
    expect(html).toContain("Hi there");
  });
});
