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
        toast.error("Nicht unterstützter Dateityp! Bitte lade eine .txt- oder .eml-Datei hoch.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
        
        const batchId = extractBatchId(text);
        setLogs((prev) => [
          ...prev,
          `[SYSTEM] Drag & Drop erkannt: "${fileName}" erfolgreich geladen (${Math.round(file.size / 100) / 10} kB).`,
          `[SYSTEM] Extrahierte Batch-ID: "${batchId}".`
        ]);
        toast.success(`${fileName} erfolgreich geladen!`);
      };
      reader.onerror = () => {
        toast.error("Fehler beim Lesen der hochgeladenen Datei!");
      };
      reader.readAsText(file);
    }
  };

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast.error("Bitte füge zuerst Text ein oder ziehe eine Datei hierher!");
      return;
    }

    const batchId = extractBatchId(inputText);
    setLogs([]);
    setIsParsing(true);
    setCompleted(false);

    try {
      setLogs((prev) => [...prev, "[SYSTEM] Initialisiere Budenschleuder-Parsing-Engine..."]);
      await new Promise((r) => setTimeout(r, 300));

      setLogs((prev) => [
        ...prev,
        `[SYSTEM] Überprüfe Datenbank auf Batch-ID: "${batchId}"...`
      ]);
      await new Promise((r) => setTimeout(r, 400));

      // Deterministic duplicate check
      if (existingBatches.includes(batchId)) {
        setLogs((prev) => [
          ...prev,
          `[INFO] Überprüfung: Batch "${batchId}" ist BEREITS in der Datenbank vorhanden.`,
          `[SUCCESS] Zu bestehendem Batch "${batchId}" gewechselt.`,
          `[SYSTEM] Gemini-Parsing übersprungen, um API-Guthaben zu schonen.`
        ]);
        toast.info(`Batch "${batchId}" ist bereits geladen. Gewechselt.`);
        
        onSelectBatch(batchId);
        setCompleted(true);
        setIsParsing(false);
        return;
      }

      // If not present, run Gemini AI parsing!
      if (!apiKey.trim()) {
        toast.error("Kein Gemini-API-Schlüssel in den Umgebungsvariablen gefunden! Ingestion abgebrochen.");
        setLogs((prev) => [
          ...prev,
          `[FEHLER] Fehlende Anmeldedaten: GEMINI_API_KEY ist in der Umgebung (.env-Datei) nicht definiert.`,
          `[SYSTEM] Ingestion abgebrochen.`
        ]);
        setIsParsing(false);
        return;
      }

      setLogs((prev) => [
        ...prev,
        `[INFO] Batch "${batchId}" ist neu. Starte Gemini-KI-Parsing...`,
        `[INFO] Ziel-Modell: gemini-3.1-flash-lite`,
        `[SYSTEM] Erstelle JSON-validierten Prompt...`
      ]);
      await new Promise((r) => setTimeout(r, 400));

      setLogs((prev) => [...prev, `[INFO] Verbinde mit Google Generative Language Services...`]);
      await new Promise((r) => setTimeout(r, 350));

      setLogs((prev) => [...prev, `[AI] Übertrage unstrukturierten Text (${Math.round(inputText.length / 100) / 10} kB)...`]);
      await new Promise((r) => setTimeout(r, 200));

      setLogs((prev) => [...prev, `[AI] Modell analysiert und extrahiert Inseratsdaten...`]);

      const parsed = await parseNewsletterWithAI(inputText, apiKey);

      setLogs((prev) => [...prev, `[SUCCESS] Strukturierte JSON-Antwort von Gemini-API empfangen.`]);
      await new Promise((r) => setTimeout(r, 300));

      setLogs((prev) => [...prev, `[SYSTEM] ${parsed.length} Inserate erkannt.`]);
      await new Promise((r) => setTimeout(r, 300));

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        setLogs((prev) => [
          ...prev,
          `[EXTRACT] Inserat #${i + 1} | Typ: ${item.type} | Name: ${item.name} | Kontakt: ${item.email}`
        ]);
        await new Promise((r) => setTimeout(r, 100));
      }

      // Save parsed listings directly to Vercel Edge Config
      setLogs((prev) => [
        ...prev,
        `[SYSTEM] Verbinde mit API, um Batch zu speichern...`
      ]);
      await new Promise((r) => setTimeout(r, 200));

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

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        throw new Error(errData.error || "Fehler beim Speichern in der Vercel Blob/Filesystem-Datenbank");
      }

      setLogs((prev) => [
        ...prev,
        `[SUCCESS] Batch erfolgreich in der globalen Vercel-Datenbank gespeichert!`,
        `[SUCCESS] Schlüssel "batch:${batchId}" registriert und Katalog aktualisiert.`,
        `[SYSTEM] Lade ${parsed.length} strukturierte Inserate in den Explorer...`
      ]);

      await new Promise((r) => setTimeout(r, 400));

      // Trigger callback to update App state (instantly caches batch listings in memory)
      onImportBatch(batchId, parsed);

      setCompleted(true);
      toast.success(`KI hat die Inserate für ${batchId} erfolgreich verarbeitet und gespeichert!`);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        `[ERROR] AI Ingestion Exception: ${(error as Error).message}`,
        `[SYSTEM] Bitte überprüfe den Gemini-API-Schlüssel in der .env-Datei, die Netzwerkverbindung oder das Textformat.`,
        `[SYSTEM] Ingestion abgebrochen.`
      ]);
      toast.error("KI-Parsing fehlgeschlagen! Siehe Konsolen-Logs.");
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
            <span className="text-sm font-bold text-slate-800">Newsletter-Datei hierher ziehen</span>
            <span className="text-xs text-slate-500">Unterstützt .txt- oder .eml-Dateien</span>
          </div>
        )}

        <CardHeader className="pb-3 shrink-0">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0071e3]" /> Newsletter importieren
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Füge den Text einer E-Mail ein oder ziehe eine <strong className="text-slate-700">.txt</strong>- oder <strong className="text-slate-700">.eml</strong>-Datei hierher, um Inserate zu extrahieren.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0 flex flex-col gap-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isParsing}
            placeholder="Füge den Text der Budenschleuder-E-Mail hier ein oder lade eine .txt/.eml-Datei hoch..."
            className="w-full flex-grow p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] resize-none"
          />
          <div className="flex justify-between items-center gap-3 shrink-0">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isParsing || !inputText}
              className="border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-500 text-xs py-1.5 rounded-xl transition-all hover:cursor-pointer"
            >
              Leeren
            </Button>
            <Button
              onClick={handleParse}
              disabled={isParsing || !inputText}
              className="bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-xs flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl shadow-sm-clean transition-colors hover:cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Import ausführen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Xcode-Style Light Console Card */}
      <Card className="bg-white border border-slate-200/80 shadow-sm-clean rounded-2xl flex flex-col h-[520px] relative overflow-hidden group">
        <CardHeader className="pb-3 border-b border-slate-100 shrink-0 bg-slate-50/50 z-10 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xs font-mono text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Parser-Konsole
            </CardTitle>
            <CardDescription className="text-[10px] font-mono text-slate-500">
              Verarbeitungsprotokoll
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
              <span>KONSOLE BEREIT. WARTE AUF IMPORT-START.</span>
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
              <span className="text-[9px] tracking-widest uppercase">Wird verarbeitet...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </CardContent>
      </Card>
    </div>
  );
};
