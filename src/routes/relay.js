// src/routes/relay.js
import express from "express";
import RelayState from "../models/RelayState.js";

const router = express.Router();

// (Opcional) protege con API key
function requireApiKey(req, res, next) {
  const required = (process.env.API_KEY || "").trim();
  if (!required) return next();
  const got = (req.header("x-api-key") || "").trim();
  if (got === required) return next();
  return res.status(401).json({ error: "invalid api key" });
}

/** GET /api/relay/:deviceId -> estados actuales R1..R3 */
router.get("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  let doc = await RelayState.findOne({ deviceId });
  if (!doc) doc = await RelayState.create({ deviceId });
  res.json(doc);
});

/** PUT /api/relay/:deviceId  (actualiza varios a la vez) */
router.put("/:deviceId", requireApiKey, async (req, res) => {
  const { deviceId } = req.params;
  const { relays = {} } = req.body || {};

  let doc = await RelayState.findOne({ deviceId });
  if (!doc) doc = new RelayState({ deviceId });

  const now = new Date();
  for (const key of Object.keys(relays)) {
    if (!["R1","R2","R3"].includes(key)) continue;
    const r = relays[key] || {};
    if (typeof r.state === "boolean") doc.relays[key].state = r.state;
    if (r.until) doc.relays[key].until = new Date(r.until);
    doc.relays[key].updatedAt = now;
  }
  doc.updatedAt = now;
  await doc.save();
  res.json(doc);
});

/** PUT /api/relay/:deviceId/:relayId  (uno por uno) */
router.put("/:deviceId/:relayId", requireApiKey, async (req, res) => {
  const { deviceId, relayId } = req.params;
  if (!["R1","R2","R3"].includes(relayId)) return res.status(400).json({ error: "relayId invalid" });

  const { state, holdSec } = req.body || {};
  if (typeof state !== "boolean") return res.status(400).json({ error: "state boolean required" });

  let doc = await RelayState.findOne({ deviceId });
  if (!doc) doc = new RelayState({ deviceId });

  const now = new Date();
  doc.relays[relayId].state = state;
  doc.relays[relayId].updatedAt = now;
  doc.relays[relayId].until = (typeof holdSec === "number" && holdSec > 0)
    ? new Date(now.getTime() + holdSec * 1000)
    : null;

  doc.updatedAt = now;
  await doc.save();
  res.json(doc);
});

/** GET /api/relay/pull?deviceId=...  (para el Heltec) */
router.get("/pull", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  let doc = await RelayState.findOne({ deviceId });
  if (!doc) doc = await RelayState.create({ deviceId });

  const now = Date.now();
  const payload = { deviceId, relays: {} };
  ["R1","R2","R3"].forEach(k => {
    const r = doc.relays[k] || {};
    const untilMs = r.until ? new Date(r.until).getTime() : null;
    const expired = untilMs && now > untilMs;
    payload.relays[k] = {
      state: expired ? false : !!r.state,
      until: untilMs || null,
      updatedAt: r.updatedAt || doc.updatedAt
    };
  });

  res.json(payload);
});

export default router;
