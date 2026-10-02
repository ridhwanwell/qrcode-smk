import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp, idempotencyStore } from "./src/server/app.js";

async function startServer() {
  const PORT = 3000;

  // Initialize Express app with all API routes and middlewares
  const app = createApp();

  // Periodic cleanup of expired memory idempotency keys (local dev / persistent server mode only)
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of idempotencyStore.entries()) {
      if (v.expiresAt <= now) {
        idempotencyStore.delete(k);
      }
    }
  }, 5 * 60 * 1000);

  // Vite middleware for development & SPA catch-all fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} with Supabase backend`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});
