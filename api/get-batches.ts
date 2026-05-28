import type { VercelRequest, VercelResponse } from "@vercel/node";
import { get } from "@vercel/edge-config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    // 1. If Vercel Edge Config is configured (Production Vercel deployment)
    if (process.env.EDGE_CONFIG) {
      let catalog: string[] = [];
      try {
        const savedCatalog = await get<string[]>("catalog");
        if (Array.isArray(savedCatalog)) {
          catalog = savedCatalog;
        }
      } catch (e) {
        catalog = [];
      }

      const batches: Record<string, any[]> = {};
      
      // Load all batches in parallel from Edge Config
      await Promise.all(
        catalog.map(async (batchId) => {
          try {
            const listings = await get<any[]>(`batch:${batchId}`);
            if (Array.isArray(listings)) {
              batches[batchId] = listings;
            }
          } catch (e) {
            console.error(`Failed to load batch:${batchId} from Edge Config:`, e);
          }
        })
      );

      res.status(200).json({ catalog, batches, mode: "production_edge_config" });
      return;
    }

    // 2. Local Fallback: Read directly from local filesystem (Local Development)
    const catalogPath = path.resolve(__dirname, "../public/data/batches.json");
    let catalog: string[] = [];
    if (fs.existsSync(catalogPath)) {
      try {
        catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      } catch (e) {
        catalog = [];
      }
    }

    const batches: Record<string, any[]> = {};
    catalog.forEach((batchId) => {
      const batchFilePath = path.resolve(__dirname, `../public/data/batch/${batchId}.json`);
      if (fs.existsSync(batchFilePath)) {
        try {
          batches[batchId] = JSON.parse(fs.readFileSync(batchFilePath, "utf-8"));
        } catch (e) {
          console.error(`Failed to read batch ${batchId} from filesystem:`, e);
        }
      }
    });

    res.status(200).json({ catalog, batches, mode: "local_fs" });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
