// src/routes/thermo.js
import { Router } from "express";
import { Reading } from "../models/Reading.js";

const router = Router();

// (Opcional) exige API key solo en POST
function requirePostKey(req, res, next) {
  const required = (process.env.API_KEY || "").trim();
  if (!required) return next();
  const got = (req.header("x-api-key") || "").trim();
  if (got === required) return next();
  return res.status(401).json({ error: "invalid api key" });
}

/** POST /api/thermo  -> guarda {deviceId, celsius, meta?} */
router.post("/", requirePostKey, async (req, res) => {
  try {
    const { deviceId, celsius, meta } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    if (typeof celsius !== "number" || Number.isNaN(celsius))
      return res.status(400).json({ error: "celsius must be number" });
    if (celsius < -200 || celsius > 1200)
      return res.status(422).json({ error: "celsius out of plausible range" });

    const doc = await Reading.create({
      deviceId,
      celsius,
      meta: meta || {}, // <-- aquí llega { sensor: "K1" .. "K8" }
    });

    res.status(201).json({ ok: true, id: doc._id, createdAt: doc.createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/** GET /api/thermo/latest?deviceId=... [&sensor=K1] */
router.get("/latest", async (req, res) => {
  const { deviceId, sensor } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const q = { deviceId };
  if (sensor) q["meta.sensor"] = sensor;

  const r = await Reading.findOne(q).sort({ createdAt: -1 }).lean();
  if (!r) return res.status(404).json({ error: "no readings yet" });

  res.json({
    deviceId: r.deviceId,
    celsius: r.celsius,
    fahrenheit: r.celsius * 9 / 5 + 32,
    createdAt: r.createdAt,
    meta: r.meta || {},
  });
});

/** GET /api/thermo/history?deviceId=...&limit=1000[&sensor=K1][&from=ISO&to=ISO] */
router.get("/history", async (req, res) => {
  const { deviceId, sensor, from, to } = req.query;
  let limit = Math.min(parseInt(req.query.limit || "300", 10), 20000);
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const q = { deviceId };
  if (sensor) q["meta.sensor"] = sensor;
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to)   q.createdAt.$lte = new Date(to);
  }

  const rows = await Reading.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(rows.map(r => ({
    deviceId: r.deviceId,
    celsius: r.celsius,
    fahrenheit: r.celsius * 9/5 + 32,
    createdAt: r.createdAt,
    meta: r.meta || {},
  })));
});

/** GET /api/thermo/sensors?deviceId=... -> ["K1","K2",...] */
router.get("/sensors", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const rows = await Reading.aggregate([
    { $match: { deviceId } },
    { $group: { _id: "$meta.sensor", cnt: { $sum: 1 } } },
    { $project: { sensor: "$_id", _id: 0, cnt: 1 } },
    { $sort: { sensor: 1 } }
  ]);

  const sensors = rows
    .map(r => r.sensor || "default")
    .filter((v, i, a) => a.indexOf(v) === i);
  res.json(sensors);
});

export default router;
