import { Router } from "express";
import { Reading } from "../models/Reading.js";

const router = Router();

// --- Middleware de API Key simple (desactiva si no lo quieres) ---
router.use((req, res, next) => {
  const required = process.env.API_KEY;
  if (!required) return next(); // si no configuras API_KEY, no valida
  const got = req.header("x-api-key");
  if (got !== required) return res.status(401).json({ error: "invalid api key" });
  next();
});

// POST /api/thermo
// body: { deviceId, celsius, meta? }
router.post("/", async (req, res) => {
  try {
    const { deviceId, celsius, meta } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    if (typeof celsius !== "number" || Number.isNaN(celsius)) {
      return res.status(400).json({ error: "celsius must be number" });
    }
    // Rango razonable de termocupla K (-200 a 1200°C)
    if (celsius < -200 || celsius > 1200) {
      return res.status(422).json({ error: "celsius out of plausible range" });
    }

    const doc = await Reading.create({ deviceId, celsius, meta: meta || {} });
    return res.status(201).json({
      ok: true,
      id: doc._id,
      createdAt: doc.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// GET /api/thermo/latest?deviceId=heltec-v3-01
router.get("/latest", async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });

    const doc = await Reading.findOne({ deviceId })
      .sort({ createdAt: -1 })
      .lean();

    if (!doc) return res.status(404).json({ error: "no readings yet" });

    return res.json({
      deviceId: doc.deviceId,
      celsius: doc.celsius,
      fahrenheit: doc.celsius * 9/5 + 32,
      createdAt: doc.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// GET /api/thermo/history?deviceId=xxx&limit=100
router.get("/history", async (req, res) => {
  try {
    const { deviceId } = req.query;
    let limit = Math.min(parseInt(req.query.limit || "100", 10), 1000);
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });

    const rows = await Reading.find({ deviceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(rows.map(r => ({
      deviceId: r.deviceId,
      celsius: r.celsius,
      fahrenheit: r.celsius * 9/5 + 32,
      createdAt: r.createdAt
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;
