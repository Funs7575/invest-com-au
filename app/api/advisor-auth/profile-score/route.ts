/**
 * GET /api/advisor-auth/profile-score
 *
 * Computes a profile completeness / performance score (0–100) for the
 * authenticated advisor and returns a breakdown for display in the portal.
 *
 * Scoring criteria:
 *   photo_url set (not placeholder)          15 pts
 *   bio length > 100 chars                   10 pts
 *   specialties ≥ 2 items                    10 pts
 *   services ≥ 1 (active)                    10 pts
 *   certifications ≥ 1 (active)               5 pts
 *   booking_link set                         15 pts
 *   review_count ≥ 5                         15 pts
 *   avg_rating ≥ 4.0                         10 pts
 *   website set                               5 pts
 *   afsl_number set                           5 pts
 *                                    Total: 100 pts
 *
 * Rate-limited: 30 requests per hour per advisor.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";

export interface ProfileScoreBreakdownItem {
  label: string;
  points: number;
  earned: boolean;
  tip: string;
}

export interface ProfileScoreResponse {
  score: number;
  maxScore: 100;
  breakdown: ProfileScoreBreakdownItem[];
}

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (await isRateLimited(`profile_score:${advisorId}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();

  const [profileResult, servicesResult, certsResult] = await Promise.all([
    admin
      .from("professionals")
      .select(
        "photo_url, bio, specialties, booking_link, review_count, rating, website, afsl_number"
      )
      .eq("id", advisorId)
      .maybeSingle(),
    admin
      .from("advisor_services")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", advisorId)
      .eq("is_active", true),
    admin
      .from("advisor_certifications")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", advisorId)
      .eq("is_active", true),
  ]);

  if (!profileResult.data) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  const p = profileResult.data;
  const serviceCount = servicesResult.count ?? 0;
  const certCount = certsResult.count ?? 0;

  const hasPhoto =
    typeof p.photo_url === "string" &&
    p.photo_url.length > 0 &&
    !p.photo_url.includes("ui-avatars");

  const bioLength =
    typeof p.bio === "string" ? p.bio.trim().length : 0;

  const specialtiesCount = Array.isArray(p.specialties) ? p.specialties.length : 0;

  const hasBookingLink =
    typeof p.booking_link === "string" && p.booking_link.trim().length > 0;

  const reviewCount =
    typeof p.review_count === "number" ? p.review_count : 0;

  const avgRating =
    typeof p.rating === "number" ? p.rating : 0;

  const hasWebsite =
    typeof p.website === "string" && p.website.trim().length > 0;

  const hasAfsl =
    typeof p.afsl_number === "string" && p.afsl_number.trim().length > 0;

  const breakdown: ProfileScoreBreakdownItem[] = [
    {
      label: "Profile photo",
      points: 15,
      earned: hasPhoto,
      tip: "Upload a professional headshot — advisors with photos get 2.5× more profile clicks.",
    },
    {
      label: "Bio (100+ characters)",
      points: 10,
      earned: bioLength > 100,
      tip: "Write a bio of at least 100 characters describing your background and approach.",
    },
    {
      label: "At least 2 specialties",
      points: 10,
      earned: specialtiesCount >= 2,
      tip: "Add at least 2 specialties so investors can find you in relevant searches.",
    },
    {
      label: "At least 1 service listed",
      points: 10,
      earned: serviceCount >= 1,
      tip: "Add a service to show prospects exactly what you offer and at what price.",
    },
    {
      label: "At least 1 certification",
      points: 5,
      earned: certCount >= 1,
      tip: "Add a qualification or certification to build credibility with potential clients.",
    },
    {
      label: "Booking link",
      points: 15,
      earned: hasBookingLink,
      tip: "Add a booking link so investors can schedule a consultation directly from your profile.",
    },
    {
      label: "5+ reviews",
      points: 15,
      earned: reviewCount >= 5,
      tip: "Ask satisfied clients for reviews — profiles with 5+ reviews convert significantly better.",
    },
    {
      label: "Average rating ≥ 4.0",
      points: 10,
      earned: avgRating >= 4.0,
      tip: "Maintain a rating of 4.0 or higher to maximise trust with new enquiries.",
    },
    {
      label: "Website",
      points: 5,
      earned: hasWebsite,
      tip: "Add your website URL so prospects can learn more about your firm.",
    },
    {
      label: "AFSL number",
      points: 5,
      earned: hasAfsl,
      tip: "Add your AFSL number to demonstrate regulatory compliance and build trust.",
    },
  ];

  const score = breakdown.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0);

  const response: ProfileScoreResponse = {
    score,
    maxScore: 100,
    breakdown,
  };

  return NextResponse.json(response);
}
