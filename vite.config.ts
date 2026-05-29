import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { put, list } from "@vercel/blob";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the current working directory
  // Pass an empty string as the third parameter to load all variables regardless of prefix
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      "import.meta.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY || "")
    },
    plugins: [
      react(),
      {
        name: "save-batch-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const token = env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

            if (req.method === "POST" && req.url === "/api/save-batch") {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", async () => {
                try {
                  const { batchId, listings } = JSON.parse(body);
                  if (!batchId || !Array.isArray(listings)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "Invalid payload" }));
                    return;
                  }

                  if (!token) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "BLOB_READ_WRITE_TOKEN is missing in environment variables!" }));
                    return;
                  }

                  const { url } = await put(`batch/${batchId}.json`, JSON.stringify(listings, null, 2), {
                    access: "public",
                    addRandomSuffix: false,
                    token
                  });

                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: true, mode: "dev_blob", path: url }));
                } catch (err) {
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: false, error: (err as Error).message }));
                }
              });
            } else if (req.method === "GET" && req.url === "/api/get-batches") {
              try {
                if (!token) {
                  // Fallback: Fetch directly from the live Vercel production API!
                  const fetchRes = await fetch("https://budenschleuder.vercel.app/api/get-batches");
                  if (fetchRes.ok) {
                    const data = await fetchRes.json();
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(data));
                    return;
                  }

                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: false, error: "BLOB_READ_WRITE_TOKEN is missing and live production database fallback failed" }));
                  return;
                }

                const { blobs } = await list({ prefix: "batch/", token });
                const catalog = blobs
                  .map((blob) => blob.pathname.replace("batch/", "").replace(".json", ""))
                  .sort((a, b) => b.localeCompare(a));

                const batches: Record<string, any[]> = {};
                await Promise.all(
                  blobs.map(async (blob) => {
                    const batchId = blob.pathname.replace("batch/", "").replace(".json", "");
                    try {
                      const fetchRes = await fetch(blob.url);
                      if (fetchRes.ok) {
                        batches[batchId] = (await fetchRes.json()) as any[];
                      }
                    } catch (e) {
                      console.error(`Failed to load batch ${batchId} from blob URL:`, e);
                    }
                  })
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ catalog, batches, mode: "dev_blob" }));
              } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: (err as Error).message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "src": path.resolve(__dirname, "./src")
      }
    }
  };
});
