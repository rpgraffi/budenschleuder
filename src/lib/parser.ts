
export interface ParsedListing {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "SUCHE" | "BIETE" | "TAUSCH" | "WG" | "KAUF";
  title: string;
  roomsText: string;
  minRooms: number;
  maxRooms: number;
  budgetText: string;
  budget: number;
  sizeText: string;
  size: number;
  districts: string[];
  tags: string[];
  fullText: string;
  features: {
    nonSmoker: boolean;
    noPets: boolean;
    hasBalcony: boolean;
    hasGarden: boolean;
    furnished: boolean;
    temporary: boolean;
  };
  date: string;
  dateText: string;
}

// Helper to strip HTML tags and normalize whitespace
function cleanHtml(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/&bull;/g, "•")
    .replace(/&sup2;/g, "²")
    .replace(/&ndash;/g, "–")
    .replace(/<[^>]*>/g, ""); // Strip other tags

  // Normalize multiple spaces and excess newlines
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n");
  return text.trim();
}

export function extractBatchId(rawText: string): string {
  const match = rawText.match(/(\d{4})\.(\d{3})/);
  if (match) {
    const year = match[1];
    const issueNum = parseInt(match[2], 10).toString(); // Convert "042" to "42"
    return `${year}-${issueNum}`;
  }
  // Fallback to year-month
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export async function parseNewsletterWithAI(rawHtml: string, apiKey: string): Promise<ParsedListing[]> {
  const cleanedText = cleanHtml(rawHtml);
  
  const prompt = `You are a high-fidelity Munich housing parser.
Analyze the following unstructured newsletter issue text containing multiple real estate/housing advertisements (divided by dots/numbers or standard paragraph boundaries).
Extract each listing into a structured JSON array matching this TypeScript schema:

interface ParsedListing {
  id: string; // generate a unique string ID (e.g. listing-1, listing-2)
  name: string; // The author's name, or "Unbekannt" if none is specified
  email: string; // The contact email address (mandatory, if no email is found in the text block, skip this listing)
  phone: string; // Contact phone number, or "" if none
  type: "SUCHE" | "BIETE" | "TAUSCH" | "WG" | "KAUF"; // Categorize the listing. WG is for WG Room shares. TAUSCH is for direct swaps. KAUF is for buying. BIETE is when offering an apartment. SUCHE is when seeking an apartment.
  title: string; // Generate a clean, descriptive title in German (e.g., "Max sucht 2 Zimmer in Schwabing" or "Biete 3 Zimmer in Haidhausen")
  roomsText: string; // Human readable room count (e.g. "2 Zimmer", "1.5-2 Zimmer")
  minRooms: number; // Minimum number of rooms (default to 1)
  maxRooms: number; // Maximum number of rooms (if open-ended like "2 Zimmer+", set to 99)
  budgetText: string; // Human readable budget/rent (e.g. "1200 € warm", "800 € kalt")
  budget: number; // The maximum parsed numerical monthly rent/budget in Euros (default to 0 if not specified)
  sizeText: string; // Human readable size (e.g. "60 m²", "ab 45 m²")
  size: number; // The numerical apartment size in m² (default to 0 if not specified)
  districts: string[]; // List of matching Munich districts in lowercase (must map exactly to one or more of these valid strings: "allach", "moosach", "schwabing", "bogenhausen", "wuermtal", "neuhausen", "maxvorstadt", "lehel", "isarvorstadt", "haidhausen", "ramersdorf"). Map central landmarks like "Münchner Freiheit" to "schwabing", "Johanneskirchen" to "bogenhausen".
  tags: string[]; // Extract characteristics as tags (choose only from: "Nichtraucher", "Keine Haustiere", "Balkon/Terrasse", "Garten", "Möbliert", "Befristet")
  fullText: string; // The complete raw text block of this specific listing (clean up HTML tags, keep formatting)
  features: {
    nonSmoker: boolean; // true if the ad specifies non-smoker / Nichtraucher
    noPets: boolean; // true if the ad specifies no pets / Keine Haustiere
    hasBalcony: boolean; // true if the ad mentions Balkon, Terrasse, Dachterrasse
    hasGarden: boolean; // true if the ad mentions Garten, Gartenmitbenutzung
    furnished: boolean; // true if the ad mentions möbliert, teilmöbliert
    temporary: boolean; // true if the ad mentions befristet, Zwischenmiete, Untermiete
  };
  date: string; // The outreach date of this listing, default to "2026-05-27"
  dateText: string; // The readable date in German, default to "27. Mai 2026"
}

Ensure the output is a valid JSON array of objects directly conforming to ParsedListing[]. Do not wrap the JSON in Markdown blocks like \`\`\`json. Return only the JSON.

Here is the unstructured newsletter text:
${cleanedText}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
    throw new Error("Invalid response format from Gemini API - empty candidate contents");
  }

  const jsonText = data.candidates[0].content.parts[0].text.trim();
  
  // Clean markdown wrapper if model accidentally returned it
  const cleanedJson = jsonText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  
  const parsed = JSON.parse(cleanedJson) as ParsedListing[];
  
  // Make sure each parsed item has an ID and default dates if missing
  return parsed.map((item, idx) => ({
    ...item,
    id: item.id || `listing-ai-${idx}-${Date.now() % 10000}`,
    date: item.date || "2026-05-27",
    dateText: item.dateText || "27. Mai 2026",
    minRooms: typeof item.minRooms === "number" ? item.minRooms : 1,
    maxRooms: typeof item.maxRooms === "number" ? item.maxRooms : 1,
    budget: typeof item.budget === "number" ? item.budget : 0,
    size: typeof item.size === "number" ? item.size : 0,
    districts: Array.isArray(item.districts) ? item.districts : [],
    tags: Array.isArray(item.tags) ? item.tags : []
  }));
}
