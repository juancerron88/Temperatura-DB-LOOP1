// backend/src/routes/thermo.js
import { Router } from "express";
import { Reading } from "../models/Reading.js";

const router = Router();

/** Si defines API_KEY en .env, el POST exigirá header x-api-key */
function requirePostKey(req, res, next) {
  const required = (process.env.API_KEY || "").trim();
  if (!required) return next();
  const got = (req.header("x-api-key") || "").trim();
  if (got === required) return next();
  return res.status(401).json({ error: "invalid api key" });
}

/** POST /api/thermo  -> guarda lectura {deviceId, celsius, meta?} */
router.post("/", requirePostKey, async (req, res) => {
  try {
    const { deviceId, celsius, meta } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    if (typeof celsius !== "number" || Number.isNaN(celsius)) {
      return res.status(400).json({ error: "celsius must be number" });
    }
    if (celsius < -200 || celsius > 1200) {
      return res.status(422).json({ error: "celsius out of plausible range" });
    }

    const doc = await Reading.create({
      deviceId,
      celsius,
      meta: meta || {}, // ej: { sensor: "K1" }
    });

    return res.status(201).json({ ok: true, id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/** GET /api/thermo/latest?deviceId=...  -> última lectura (incluye meta) */
router.get("/latest", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const r = await Reading.findOne({ deviceId }).sort({ createdAt: -1 }).lean();
  if (!r) return res.status(404).json({ error: "no readings yet" });

  return res.json({
    deviceId: r.deviceId,
    celsius: r.celsius,
    fahrenheit: r.celsius * 9 / 5 + 32,
    createdAt: r.createdAt,
    meta: r.meta || {}, // 👈 importante para multi-sensor
  });
});

/** GET /api/thermo/history?deviceId=...&limit=500[&sensor=K1]
 *  -> historial (más reciente primero), incluye meta y permite filtrar por sensor
 */
router.get("/history", async (req, res) => {
  const { deviceId, sensor } = req.query;
  let limit = parseInt(req.query.limit || "100", 10);
  if (Number.isNaN(limit) || limit < 1) limit = 100;
  limit = Math.min(limit, 2000);

  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const query = { deviceId };
  if (sensor) query["meta.sensor"] = sensor;

  const rows = await Reading.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  return res.json(rows.map(r => ({
    deviceId: r.deviceId,
    celsius: r.celsius,
    fahrenheit: r.celsius * 9 / 5 + 32,
    createdAt: r.createdAt,
    meta: r.meta || {}, // 👈 importante para el gráfico con checkboxes
  })));
});

export default router;
