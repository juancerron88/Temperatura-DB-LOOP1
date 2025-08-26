import { Router } from "express";
import { Reading } from "../models/Reading.js";
import { Parser as Json2Csv } from "json2csv";
import ExcelJS from "exceljs";

const router = Router();

// --- Middleware SOLO para POST (header x-api-key) ---
function requireApiKeyHeader(req, res, next) {
  const required = process.env.API_KEY;
  if (!required) return next();
  const got = req.header("x-api-key");
  if (got !== required) return res.status(401).json({ error: "invalid api key" });
  next();
}

// --- Helper para GET: acepta ?key=... opcional ---
function checkQueryKey(req, res, next) {
  const required = process.env.API_KEY;
  if (!required) return next();             // si no hay API_KEY, pasa
  if (req.query.key === required) return next();
  return res.status(401).json({ error: "invalid api key" });
}

// ------------------- RUTAS -------------------

// POST /api/thermo  (escritura protegida por header)
router.post("/", requireApiKeyHeader, async (req, res) => {
  try {
    const { deviceId, celsius, meta } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    if (typeof celsius !== "number" || Number.isNaN(celsius))
      return res.status(400).json({ error: "celsius must be number" });
    if (celsius < -200 || celsius > 1200)
      return res.status(422).json({ error: "celsius out of plausible range" });

    const doc = await Reading.create({ deviceId, celsius, meta: meta || {} });
    return res.status(201).json({ ok: true, id: doc._id, createdAt: doc.createdAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

// GET /api/thermo/latest (acepta ?key=...)
router.get("/latest", checkQueryKey, async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  const doc = await Reading.findOne({ deviceId }).sort({ createdAt: -1 }).lean();
  if (!doc) return res.status(404).json({ error: "no readings yet" });
  res.json({
    deviceId: doc.deviceId,
    celsius: doc.celsius,
    fahrenheit: doc.celsius * 9/5 + 32,
    createdAt: doc.createdAt
  });
});

// GET /api/thermo/history (acepta ?key=...)
router.get("/history", checkQueryKey, async (req, res) => {
  const { deviceId } = req.query;
  let limit = Math.min(parseInt(req.query.limit || "100", 10), 1000);
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  const rows = await Reading.find({ deviceId }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(rows.map(r => ({
    deviceId: r.deviceId,
    celsius: r.celsius,
    fahrenheit: r.celsius * 9/5 + 32,
    createdAt: r.createdAt
  })));
});

// GET /api/thermo/export (acepta ?key=... para descarga CSV/XLSX)
router.get("/export", checkQueryKey, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const limit = Math.min(parseInt(req.query.limit || "1000", 10), 20000);
    const format = (req.query.format || "csv").toLowerCase();
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });

    const rows = await Reading.find({ deviceId }).sort({ createdAt: -1 }).limit(limit).lean();
    const data = rows.map(r => ({
      deviceId: r.deviceId,
      celsius: Number(r.celsius),
      fahrenheit: Number(r.celsius) * 9/5 + 32,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("readings");
      ws.columns = [
        { header: "deviceId", key: "deviceId", width: 18 },
        { header: "celsius", key: "celsius", width: 12 },
        { header: "fahrenheit", key: "fahrenheit", width: 12 },
        { header: "createdAt", key: "createdAt", width: 24 },
      ];
      ws.addRows(data);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="readings_${deviceId}.xlsx"`);
      await wb.xlsx.write(res);
      return res.end();
    } else {
      const { Parser } = Json2Csv;
      const csv = new Parser({ fields: ["deviceId","celsius","fahrenheit","createdAt"] }).parse(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="readings_${deviceId}.csv"`);
      return res.status(200).send(csv);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;
