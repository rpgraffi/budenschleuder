import React, { useState, useEffect, useRef } from "react";
import { parseNewsletterWithAI, extractBatchId, type ParsedListing } from "@/lib/parser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal, RefreshCw, CheckCircle2, Play, Upload } from "lucide-react";
import { toast } from "sonner";

interface ParserTerminalProps {
  existingBatches: string[];
  onImportBatch: (batchId: string, listings: ParsedListing[]) => void;
  onSelectBatch: (batchId: string) => void;
}

export const ParserTerminal: React.FC<ParserTerminalProps> = ({
  existingBatches,
  onImportBatch,
  onSelectBatch
}) => {
  const [inputText, setInputText] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load API Key purely from Vite defining/localStorage/Developer fallback
  const apiKey = (import.meta.env.GEMINI_API_KEY as string) || localStorage.getItem("budenschleuder_gemini_key") || "AIzaSyBQ585dZ-b-5Cfhyi2tRflJHUUPjSwf8uM";

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // --- Drag and Drop File Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fileName = file.name;
      const fileExtension = fileName.split(".").pop()?.toLowerCase();

      if (fileExtension !== "txt" && fileExtension !== "eml") {
        toast.error("Unsupported file type! Please drop a .txt or .eml file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
        
        const batchId = extractBatchId(text);
        setLogs((prev) => [
          ...prev,
          `[SYSTEM] Drag & drop detected: successfully loaded "${fileName}" (${Math.round(file.size / 100) / 10} kB).`,
          `[SYSTEM] Extracted batch ID: "${batchId}".`
        ]);
        toast.success(`Successfully loaded ${fileName}!`);
      };
      reader.onerror = () => {
        toast.error("Failed to read the dropped file!");
      };
      reader.readAsText(file);
    }
  };

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast.error("Please paste content or drop a file first!");
      return;
    }

    const batchId = extractBatchId(inputText);
    setLogs([]);
    setIsParsing(true);
    setCompleted(false);

    try {
      setLogs((prev) => [...prev, "[SYSTEM] Initializing Budenschleuder Ingestion Engine..."]);
      await new Promise((r) => setTimeout(r, 300));

      setLogs((prev) => [
        ...prev,
        `[SYSTEM] Checking database for batch ID: "${batchId}"...`
      ]);
      await new Promise((r) => setTimeout(r, 400));

      // Deterministic duplicate check
      if (existingBatches.includes(batchId)) {
        setLogs((prev) => [
          ...prev,
          `[INFO] Deterministic check: Batch "${batchId}" is ALREADY available in database.`,
          `[SUCCESS] Switched to existing batch "${batchId}".`,
          `[SYSTEM] Skipped Gemini AI parsing to conserve API usage.`
        ]);
        toast.info(`Batch "${batchId}" already loaded. Switched to it.`);
        
        onSelectBatch(batchId);
        setCompleted(true);
        setIsParsing(false);
        return;
      }

      // If not present, run Gemini AI parsing!
      if (!apiKey.trim()) {
        toast.error("No Gemini API Key found in .env configurations! Ingestion aborted.");
        setLogs((prev) => [
          ...prev,
          `[ERROR] Missing Ingestion credentials: GEMINI_API_KEY is not defined in your environment (.env file).`,
          `[SYSTEM] Ingestion aborted.`
        ]);
        setIsParsing(false);
        return;
      }

      setLogs((prev) => [
        ...prev,
        `[INFO] Batch "${batchId}" is new. Commencing Gemini AI Ingestion...`,
        `[INFO] Model targeted: gemini-3.1-flash-lite`,
        `[SYSTEM] Formulating zero-shot JSON-constrained prompt...`
      ]);
      await new Promise((r) => setTimeout(r, 400));

      setLogs((prev) => [...prev, `[INFO] Connecting to Google Generative Language services...`]);
      await new Promise((r) => setTimeout(r, 350));

      setLogs((prev) => [...prev, `[AI] Transmitting unstructured text stream (${Math.round(inputText.length / 100) / 10} kB)...`]);
      await new Promise((r) => setTimeout(r, 200));

      setLogs((prev) => [...prev, `[AI] Model is compiling and reasoning over housing rules...`]);

      const parsed = await parseNewsletterWithAI(inputText, apiKey);

      setLogs((prev) => [...prev, `[SUCCESS] Received high-fidelity JSON payload from Gemini API.`]);
      await new Promise((r) => setTimeout(r, 300));

      setLogs((prev) => [...prev, `[SYSTEM] Found ${parsed.length} cognitive housing blocks.`]);
      await new Promise((r) => setTimeout(r, 300));

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        setLogs((prev) => [
          ...prev,
          `[EXTRACT] Block #${i + 1} | Type: ${item.type} | Name: ${item.name} | Contact: ${item.email}`
        ]);
        await new Promise((r) => setTimeout(r, 100));
      }

      // Save parsed listings directly to public/data/batch/ folder via local Vite POST API
      setLogs((prev) => [
        ...prev,
        `[SYSTEM] Connecting to local server API to persist batch...`
      ]);
      await new Promise((r) => setTimeout(r, 200));

      try {
        const saveRes = await fetch("/api/save-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            batchId,
            listings: parsed
          })
        });

        if (saveRes.ok) {
          setLogs((prev) => [
            ...prev,
            `[SUCCESS] File successfully saved to: public/data/batch/${batchId}.json`,
            `[SUCCESS] Registered in: public/data/batches.json`,
            `[SYSTEM] Injecting ${parsed.length} structured listings into explorer...`
          ]);
          onImportBatch(batchId, parsed);
        } else {
          const errText = await saveRes.text();
          throw new Error(errText);
        }
      } catch (e) {
        // Fallback to local storage persistence! (Normal when running on static Vercel servers)
        setLogs((prev) => [
          ...prev,
          `[WARNING] Local filesystem write failed (serverless/Vercel production environment).`,
          `[SYSTEM] Falling back to browser LocalStorage persistence...`
        ]);

        const savedBatchesStr = localStorage.getItem("budenschleuder_local_batches") || "{}";
        let localBatches: Record<string, ParsedListing[]> = {};
        try {
          localBatches = JSON.parse(savedBatchesStr);
        } catch (e) {
          localBatches = {};
        }
        localBatches[batchId] = parsed;
        localStorage.setItem("budenschleuder_local_batches", JSON.stringify(localBatches));

        setLogs((prev) => [
          ...prev,
          `[SUCCESS] Batch "${batchId}" successfully saved in your browser storage.`,
          `[SYSTEM] Injecting ${parsed.length} structured listings into explorer...`
        ]);

        onImportBatch(batchId, parsed);
      }

      setCompleted(true);
      toast.success(`AI successfully ingested & saved listings for ${batchId}!`);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        `[ERROR] AI Ingestion Exception: ${(error as Error).message}`,
        `[SYSTEM] Please check your Gemini API key in your .env file, network connection, or text layout.`,
        `[SYSTEM] Ingestion aborted.`
      ]);
      toast.error("AI parsing failed! View console logs.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setLogs([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Paste & Drop Area Card */}
      <Card 
        className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl flex flex-col h-[520px] relative overflow-hidden"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
      >
        {/* Blurry drag active overlay */}
        {isDragging && (
          <div 
            className="absolute inset-0 bg-white/90 backdrop-blur-sm border-2 border-dashed border-[#0071e3] rounded-2xl flex flex-col items-center justify-center gap-3 z-50 transition-all duration-200"
            onDragLeave={handleDrag}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="p-4 bg-sky-50 rounded-full border border-sky-100 text-[#0071e3] animate-bounce">
              <Upload className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-slate-800">Drop your newsletter file</span>
            <span className="text-xs text-slate-500">Supports .txt or .eml files</span>
          </div>
        )}

        <CardHeader className="pb-3 shrink-0">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0071e3]" /> Import Housing Issue
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Paste email text or drag-and-drop a <strong className="text-slate-700">.txt</strong> or <strong className="text-slate-700">.eml</strong> file below to extract listings.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0 flex flex-col gap-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isParsing}
            placeholder="Paste your Budenschleuder email here, or drag & drop a .txt/.eml file..."
            className="w-full flex-grow p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none"
          />
          <div className="flex justify-between items-center gap-3 shrink-0">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isParsing || !inputText}
              className="border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-500 text-xs py-1.5 rounded-xl transition-all hover:cursor-pointer"
            >
              Clear
            </Button>
            <Button
              onClick={handleParse}
              disabled={isParsing || !inputText}
              className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl shadow-sm-clean transition-colors hover:cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Execute Ingestion Engine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Xcode-Style Light Console Card */}
      <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl flex flex-col h-[520px] relative overflow-hidden group">
        <CardHeader className="pb-3 border-b border-slate-100 shrink-0 bg-slate-50/50 z-10 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xs font-mono text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Parser Console Terminal
            </CardTitle>
            <CardDescription className="text-[10px] font-mono text-slate-500">
              Compilation Logs / Stream Listener
            </CardDescription>
          </div>
          {completed && (
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded animate-pulse">
              <CheckCircle2 className="w-3 h-3" /> ONLINE
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow p-4 overflow-y-auto font-mono text-[10px] text-slate-700 leading-normal space-y-1.5 bg-slate-50/30">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-center flex-col gap-2 select-none">
              <Terminal className="w-8 h-8 opacity-25 text-slate-400 animate-pulse" />
              <span>CONSOLE IDLE. AWAITING INGESTION STREAM TRIGGER.</span>
            </div>
          ) : (
            logs.map((log, i) => {
              let color = "text-slate-600";
              if (log.startsWith("[SUCCESS]")) color = "text-emerald-600 font-bold";
              if (log.startsWith("[ERROR]")) color = "text-rose-600 font-black animate-shake";
              if (log.startsWith("[WARNING]")) color = "text-amber-600 font-semibold";
              if (log.startsWith("[SYSTEM]")) color = "text-[#0071e3] font-semibold";
              if (log.startsWith("[EXTRACT]")) color = "text-slate-800";

              return (
                <div key={i} className={`${color} break-words whitespace-pre-wrap py-0.5 border-b border-slate-100/40`}>
                  {log}
                </div>
              );
            })
          )}
          {isParsing && (
            <div className="text-[#0071e3] font-bold animate-pulse inline-flex items-center gap-1.5 mt-1">
              <span>■</span>
              <span className="text-[9px] tracking-widest uppercase">Executing...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </CardContent>
      </Card>
    </div>
  );
};
