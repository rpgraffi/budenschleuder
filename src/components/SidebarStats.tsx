import React from "react";
import type { ParsedListing } from "@/lib/parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search, ArrowLeftRight, Users, Euro } from "lucide-react";

interface SidebarStatsProps {
  listings: ParsedListing[];
  filteredListings: ParsedListing[];
  listingsMatchingOtherFilters: ParsedListing[];
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  listings,
  filteredListings,
  listingsMatchingOtherFilters
}) => {
  // Aggregate stats
  const total = listings.length;
  const filteredCount = filteredListings.length;

  // Compute category totals based on listings matching other filters (ignoring the category type filter itself)
  const typeCounts = listingsMatchingOtherFilters.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    { SUCHE: 0, BIETE: 0, TAUSCH: 0, WG: 0, KAUF: 0 } as Record<string, number>
  );

  // Calculate average budgets for Searches & Offers based on active filters
  const searchBudgets = listingsMatchingOtherFilters
    .filter(item => item.type === "SUCHE" && item.budget > 0)
    .map(item => item.budget);
  const avgSearchBudget = searchBudgets.length
    ? Math.round(searchBudgets.reduce((a, b) => a + b, 0) / searchBudgets.length)
    : 0;

  const offerBudgets = listingsMatchingOtherFilters
    .filter(item => item.type === "BIETE" && item.budget > 0)
    .map(item => item.budget);
  const avgOfferBudget = offerBudgets.length
    ? Math.round(offerBudgets.reduce((a, b) => a + b, 0) / offerBudgets.length)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Overview KPI Card */}
      <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Database Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {filteredCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              of {total} listings visible
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#0071e3] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(filteredCount / (total || 1)) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories breakdown */}
      <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Suche */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-sky-600 font-medium">
              <Search className="w-3.5 h-3.5" />
              <span>Suche (Search)</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.SUCHE}</span>
          </div>

          {/* Biete */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              <span>Biete (Offer)</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.BIETE}</span>
          </div>

          {/* Tausch */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-600 font-medium">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Tausch (Swap)</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.TAUSCH}</span>
          </div>

          {/* WG */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-600 font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>WG Room</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.WG}</span>
          </div>
        </CardContent>
      </Card>

      {/* Average Budget Card */}
      <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Euro className="w-3.5 h-3.5" /> Average Budgets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Seekers Demand (Suche)</span>
              <span className="font-semibold text-sky-600">{avgSearchBudget} € / mo</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full"
                style={{ width: `${Math.min(100, (avgSearchBudget / 2500) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Offered Rents (Biete)</span>
              <span className="font-semibold text-emerald-600">{avgOfferBudget} € / mo</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${Math.min(100, (avgOfferBudget / 2500) * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
