import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";
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
    // 1. Production Mode: Read from Vercel Blob (Works out of the box with BLOB_READ_WRITE_TOKEN!)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { blobs } = await list({ prefix: "batch/" });
      
      const catalog = blobs
        .map((blob) => {
          // Extract batch ID from pathname, e.g., "batch/2026-42.json" -> "2026-42"
          return blob.pathname.replace("batch/", "").replace(".json", "");
        })
        .sort((a, b) => b.localeCompare(a));

      const batches: Record<string, any[]> = {};
      
      // Load all batches in parallel
      await Promise.all(
        blobs.map(async (blob) => {
          const batchId = blob.pathname.replace("batch/", "").replace(".json", "");
          try {
            const fetchRes = await fetch(blob.url);
            if (fetchRes.ok) {
              batches[batchId] = await fetchRes.json();
            }
          } catch (e) {
            console.error(`Failed to load batch ${batchId} from blob URL:`, e);
          }
        })
      );

      res.status(200).json({ catalog, batches, mode: "production_blob" });
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
