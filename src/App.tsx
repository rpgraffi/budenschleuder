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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { 
  Building2, 
  Search, 
  Terminal as TerminalIcon, 
  Bookmark, 
  SlidersHorizontal, 
  RotateCcw,
  X,
  PlusCircle
} from "lucide-react";

export default function App() {
  // --- 1. State Declarations ---
  const [batches, setBatches] = useState<Record<string, ParsedListing[]>>({});
  const [activeBatchId, setActiveBatchId] = useState<string>("ALL");
  const [existingBatchIds, setExistingBatchIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("explorer");
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("BIETE");
  const [roomsFilter, setRoomsFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [maxBudget, setMaxBudget] = useState<number>(3000);
  const [showOnlyFavs, setShowOnlyFavs] = useState<boolean>(false);

  // Detail Modal State
  const [selectedListing, setSelectedListing] = useState<ParsedListing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 2. Initial Database Load ---
  useEffect(() => {
    // 1. Fetch available batches catalog from public directory
    fetch("/data/batches.json")
      .then((res) => {
        if (!res.ok) throw new Error("Catalog index not found");
        return res.json();
      })
      .then((catalog: string[]) => {
        setExistingBatchIds(catalog);
        
        // Load active batch ID preference if stored
        const savedActiveBatch = localStorage.getItem("budenschleuder_active_batch_id");
        const initialBatch = savedActiveBatch && (catalog.includes(savedActiveBatch) || savedActiveBatch === "ALL")
          ? savedActiveBatch
          : (catalog[0] || "ALL");
        
        setActiveBatchId(initialBatch);
        
        // 2. Load listings data for each batch in the catalog
        catalog.forEach((batchId) => {
          fetch(`/data/batch/${batchId}.json`)
            .then((res) => {
              if (!res.ok) throw new Error(`Listing file not found for ${batchId}`);
              return res.json();
            })
            .then((listings) => {
              setBatches((prev) => ({ ...prev, [batchId]: listings }));
            })
            .catch((e) => console.error(`Failed to load listings for batch ${batchId}:`, e));
        });
      })
      .catch((e) => {
        console.error("Failed to load batches catalog from public/data/batches.json:", e);
        setExistingBatchIds([]);
        setActiveBatchId("ALL");
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
    setSearchQuery("");
    setTypeFilter("ALL");
    setRoomsFilter("ALL");
    setDistrictFilter("ALL");
    setMaxBudget(3000);
    setShowOnlyFavs(false);
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
      // A. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = item.fullText.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // B. Rooms Filter
      if (roomsFilter !== "ALL") {
        const requiredRooms = parseFloat(roomsFilter);
        if (item.maxRooms < requiredRooms) return false;
      }

      // C. District Filter
      if (districtFilter !== "ALL" && !item.districts.includes(districtFilter)) return false;

      // D. Budget Filter
      if (item.budget > 0 && item.budget > maxBudget) return false;

      // E. Favorites Only
      if (showOnlyFavs && !favorites.includes(item.id)) return false;

      return true;
    });
  }, [listings, searchQuery, roomsFilter, districtFilter, maxBudget, showOnlyFavs, favorites]);

  // --- 6. Core Reactive Filtering Logic ---
  const filteredListings = useMemo(() => {
    return listingsMatchingOtherFilters.filter((item) => {
      // Category Type Filter
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      return true;
    });
  }, [listingsMatchingOtherFilters, typeFilter]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-900 flex flex-col font-sans relative pb-10">
      
      {/* --- Main Dashboard Body --- */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex-grow flex flex-col pt-6">
        
        {/* Header Branding */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Budenschleuder
                </h1>
                
                {/* Elegant Batch selector dropdown inside Header */}
                {existingBatchIds.length > 0 && (
                  <div className="flex items-center ml-1">
                    <Select value={activeBatchId} onValueChange={handleSelectBatch}>
                      <SelectTrigger className="w-[180px] bg-slate-200/50 border-slate-300 text-slate-800 text-xs rounded-full shadow-sm-clean h-7 font-bold px-3 focus-visible:ring-slate-300 hover:bg-slate-200/80 hover:cursor-pointer transition-colors">
                        <SelectValue placeholder="Select Issue" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-850 text-xs rounded-xl shadow-md-clean">
                        <SelectItem value="ALL">All Combined Issues</SelectItem>
                        {existingBatchIds.map((id) => (
                          <SelectItem key={id} value={id}>Issue {id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Munich's Housing Newsletter Database - Processed once, shared by all
              </p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-slate-200/50 border border-slate-300/40 p-1 rounded-xl">
              <TabsTrigger value="explorer" className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <Search className="w-3.5 h-3.5 mr-1.5" /> Explorer
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                <TerminalIcon className="w-3.5 h-3.5 mr-1.5" /> Import Paste
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
              filteredListings={filteredListings}
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
                      <h3 className="font-extrabold text-slate-900 text-lg">No Housing Database Found</h3>
                      <p className="text-xs leading-relaxed text-slate-500">
                        The explorer catalog is currently empty. To get started and save parsed issues directly to the local filesystem for all users, drag-and-drop or paste your first newsletter issue in the import terminal!
                      </p>
                      <Button
                        onClick={() => setActiveTab("import")}
                        className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs py-2.5 px-5 mt-2 rounded-xl shadow-sm-clean transition-colors flex items-center gap-2 hover:cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" /> Go to Import Console
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Search & Advanced Multi-Filter controls bar */}
                    <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl">
                      <CardContent className="p-4 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          
                          {/* Search Query */}
                          <div className="md:col-span-4 relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                              placeholder="Search keyword, name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-slate-300 h-9 text-xs rounded-xl shadow-sm-clean"
                            />
                          </div>

                          {/* Listing Category Selector */}
                          <div className="md:col-span-2">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-9 text-xs rounded-xl shadow-sm-clean">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">All Categories</SelectItem>
                                <SelectItem value="SUCHE">Suche (Search)</SelectItem>
                                <SelectItem value="BIETE">Biete (Offer)</SelectItem>
                                <SelectItem value="TAUSCH">Tausch (Swap)</SelectItem>
                                <SelectItem value="WG">WG Room</SelectItem>
                                <SelectItem value="KAUF">Kaufgesuch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Rooms Selector */}
                          <div className="md:col-span-2">
                            <Select value={roomsFilter} onValueChange={setRoomsFilter}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 h-9 text-xs rounded-xl shadow-sm-clean">
                                <SelectValue placeholder="Min Rooms" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-850 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">Any Rooms</SelectItem>
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
                                <SelectValue placeholder="District" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 text-slate-805 text-xs rounded-xl shadow-md-clean">
                                <SelectItem value="ALL">Any District</SelectItem>
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
                              onClick={() => setShowOnlyFavs(!showOnlyFavs)}
                              className={cn(
                                "h-9 w-9 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-rose-500 rounded-xl shadow-sm-clean transition-colors",
                                showOnlyFavs && "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/50"
                              )}
                            >
                              <Bookmark className="w-4 h-4 fill-current" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleResetFilters}
                              className="h-9 w-9 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl shadow-sm-clean transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Advanced Slider Row (Budget limit) */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-500 text-xs shrink-0 font-medium">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                            <span>Maximum budget (Rent):</span>
                            <span className="font-bold font-mono text-slate-800 text-xs bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60 shadow-sm-clean">
                              {maxBudget === 3000 ? "No Limit" : `${maxBudget} €`}
                            </span>
                          </div>
                          <div className="w-full flex items-center h-5">
                            <Slider
                              defaultValue={[3000]}
                              max={3000}
                              min={300}
                              step={50}
                              value={[maxBudget]}
                              onValueChange={(val) => setMaxBudget(val[0])}
                              className="w-full hover:cursor-pointer apple-slider"
                            />
                          </div>
                        </div>

                        {/* Active Filters Pill Summary Row */}
                        {(searchQuery || typeFilter !== "ALL" || roomsFilter !== "ALL" || districtFilter !== "ALL" || maxBudget < 3000 || showOnlyFavs) && (
                          <div className="flex flex-wrap gap-1.5 items-center pt-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5 select-none">Active Filters:</span>
                            {searchQuery && (
                              <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-[10px] text-slate-600 pr-1.5 gap-1.5 py-0.5 rounded-lg font-medium shadow-sm-clean">
                                Q: "{searchQuery}"
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setSearchQuery("")} />
                              </Badge>
                            )}
                            {typeFilter !== "ALL" && (
                              <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-[10px] text-slate-600 pr-1.5 gap-1.5 py-0.5 rounded-lg font-medium shadow-sm-clean">
                                Type: {typeFilter}
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setTypeFilter("ALL")} />
                              </Badge>
                            )}
                            {roomsFilter !== "ALL" && (
                              <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-[10px] text-slate-600 pr-1.5 gap-1.5 py-0.5 rounded-lg font-medium shadow-sm-clean">
                                Rooms: {roomsFilter}+
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setRoomsFilter("ALL")} />
                              </Badge>
                            )}
                            {districtFilter !== "ALL" && (
                              <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-[10px] text-slate-600 pr-1.5 gap-1.5 py-0.5 rounded-lg font-medium shadow-sm-clean">
                                Loc: {MUNICH_DISTRICTS[districtFilter]?.name || districtFilter}
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setDistrictFilter("ALL")} />
                              </Badge>
                            )}
                            {maxBudget < 3000 && (
                              <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-[10px] text-slate-600 pr-1.5 gap-1.5 py-0.5 rounded-lg font-medium shadow-sm-clean">
                                Max Rent: {maxBudget}€
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setMaxBudget(3000)} />
                              </Badge>
                            )}
                            {showOnlyFavs && (
                              <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-[10px] text-slate-600 pr-1.5 gap-1.5 py-0.5 rounded-lg font-medium shadow-sm-clean">
                                Favorites Only
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setShowOnlyFavs(false)} />
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Listings Results Grid / List */}
                    {filteredListings.length === 0 ? (
                      <Card className="bg-slate-50 border border-slate-200/60 p-16 text-center text-slate-500 rounded-2xl shadow-inner-clean">
                        <SlidersHorizontal className="w-10 h-10 mx-auto opacity-40 text-slate-400 mb-3" />
                        <h3 className="font-bold text-slate-800 text-sm mb-1">No Listings Found</h3>
                        <p className="text-xs max-w-sm mx-auto leading-relaxed text-slate-500">
                          No parsed advertisements match your current search terms, category filters, or location parameters. Try resetting your filters to explore.
                        </p>
                        <Button
                          onClick={handleResetFilters}
                          className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs py-2 px-4 mt-4 rounded-xl shadow-sm-clean transition-colors hover:cursor-pointer"
                        >
                          Reset Active Filters
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
