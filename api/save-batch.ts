import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { batchId, listings } = req.body;
    if (!batchId || !Array.isArray(listings)) {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }

    // 1. Production Mode: Save to Vercel Blob (Works securely out of the box!)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { url } = await put(`batch/${batchId}.json`, JSON.stringify(listings, null, 2), {
        access: "public",
        addRandomSuffix: false
      });

      res.status(200).json({ success: true, mode: "production_blob", path: url });
      return;
    }

    // 2. Local Fallback: Save directly to the local filesystem (Local Development)
    const batchDir = path.resolve(__dirname, "../public/data/batch");
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }

    const batchFilePath = path.join(batchDir, `${batchId}.json`);
    fs.writeFileSync(batchFilePath, JSON.stringify(listings, null, 2), "utf-8");

    const catalogPath = path.resolve(__dirname, "../public/data/batches.json");
    let catalog: string[] = [];
    if (fs.existsSync(catalogPath)) {
      try {
        catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      } catch (e) {
        catalog = [];
      }
    }
    if (!catalog.includes(batchId)) {
      catalog.push(batchId);
      catalog.sort((a, b) => b.localeCompare(a));
      fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
    }

    res.status(200).json({ success: true, mode: "local_fs", path: `/data/batch/${batchId}.json` });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
