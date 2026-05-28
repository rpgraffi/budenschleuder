import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "save-batch-middleware",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === "POST" && req.url === "/api/save-batch") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", () => {
              try {
                const { batchId, listings } = JSON.parse(body);
                if (!batchId || !Array.isArray(listings)) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: false, error: "Invalid payload" }));
                  return;
                }

                // Create public directories if they don't exist
                const batchDir = path.resolve(__dirname, "public/data/batch");
                if (!fs.existsSync(batchDir)) {
                  fs.mkdirSync(batchDir, { recursive: true });
                }

                // Save individual batch file
                const batchFilePath = path.join(batchDir, `${batchId}.json`);
                fs.writeFileSync(batchFilePath, JSON.stringify(listings, null, 2), "utf-8");

                // Update catalog: public/data/batches.json
                const catalogPath = path.resolve(__dirname, "public/data/batches.json");
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
                  // Sort catalog issues chronologically or numerically if possible
                  catalog.sort((a, b) => b.localeCompare(a));
                  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
                }

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, path: `/data/batch/${batchId}.json` }));
              } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: (err as Error).message }));
              }
            });
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
});
