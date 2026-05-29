import React from "react";
import type { ParsedListing } from "@/lib/parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search, ArrowLeftRight, Users } from "lucide-react";

interface SidebarStatsProps {
  listings: ParsedListing[];
  listingsMatchingOtherFilters: ParsedListing[];
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  listings,
  listingsMatchingOtherFilters
}) => {
  // Aggregate stats
  const total = listings.length;

  // Compute category totals based on listings matching other filters (ignoring the category type filter itself)
  const typeCounts = listingsMatchingOtherFilters.reduce(
    (acc, item) => {
      if (item.type === "REQUEST") acc.SUCHE++;
      if (item.type === "OFFER") acc.BIETE++;
      if (item.type === "SWITCH") acc.TAUSCH++;
      if (item.subType === "WG") acc.WG++;
      return acc;
    },
    { SUCHE: 0, BIETE: 0, TAUSCH: 0, WG: 0 } as Record<string, number>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Categories breakdown */}
      <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Kategorien ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Suche */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-sky-600 font-medium">
              <Search className="w-3.5 h-3.5" />
              <span>Suche</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.SUCHE}</span>
          </div>

          {/* Biete */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              <span>Biete</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.BIETE}</span>
          </div>

          {/* Tausch */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-600 font-medium">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Tausch</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.TAUSCH}</span>
          </div>

          {/* WG */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-600 font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>WG-Zimmer</span>
            </div>
            <span className="font-mono text-slate-700 font-bold">{typeCounts.WG}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
