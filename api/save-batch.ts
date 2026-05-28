import type { VercelRequest, VercelResponse } from "@vercel/node";
import { get } from "@vercel/edge-config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEdgeConfigId(connectionString?: string): string | null {
  if (!connectionString) return null;
  const match = connectionString.match(/\/ecfg_([a-zA-Z0-9]+)/);
  return match ? `ecfg_${match[1]}` : null;
}

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

    // 1. If Vercel Edge Config is configured (Production Vercel deployment)
    if (process.env.EDGE_CONFIG) {
      const edgeConfigId = getEdgeConfigId(process.env.EDGE_CONFIG);
      const apiToken = process.env.VERCEL_API_TOKEN;

      if (!edgeConfigId) {
        throw new Error("Could not parse Edge Config ID from EDGE_CONFIG environment string.");
      }
      if (!apiToken) {
        throw new Error("Missing VERCEL_API_TOKEN environment variable. Please create a Personal Access Token in your Vercel settings and add it to your project environment variables.");
      }

      // Fetch the current catalog list from Edge Config
      let catalog: string[] = [];
      try {
        const savedCatalog = await get<string[]>("catalog");
        if (Array.isArray(savedCatalog)) {
          catalog = savedCatalog;
        }
      } catch (e) {
        catalog = [];
      }

      if (!catalog.includes(batchId)) {
        catalog.push(batchId);
        catalog.sort((a, b) => b.localeCompare(a));
      }

      // Update Edge Config using Vercel REST API PATCH endpoint
      const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
      const updateUrl = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamParam}`;

      const patchRes = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              operation: "upsert",
              key: `batch:${batchId}`,
              value: listings
            },
            {
              operation: "upsert",
              key: "catalog",
              value: catalog
            }
          ]
        })
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        throw new Error(`Vercel Edge Config API Error (${patchRes.status}): ${errText}`);
      }

      res.status(200).json({ success: true, mode: "production_edge_config", path: `EdgeConfig:batch:${batchId}` });
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
