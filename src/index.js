// src/index.js
import "dotenv/config.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./db.js";
import thermoRouter from "./routes/thermo.js";
import relayRouter from "./routes/relay.js";

const app = express(); // 👈 Crear app antes de usar middlewares

// ---- Middlewares base ----
app.use(helmet());
app.use(express.json({ limit: "256kb" }));
app.use(morgan("tiny"));

// CORS permisivo por defecto (ajusta con ALLOWED_ORIGINS en .env)
const allowed = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("Not allowed by CORS"));
  }
}));

// ---- Healthcheck ----
app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ---- API ----
// 🔐 Si usas API key, puedes crear un middleware y aplicarlo aquí:
// app.use("/api", apiKeyMiddleware, thermoRouter, relayRouter);

app.use("/api/thermo", thermoRouter);
app.use("/api/relay", relayRouter);

// ---- 404 fallback ----
app.use((_req, res) => res.status(404).json({ error: "not found" }));

// ---- Arranque ----
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("[env] MONGODB_URI is required");
  process.exit(1);
}

console.log("[debug] PORT:", PORT);
console.log("[debug] MONGODB_URI:", (MONGODB_URI || "").slice(0, 60) + "...");

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[srv] Listening on :${PORT}`);
    });
  })
  .catch(err => {
    console.error("[db] Connection error", err);
    process.exit(1);
  });
