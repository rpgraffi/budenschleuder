import React from "react";
import type { ParsedListing } from "@/lib/parser";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MUNICH_DISTRICTS } from "@/lib/districts";
import { Heart, Home, Euro, Maximize, MapPin, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: ParsedListing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onViewDetails: (listing: ParsedListing) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isFavorite,
  onToggleFavorite,
  onViewDetails
}) => {
  // Styles based on listing type
  const typeStyles = {
    SUCHE: {
      badge: "text-sky-600 border-sky-200 bg-sky-50"
    },
    BIETE: {
      badge: "text-emerald-600 border-emerald-200 bg-emerald-50"
    },
    TAUSCH: {
      badge: "text-amber-600 border-amber-200 bg-amber-50"
    },
    WG: {
      badge: "text-purple-600 border-purple-200 bg-purple-50"
    },
    KAUF: {
      badge: "text-rose-600 border-rose-200 bg-rose-50"
    }
  };

  const currentStyle = typeStyles[listing.type] || typeStyles.SUCHE;

  return (
    <Card
      className="bg-white border border-slate-200/65 shadow-sm-clean hover:border-slate-300/80 hover:shadow-md-clean transition-all duration-300 flex flex-col justify-between group overflow-hidden rounded-2xl"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          {/* Listing Category Badge & Date */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[9px] font-bold tracking-wider uppercase", currentStyle.badge)}>
              {listing.type}
            </Badge>
            <span className="text-[10px] text-slate-400 font-medium">
              {listing.dateText}
            </span>
          </div>
          
          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(listing.id);
            }}
            className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-full hover:bg-slate-100"
          >
            <Heart
              className={cn("w-4 h-4 transition-all duration-300", isFavorite && "fill-rose-500 text-rose-500 scale-110")}
            />
          </button>
        </div>

        {/* Listing Title */}
        <CardTitle className="text-sm font-semibold text-slate-800 mt-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {listing.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-1 pb-2 flex-grow flex flex-col justify-between gap-3">
        {/* Core Attributes Row */}
        <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-600">
          {/* Rooms */}
          <div className="flex flex-col items-center justify-center border-r border-slate-200/80">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <Home className="w-2.5 h-2.5 text-slate-400" /> Rooms
            </span>
            <span className="text-xs font-bold font-mono mt-0.5 text-slate-800">
              {listing.roomsText}
            </span>
          </div>

          {/* Budget */}
          <div className="flex flex-col items-center justify-center border-r border-slate-200/80">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <Euro className="w-2.5 h-2.5 text-slate-400" /> Budget
            </span>
            <span className="text-xs font-bold font-mono mt-0.5 text-slate-800">
              {listing.budget > 0 ? `${listing.budget}€` : "n.a."}
            </span>
          </div>

          {/* Size */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <Maximize className="w-2.5 h-2.5 text-slate-400" /> Size
            </span>
            <span className="text-xs font-bold font-mono mt-0.5 text-slate-800 text-center truncate w-full">
              {listing.size > 0 ? `${listing.size}m²` : "n.a."}
            </span>
          </div>
        </div>

        {/* Location / Districts */}
        <div className="flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span className="line-clamp-1">
            {listing.districts.length > 0
              ? listing.districts.map((d) => MUNICH_DISTRICTS[d]?.name || d).join(", ")
              : "München (Gesamt Stadt)"}
          </span>
        </div>

        {/* Description Snippet */}
        <p className="text-[11px] text-slate-500 line-clamp-2 italic leading-relaxed">
          "{listing.fullText}"
        </p>

        {/* Feature Badges */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {listing.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 font-medium"
              >
                {tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="text-[9px] px-1 py-0.5 text-slate-500 font-bold">
                +{listing.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-1">
        <Button
          onClick={() => onViewDetails(listing)}
          variant="secondary"
          size="sm"
          className="w-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/60 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors duration-200"
        >
          <Eye className="w-3.5 h-3.5" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
};
