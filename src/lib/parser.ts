
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a high-fidelity Munich housing parser.
Analyze the following unstructured newsletter issue text containing multiple real estate/housing advertisements (divided by dots/numbers or standard paragraph boundaries).
Extract each listing into a structured JSON array matching the provided schema.

Here is the unstructured newsletter text:
${cleanedText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MINIMAL,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: "A unique string ID (e.g. listing-1, listing-2)",
            },
            name: {
              type: Type.STRING,
              description: "The author's name, or 'Unbekannt' if none is specified",
            },
            email: {
              type: Type.STRING,
              description: "The contact email address (mandatory, if no email is found in the text block, skip this listing)",
            },
            phone: {
              type: Type.STRING,
              description: "Contact phone number, or '' if none",
            },
            type: {
              type: Type.STRING,
              enum: ["SUCHE", "BIETE", "TAUSCH", "WG", "KAUF"],
              description: "Categorize the listing: WG for WG Room shares, TAUSCH for direct swaps, KAUF for buying, BIETE for offering an apartment, SUCHE for seeking an apartment.",
            },
            title: {
              type: Type.STRING,
              description: "Generate a clean, descriptive title in German (e.g., 'Max sucht 2 Zimmer in Schwabing' or 'Biete 3 Zimmer in Haidhausen')",
            },
            roomsText: {
              type: Type.STRING,
              description: "Human readable room count (e.g. '2 Zimmer', '1.5-2 Zimmer')",
            },
            minRooms: {
              type: Type.INTEGER,
              description: "Minimum number of rooms (default to 1)",
            },
            maxRooms: {
              type: Type.INTEGER,
              description: "Maximum number of rooms (if open-ended like '2 Zimmer+', set to 99)",
            },
            budgetText: {
              type: Type.STRING,
              description: "Human readable budget/rent (e.g. '1200 € warm', '800 € kalt')",
            },
            budget: {
              type: Type.INTEGER,
              description: "The maximum parsed numerical monthly rent/budget in Euros (default to 0 if not specified)",
            },
            sizeText: {
              type: Type.STRING,
              description: "Human readable size (e.g. '60 m²', 'ab 45 m²')",
            },
            size: {
              type: Type.INTEGER,
              description: "The numerical apartment size in m² (default to 0 if not specified)",
            },
            districts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of matching Munich districts in lowercase (must map exactly to one or more of these valid strings: 'allach', 'moosach', 'schwabing', 'bogenhausen', 'wuermtal', 'neuhausen', 'maxvorstadt', 'lehel', 'isarvorstadt', 'haidhausen', 'ramersdorf'). Map central landmarks like 'Münchner Freiheit' to 'schwabing', 'Johanneskirchen' to 'bogenhausen'.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Extract characteristics as tags (choose only from: 'Nichtraucher', 'Keine Haustiere', 'Balkon/Terrasse', 'Garten', 'Möbliert', 'Befristet')",
            },
            fullText: {
              type: Type.STRING,
              description: "The complete raw text block of this specific listing (clean up HTML tags, keep formatting)",
            },
            features: {
              type: Type.OBJECT,
              properties: {
                nonSmoker: {
                  type: Type.BOOLEAN,
                  description: "true if the ad specifies non-smoker / Nichtraucher",
                },
                noPets: {
                  type: Type.BOOLEAN,
                  description: "true if the ad specifies no pets / Keine Haustiere",
                },
                hasBalcony: {
                  type: Type.BOOLEAN,
                  description: "true if the ad mentions Balkon, Terrasse, Dachterrasse",
                },
                hasGarden: {
                  type: Type.BOOLEAN,
                  description: "true if the ad mentions Garten, Gartenmitbenutzung",
                },
                furnished: {
                  type: Type.BOOLEAN,
                  description: "true if the ad mentions möbliert, teilmöbliert",
                },
                temporary: {
                  type: Type.BOOLEAN,
                  description: "true if the ad mentions befristet, Zwischenmiete, Untermiete",
                },
              },
              required: ["nonSmoker", "noPets", "hasBalcony", "hasGarden", "furnished", "temporary"],
            },
            date: {
              type: Type.STRING,
              description: "The outreach date of this listing, default to '2026-05-27'",
            },
            dateText: {
              type: Type.STRING,
              description: "The readable date in German, default to '27. Mai 2026'",
            },
          },
          required: [
            "id", "name", "email", "phone", "type", "title", "roomsText",
            "minRooms", "maxRooms", "budgetText", "budget", "sizeText", "size",
            "districts", "tags", "fullText", "features", "date", "dateText"
          ],
        },
      },
    },
  });

  const jsonText = response.text?.trim() || "";
  if (!jsonText) {
    throw new Error("Invalid response format from Gemini API - empty content");
  }

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
