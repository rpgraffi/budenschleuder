import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      res.status(500).json({ success: false, error: "BLOB_READ_WRITE_TOKEN is missing in environment variables!" });
      return;
    }

    // Read directly from Vercel Blob
    const { blobs } = await list({ prefix: "batch/", token });
    
    const catalog = blobs
      .map((blob) => {
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
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
