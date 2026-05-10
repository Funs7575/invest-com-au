import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";
import { getAllCategorySlugs } from "@/lib/best-broker-categories";
import { getAllCostScenarioSlugs } from "@/lib/cost-scenarios";
import { getAllCitySlugs } from "@/lib/cities";
import { getAllGuideSlugs } from "@/lib/how-to-guides";
import {
  getOpportunityCategories,
  getAllSubcategorySlugs,
} from "@/lib/invest-categories";
import { listingUrl } from "@/lib/listing-url";
import type { InvestListingVertical, PlatformType } from "@/lib/types";
import { generateVersusPairs } from "@/lib/versus-pairs";
import { BCP47_TAG } from "@/lib/i18n/locales";
