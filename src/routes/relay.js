// src/routes/relay.js
import express from "express";
import RelayState from "../models/RelayState.js";

const router = express.Router();

/**
 * GET /api/relay/:deviceId
 * Devuelve el documento completo (estados de R1, R2, R3).
 */
router.get("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  const doc = await RelayState.findOne({ deviceId });
  if (!doc) {
    const created = await RelayState.create({ deviceId });
    return res.json(created);
  }
  res.json(doc);
});

/**
 * PUT /api/relay/:deviceId
 * Actualiza varios relés a la vez.
 * body: { relays: { R1: {state, until}, R2: {...}, ... } }
 */
router.put("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  const { relays = {} } = req.body || {};

  const doc = await RelayState.findOne({ deviceId }) || new RelayState({ deviceId });

  for (const key of Object.keys(relays)) {
    if (!["R1","R2","R3"].includes(key)) continue;
    const r = relays[key] || {};
    if (typeof r.state === "boolean") doc.relays[key].state = r.state;
    if (r.until) doc.relays[key].until = new Date(r.until);
    doc.relays[key].updatedAt = new Date();
  }
  doc.updatedAt = new Date();
  await doc.save();
  res.json(doc);
});

/**
 * PUT /api/relay/:deviceId/:relayId
 * body: { state: boolean, holdSec?: number }
 * holdSec -> establece until = now + holdSec (apagado automático).
 */
router.put("/:deviceId/:relayId", async (req, res) => {
  const { deviceId, relayId } = req.params;
  if (!["R1","R2","R3"].includes(relayId)) return res.status(400).json({ error: "relayId inválido" });

  const { state, holdSec } = req.body || {};
  if (typeof state !== "boolean") return res.status(400).json({ error: "state requerido boolean" });

  const doc = await RelayState.findOne({ deviceId }) || new RelayState({ deviceId });

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

/**
 * GET /api/relay/pull?deviceId=heltec-v3-01
 * Endpoint "ligero" para el Heltec.
 * Devuelve sólo lo necesario y cola expiraciones (until).
 */
router.get("/pull", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId requerido" });

  const doc = await RelayState.findOne({ deviceId }) || await RelayState.create({ deviceId });

  // Evalúa expiraciones "lógicas": el device puede apagar si vence.
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
