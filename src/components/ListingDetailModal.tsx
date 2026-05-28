import React, { useState } from "react";
import type { ParsedListing } from "@/lib/parser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MUNICH_DISTRICTS } from "@/lib/districts";
import { Mail, Phone, Copy, Check, Send, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface ListingDetailModalProps {
  listing: ParsedListing | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!listing) return null;

  // Type-specific theme colors (Apple Light Minimal style)
  const typeColors = {
    SUCHE: "text-sky-600 border-sky-200 bg-sky-50",
    BIETE: "text-emerald-600 border-emerald-200 bg-emerald-50",
    TAUSCH: "text-amber-600 border-amber-200 bg-amber-50",
    WG: "text-purple-600 border-purple-200 bg-purple-50",
    KAUF: "text-rose-600 border-rose-200 bg-rose-50"
  };

  const currentColor = typeColors[listing.type] || typeColors.SUCHE;

  // Copy email to clipboard
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(listing.email);
    setCopied(true);
    toast.success("Email address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Prefilled email body generator (German)
  const getPrefilledEmailBody = (): string => {
    const salutation = listing.name && listing.name !== "Unbekannt" ? `Hallo ${listing.name.split(" ")[0]}` : "Hallo";
    
    if (listing.type === "BIETE") {
      return `${salutation},\n\nich habe Ihre Anzeige vom ${listing.dateText} in der Budenschleuder bezüglich des Angebots in ${
        listing.districts.length > 0 ? MUNICH_DISTRICTS[listing.districts[0]]?.name : "München"
      } gesehen.\n\nIch bin sehr an der Wohnung interessiert und würde mich freuen, Ihnen nähere Informationen über mich zukommen zu lassen bzw. einen Besichtigungstermin zu vereinbaren.\n\nAlle relevanten Unterlagen (Schufa, Gehaltsabrechnungen etc.) liegen mir natürlich vollständig vor.\n\nIch freue mich über eine kurze Rückmeldung!\n\nViele Grüße`;
    }

    if (listing.type === "SUCHE") {
      return `${salutation},\n\nich habe Ihr Gesuch vom ${listing.dateText} in der Budenschleuder bezüglich einer ${
        listing.roomsText
      } Wohnung in ${
        listing.districts.length > 0 ? MUNICH_DISTRICTS[listing.districts[0]]?.name : "München"
      } gesehen.\n\nIch denke, ich hätte ein passendes Wohnungsangebot für Sie bzw. kenne jemanden, der vermietet.\n\nMelden Sie sich gerne bei Interesse, damit wir uns austauschen können!\n\nViele Grüße`;
    }

    if (listing.type === "TAUSCH") {
      return `${salutation},\n\nich habe Ihr Tauschangebot vom ${listing.dateText} in der Budenschleuder gesehen.\n\nIch hätte Interesse an einem Wohnungstausch und würde Ihnen gerne mehr Details über meine jetzige Wohnung zukommen lassen, um zu sehen, ob wir zusammenpassen.\n\nLassen Sie uns gerne kurz austauschen!\n\nViele Grüße`;
    }

    return `${salutation},\n\nich kontaktiere Sie bezüglich Ihres Inserats vom ${listing.dateText} in der aktuellen Budenschleuder.\n\nIch würde mich freuen, von Ihnen zu hören, um Näheres zu besprechen.\n\nViele Grüße`;
  };

  const getPrefilledEmailSubject = (): string => {
    const formattedDate = listing.date.split("-").reverse().join("."); // 2026-05-27 -> 27.05.2026
    return `Budenschleuder: Anzeige vom ${formattedDate} - ${listing.title}`;
  };

  const mailtoUrl = `mailto:${listing.email}?subject=${encodeURIComponent(
    getPrefilledEmailSubject()
  )}&body=${encodeURIComponent(getPrefilledEmailBody())}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 text-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={currentColor}>{listing.type}</Badge>
            {listing.districts.length > 0 ? (
              listing.districts.map((d) => (
                <Badge key={d} variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                  {MUNICH_DISTRICTS[d]?.name || d}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                München Stadt
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
            {listing.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1 flex gap-4">
            <span>Date: <strong className="text-slate-700 font-semibold">{listing.dateText}</strong></span>
            <span>Author: <strong className="text-slate-700 font-semibold">{listing.name}</strong></span>
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Key Specs Section */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/60 rounded-xl my-4 text-center">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Rooms</span>
            <span className="text-lg font-black font-mono text-slate-900 mt-1">{listing.roomsText}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">min: {listing.minRooms} / max: {listing.maxRooms === 99 ? "∞" : listing.maxRooms}</span>
          </div>
          <div className="flex flex-col border-x border-slate-200">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Budget / Warm</span>
            <span className="text-lg font-black font-mono text-slate-900 mt-1">
              {listing.budget > 0 ? `${listing.budget} €` : "n.a."}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">{listing.budgetText ? "Warm rent" : "Rent requested"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Apartment Size</span>
            <span className="text-lg font-black font-mono text-slate-900 mt-1">
              {listing.size > 0 ? `${listing.size} m²` : "n.a."}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">{listing.sizeText ? "Estimated size" : "Size requested"}</span>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" /> Complete Text
          </h4>
          <div className="p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
            {listing.fullText}
          </div>
        </div>

        {/* Attributes Checklist */}
        {listing.tags.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">Extracted Characteristics</h4>
            <div className="flex flex-wrap gap-2">
              {listing.tags.map((tag) => (
                <Badge key={tag} className="bg-slate-100/50 hover:bg-slate-100 text-slate-600 border-slate-200 py-1 px-2.5 text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact details & Prefilled Email composer */}
        <div className="border-t border-slate-100 mt-6 pt-4 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" /> Outreach Composer
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Quick Copy Email */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">Email Address</span>
                <span className="font-mono text-slate-800 font-bold select-all">{listing.email}</span>
              </div>
              <Button size="icon" variant="ghost" className="hover:bg-slate-100 text-slate-500" onClick={handleCopyEmail}>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Quick Copy Phone (if exists) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">Phone Contact</span>
                <span className="font-mono text-slate-800 font-bold">{listing.phone || "Not provided"}</span>
              </div>
              {listing.phone && (
                <Button size="icon" variant="ghost" className="hover:bg-slate-100 text-slate-500">
                  <Phone className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Prefilled Email Draft Box */}
          <div className="p-3 bg-indigo-50/40 border border-indigo-100/80 rounded-xl space-y-3">
            <div className="text-xs text-indigo-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Below is a draft message compiled in German matching their listing criteria. Clicking **Send Email** will launch your native mail client with this content.
              </span>
            </div>
            
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
              <strong>Betreff:</strong> {getPrefilledEmailSubject()}{"\n\n"}
              {getPrefilledEmailBody()}
            </div>

            <Button
              className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs flex items-center justify-center gap-2 py-2 shadow-sm rounded-lg"
              asChild
            >
              <a href={mailtoUrl}>
                <Send className="w-3.5 h-3.5" /> Send Email
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
