import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

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

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      res.status(500).json({ success: false, error: "BLOB_READ_WRITE_TOKEN is missing in environment variables!" });
      return;
    }

    // Save directly to Vercel Blob
    const { url } = await put(`batch/${batchId}.json`, JSON.stringify(listings, null, 2), {
      access: "public",
      addRandomSuffix: false,
      token
    });

    res.status(200).json({ success: true, mode: "production_blob", path: url });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
