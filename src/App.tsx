import { useState, useEffect, useMemo } from "react";
import { MUNICH_DISTRICTS } from "@/lib/districts";
import { type ParsedListing } from "@/lib/parser";
import { SidebarStats } from "@/components/SidebarStats";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { ParserTerminal } from "@/components/ParserTerminal";
import { cn } from "@/lib/utils";

import { Toaster } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { 
  Search, 
  Terminal as TerminalIcon, 
  Heart, 
  SlidersHorizontal, 
  RotateCcw,
  PlusCircle,
  CalendarX
} from "lucide-react";

export default function App() {
  // --- 1. State Declarations ---
  const [batches, setBatches] = useState<Record<string, ParsedListing[]>>({});
  const [activeBatchId, setActiveBatchId] = useState<string>("ALL");
  const [existingBatchIds, setExistingBatchIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("explorer");
  
  // Filtering States
  const [typeFilter, setTypeFilter] = useState<string>("OFFER");
  const [subTypeFilter, setSubTypeFilter] = useState<string>("ALL");
  const [roomsFilter, setRoomsFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [showOnlyFavs, setShowOnlyFavs] = useState<boolean>(false);
  const [excludeTemporary, setExcludeTemporary] = useState<boolean>(true);

  // Detail Modal State
  const [selectedListing, setSelectedListing] = useState<ParsedListing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 2. Initial Database Load ---
  useEffect(() => {
    // Fetch the unified catalog & listings from Vercel Serverless Edge Config API
    fetch("/api/get-batches")
      .then((res) => {
        if (!res.ok) throw new Error("API catalog fetch failed");
        return res.json();
      })
      .then((data: { catalog: string[]; batches: Record<string, ParsedListing[]>; mode: string }) => {
        const catalog = data.catalog || [];
        const batchesData = data.batches || {};

        setExistingBatchIds(catalog);
        setBatches(batchesData);

        // Set initial active batch ID preference if stored
        const savedActiveBatch = localStorage.getItem("budenschleuder_active_batch_id");
        const initialBatch = savedActiveBatch && (catalog.includes(savedActiveBatch) || savedActiveBatch === "ALL")
          ? savedActiveBatch
          : (catalog[0] || "ALL");
        setActiveBatchId(initialBatch);
      })
      .catch((e) => {
        console.error("Failed to load batches from serverless Edge Config API:", e);
      });

    // Load favorites from LocalStorage
    const savedFavs = localStorage.getItem("budenschleuder_favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Failed to parse favorites:", e);
      }
    }
  }, []);

  // --- 3. Persistent Batch & Tab Actions ---
  const handleImportBatch = (batchId: string, newListings: ParsedListing[]) => {
    // Update catalog lists
    setExistingBatchIds((prev) => {
      if (!prev.includes(batchId)) {
        return [...prev, batchId].sort((a, b) => b.localeCompare(a));
      }
      return prev;
    });

    // Update memory cache
    setBatches((prev) => ({
      ...prev,
      [batchId]: newListings
    }));

    // Switch view context
    setActiveBatchId(batchId);
    localStorage.setItem("budenschleuder_active_batch_id", batchId);
    setActiveTab("explorer");
  };

  const handleSelectBatch = (batchId: string) => {
    setActiveBatchId(batchId);
    localStorage.setItem("budenschleuder_active_batch_id", batchId);
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) 
        ? prev.filter((item) => item !== id) 
        : [...prev, id];
      localStorage.setItem("budenschleuder_favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetFilters = () => {
    setTypeFilter("OFFER");
    setSubTypeFilter("ALL");
    setRoomsFilter("ALL");
    setDistrictFilter("ALL");
    setShowOnlyFavs(false);
    setExcludeTemporary(true);
  };

  // --- 4. Resolve Active Listings Set ---
  const listings = useMemo(() => {
    if (activeBatchId === "ALL") {
      return Object.values(batches).flat();
    }
    return batches[activeBatchId] || [];
  }, [batches, activeBatchId]);

  // --- 5. Real-Time Listings Matching Other Filters (Excluding category Type filter) ---
  const listingsMatchingOtherFilters = useMemo(() => {
    return listings.filter((item) => {
      // A. Rooms Filter
      if (roomsFilter !== "ALL") {
        const requiredRooms = parseFloat(roomsFilter);
        if (item.maxRooms < requiredRooms) return false;
      }

      // B. District Filter
      if (districtFilter !== "ALL" && !item.districts.includes(districtFilter)) return false;

      // C. Exclude Befristet / Temporary
      if (excludeTemporary && (item.features?.temporary || item.tags.includes("Befristet"))) return false;

      // D. Favorites Only
      if (showOnlyFavs && !favorites.includes(item.id)) return false;

      return true;
    });
  }, [listings, roomsFilter, districtFilter, excludeTemporary, showOnlyFavs, favorites]);

  // --- 6. Core Reactive Filtering Logic ---
  const filteredListings = useMemo(() => {
    return listingsMatchingOtherFilters.filter((item) => {
      // A. Overarching Type Filter
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;

      // B. Underarching Sub-Type Filter
      if (subTypeFilter !== "ALL" && item.subType !== subTypeFilter) return false;

      return true;
    });
  }, [listingsMatchingOtherFilters, typeFilter, subTypeFilter]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-900 flex flex-col font-sans relative pb-10">
      
      {/* --- Main Dashboard Body --- */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex-grow flex flex-col pt-6">
        
        {/* Header Branding */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5 shrink-0">
          <div className="flex items-center gap-4">
            {/* Native dropdown selector acting as the main header title */}
            {existingBatchIds.length > 0 && (
              <select
                value={activeBatchId}
                onChange={(e) => handleSelectBatch(e.target.value)}
                className="bg-transparent border-none text-xl md:text-2xl font-bold text-slate-900 tracking-tight focus:outline-none hover:cursor-pointer transition-colors py-1 focus:ring-0 select-header"
              >
                <option value="ALL">Budenschleuder — Alle Ausgaben</option>
                {existingBatchIds.map((id) => (
                  <option key={id} value={id}>Budenschleuder — Ausgabe {id}</option>
                ))}
              </select>
            )}
          </div>
          
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-slate-200/50 border border-slate-300/40 p-1 rounded-xl">
              <TabsTrigger value="explorer" className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <Search className="w-3.5 h-3.5 mr-1.5" /> Explorer
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <TerminalIcon className="w-3.5 h-3.5 mr-1.5" /> Importieren
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {/* Outer Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start flex-grow">
          
          {/* Left Column: Sidebar Widgets (Stats summary) */}
          <aside className="lg:col-span-1 flex flex-col gap-5 h-full">
            <SidebarStats
              listings={listings}
              listingsMatchingOtherFilters={listingsMatchingOtherFilters}
            />
          </aside>

          {/* Right Area: Core Views Grid */}
          <main className="lg:col-span-3 flex flex-col h-full gap-5">
            
            {/* View 1: EXPLORER TAB */}
            {activeTab === "explorer" && (
              <div className="space-y-4">
                
                {/* Zero State Landings */}
                {existingBatchIds.length === 0 ? (
                  <Card className="bg-white border border-slate-200/80 p-20 text-center rounded-2xl shadow-sm-clean">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-4">
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-400 shadow-sm-clean animate-pulse">
                        <TerminalIcon className="w-10 h-10 text-[#0071e3]" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Keine Inserate-Datenbank gefunden</h3>
                      <p className="text-xs leading-relaxed text-slate-500">
                        Die Inserate-Datenbank ist derzeit leer. Gehe zum Import-Bereich und füge deine erste Newsletter-Ausgabe ein, um sie für alle Nutzer zu speichern!
                      </p>
                      <Button
                        onClick={() => setActiveTab("import")}
                        className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs py-2.5 px-5 mt-2 rounded-xl shadow-sm-clean transition-colors flex items-center gap-2 hover:cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" /> Zum Import-Bereich
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Search & Advanced Multi-Filter controls bar */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl">
                      <CardContent className="px-4 py-2.5 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                               {/* Listing Type Selector */}
                          <div className="md:col-span-3">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-850 h-9 text-xs rounded-xl shadow-sm-clean">
                                <SelectValue placeholder="Typ" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">Alle Typen</SelectItem>
                                <SelectItem value="OFFER">Biete (Angebote)</SelectItem>
                                <SelectItem value="REQUEST">Suche (Gesuche)</SelectItem>
                                <SelectItem value="SWITCH">Tausch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Listing SubType Selector */}
                          <div className="md:col-span-3">
                            <Select value={subTypeFilter} onValueChange={setSubTypeFilter}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-850 h-9 text-xs rounded-xl shadow-sm-clean">
                                <SelectValue placeholder="Objektart" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">Alle Objektarten</SelectItem>
                                <SelectItem value="APARTMENT">Wohnung</SelectItem>
                                <SelectItem value="WG">WG-Zimmer</SelectItem>
                                <SelectItem value="BUY">Kaufgesuch</SelectItem>
                                <SelectItem value="OFFICE">Büro/Gewerbe</SelectItem>
                                <SelectItem value="HOUSE">Haus</SelectItem>
                                <SelectItem value="OTHER">Sonstiges</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Rooms Selector */}
                          <div className="md:col-span-2">
                            <Select value={roomsFilter} onValueChange={setRoomsFilter}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-850 h-9 text-xs rounded-xl shadow-sm-clean">
                                <SelectValue placeholder="Zimmeranzahl" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-855 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">Beliebige Zimmer</SelectItem>
                                <SelectItem value="1">1+ Zimmer</SelectItem>
                                <SelectItem value="2">2+ Zimmer</SelectItem>
                                <SelectItem value="3">3+ Zimmer</SelectItem>
                                <SelectItem value="4">4+ Zimmer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* District Selector */}
                          <div className="md:col-span-2">
                            <Select value={districtFilter} onValueChange={setDistrictFilter}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-9 text-xs rounded-xl shadow-sm-clean">
                                <SelectValue placeholder="Stadtteil" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-850 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">Beliebiger Stadtteil</SelectItem>
                                {Object.entries(MUNICH_DISTRICTS).map(([key, value]) => (
                                  <SelectItem key={key} value={key}>
                                    {value.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Reset and Bookmarks Filter Row */}
                          <div className="md:col-span-2 flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setExcludeTemporary(!excludeTemporary)}
                              className={cn(
                                "h-9 w-9 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-500 rounded-xl shadow-sm-clean transition-colors",
                                excludeTemporary && "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100/50"
                              )}
                              title="Befristete Inserate ausblenden"
                            >
                              <CalendarX className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setShowOnlyFavs(!showOnlyFavs)}
                              className={cn(
                                "h-9 w-9 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-rose-500 rounded-xl shadow-sm-clean transition-colors",
                                showOnlyFavs && "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/50"
                              )}
                              title="Nur Favoriten anzeigen"
                            >
                              <Heart className="w-4 h-4 fill-current" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleResetFilters}
                              className="h-9 w-9 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl shadow-sm-clean transition-colors"
                              title="Filter zurücksetzen"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                      </CardContent>
                    </Card>

                    {/* Listings Results Grid / List */}
                    {filteredListings.length === 0 ? (
                      <Card className="bg-slate-50 border border-slate-200/60 p-16 text-center text-slate-500 rounded-2xl shadow-inner-clean">
                        <SlidersHorizontal className="w-10 h-10 mx-auto opacity-40 text-slate-400 mb-3" />
                        <h3 className="font-bold text-slate-800 text-sm mb-1">Keine Inserate gefunden</h3>
                        <p className="text-xs max-w-sm mx-auto leading-relaxed text-slate-500">
                          Keine Inserate entsprechen deinen aktuellen Suchbegriffen, Kategorien oder Filtereinstellungen. Setze die Filter zurück, um mehr Inserate zu sehen.
                        </p>
                        <Button
                          onClick={handleResetFilters}
                          className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs py-2 px-4 mt-4 rounded-xl shadow-sm-clean transition-colors hover:cursor-pointer"
                        >
                          Aktive Filter zurücksetzen
                        </Button>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredListings.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            isFavorite={favorites.includes(listing.id)}
                            onToggleFavorite={handleToggleFavorite}
                            onViewDetails={(item) => {
                              setSelectedListing(item);
                              setIsModalOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* View 3: IMPORT TAB */}
            {activeTab === "import" && (
              <ParserTerminal 
                existingBatches={existingBatchIds}
                onImportBatch={handleImportBatch}
                onSelectBatch={handleSelectBatch}
              />
            )}
          </main>
        </div>
      </div>

      {/* Housing Details Dialogue Modal overlay */}
      <ListingDetailModal
        listing={selectedListing}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedListing(null);
        }}
      />

      {/* shadcn Sonner alert engine */}
      <Toaster theme="light" position="bottom-right" toastOptions={{
        className: "bg-white border border-slate-200 text-slate-850 shadow-lg-clean rounded-xl"
      }} />
    </div>
  );
}
