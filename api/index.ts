import type { Request, Response } from "express";

let appHandler: any = null;
let initError: Error | null = null;

try {
  // Dynamically initialize the Express app
  const { createApp } = await import("../src/server/app.js");
  appHandler = createApp();
} catch (err: any) {
  initError = err;
  console.error("[Vercel Serverless Function Init Error]:", err?.message || err);
}

export default function handler(req: Request, res: Response) {
  if (initError || !appHandler) {
    console.error("[Vercel Handler Request Failed]:", initError?.message || "App belum terinisialisasi");
    return res.status(503).json({
      error: "Konfigurasi server belum lengkap, hubungi admin",
      details: process.env.NODE_ENV === "development" ? initError?.message : undefined
    });
  }
  return appHandler(req, res);
}
