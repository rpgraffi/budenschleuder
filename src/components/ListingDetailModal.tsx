import React, { useState } from "react";
import type { ParsedListing } from "@/lib/parser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MUNICH_DISTRICTS } from "@/lib/districts";
import { Mail, Phone, Copy, Check, Send } from "lucide-react";
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
    OFFER: "text-emerald-600 border-emerald-200 bg-emerald-50",
    REQUEST: "text-sky-600 border-sky-200 bg-sky-50",
    SWITCH: "text-amber-600 border-amber-200 bg-amber-50"
  };

  const typeLabels = {
    OFFER: "BIETE",
    REQUEST: "SUCHE",
    SWITCH: "TAUSCH"
  };

  const subTypeStyles = {
    APARTMENT: "text-slate-600 border-slate-200 bg-slate-50",
    WG: "text-purple-600 border-purple-200 bg-purple-50",
    BUY: "text-rose-600 border-rose-200 bg-rose-50",
    OFFICE: "text-indigo-600 border-indigo-200 bg-indigo-50",
    HOUSE: "text-teal-600 border-teal-200 bg-teal-50",
    OTHER: "text-slate-500 border-slate-200 bg-slate-50"
  };

  const subTypeLabels = {
    APARTMENT: "Wohnung",
    WG: "WG-Zimmer",
    BUY: "Kauf",
    OFFICE: "Büro/Gewerbe",
    HOUSE: "Haus",
    OTHER: "Sonstiges"
  };

  const currentColor = typeColors[listing.type] || typeColors.REQUEST;
  const currentLabel = typeLabels[listing.type] || "SUCHE";

  // Copy email to clipboard
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(listing.email);
    setCopied(true);
    toast.success("E-Mail-Adresse in die Zwischenablage kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Prefilled email body generator (German)
  const getPrefilledEmailBody = (): string => {
    const salutation = listing.name && listing.name !== "Unbekannt" ? `Hallo ${listing.name.split(" ")[0]}` : "Hallo";
    
    if (listing.type === "OFFER") {
      return `${salutation},\n\nich habe Ihre Anzeige vom ${listing.dateText} in der Budenschleuder bezüglich des Angebots in ${
        listing.districts.length > 0 ? MUNICH_DISTRICTS[listing.districts[0]]?.name : "München"
      } gesehen.\n\nIch bin sehr an der Wohnung interessiert und würde mich freuen, Ihnen nähere Informationen über mich zukommen zu lassen bzw. einen Besichtigungstermin zu vereinbaren.\n\nAlle relevanten Unterlagen (Schufa, Gehaltsabrechnungen etc.) liegen mir natürlich vollständig vor.\n\nIch freue mich über eine kurze Rückmeldung!\n\nViele Grüße`;
    }

    if (listing.type === "REQUEST") {
      return `${salutation},\n\nich habe Ihr Gesuch vom ${listing.dateText} in der Budenschleuder bezüglich einer ${
        listing.roomsText
      } Wohnung in ${
        listing.districts.length > 0 ? MUNICH_DISTRICTS[listing.districts[0]]?.name : "München"
      } gesehen.\n\nIch denke, ich hätte ein passendes Wohnungsangebot für Sie bzw. kenne jemanden, der vermietet.\n\nMelden Sie sich gerne bei Interesse, damit wir uns austauschen können!\n\nViele Grüße`;
    }

    if (listing.type === "SWITCH") {
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
      <DialogContent className="sm:max-w-5xl w-full bg-white border border-slate-200 text-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={currentColor}>{currentLabel}</Badge>
            <Badge className={subTypeStyles[listing.subType] || subTypeStyles.OTHER} variant="outline">
              {subTypeLabels[listing.subType] || listing.subType}
            </Badge>
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
          <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
            {listing.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-slate-700 font-semibold">{listing.dateText}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 font-semibold">{listing.name}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Key Specs Section */}
        <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50 border border-slate-200/60 rounded-2xl my-5 text-center">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Zimmer</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1">{listing.roomsText}</span>
            <span className="text-[9px] text-slate-500 mt-1">min: {listing.minRooms} / max: {listing.maxRooms === 99 ? "∞" : listing.maxRooms}</span>
          </div>
          <div className="flex flex-col justify-center border-x border-slate-200">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Budget (warm)</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1">
              {listing.budget > 0 ? `${listing.budget} €` : "k.A."}
            </span>
            <span className="text-[9px] text-slate-500 mt-1">{listing.budgetText ? "Warmmiete" : "Mietwunsch"}</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Größe</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1">
              {listing.size > 0 ? `${listing.size} m²` : "k.A."}
            </span>
            <span className="text-[9px] text-slate-500 mt-1">{listing.sizeText ? "Geschätzte Größe" : "Größenwunsch"}</span>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans my-4 px-1">
          {listing.fullText}
        </div>

        {/* Attributes Checklist */}
        {listing.tags.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">Extrahierte Eigenschaften</h4>
            <div className="flex flex-wrap gap-2">
              {listing.tags.map((tag) => (
                <Badge key={tag} className="bg-slate-100/50 hover:bg-slate-100 text-slate-600 border-slate-200 py-1 px-2.5 text-[10px] rounded-lg">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact details & Prefilled Email composer */}
        <div className="border-t border-slate-100 mt-6 pt-4 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" /> Kontakt-Composer
          </h4>

          <div className="flex flex-col gap-3">
            {/* Quick Copy Email */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">E-Mail-Adresse</span>
                <span className="font-mono text-slate-800 font-bold select-all text-sm">{listing.email}</span>
              </div>
              <Button size="icon" variant="ghost" className="hover:bg-slate-100 text-slate-500 rounded-lg h-8 w-8" onClick={handleCopyEmail}>
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Quick Copy Phone (if exists) */}
            {listing.phone && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500">Telefonkontakt</span>
                  <span className="font-mono text-slate-800 font-bold text-sm">{listing.phone}</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="hover:bg-slate-100 text-slate-500 rounded-lg h-8 w-8"
                  onClick={() => {
                    navigator.clipboard.writeText(listing.phone!);
                    toast.success("Telefonnummer in die Zwischenablage kopiert!");
                  }}
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Prefilled Email Draft Box */}
          <div className="p-3 bg-indigo-50/40 border border-indigo-100/80 rounded-xl space-y-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
              <strong>Betreff:</strong> {getPrefilledEmailSubject()}{"\n\n"}
              {getPrefilledEmailBody()}
            </div>

            <Button
              className="w-full bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs flex items-center justify-center gap-2 py-2 shadow-sm rounded-lg"
              asChild
            >
              <a href={mailtoUrl}>
                <Send className="w-3.5 h-3.5" /> E-Mail senden
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
