// src/routes/relay.js
import { Router } from "express";
import Relay from "../models/Relay.js";

const router = Router();

// GET /api/relay/pull?deviceId=xxx  ← la placa consulta aquí
router.get("/pull", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId requerido" });

  let doc = await Relay.findOne({ deviceId });
  if (!doc) {
    doc = await Relay.create({ deviceId }); // por defecto todos OFF
  }
  res.json(doc);
});

// POST /api/relay/set  { deviceId, relay:"R1", state:true, holdSec?:300 }
router.post("/set", async (req, res) => {
  const { deviceId, relay, state, holdSec } = req.body;
  if (!deviceId || !relay) {
    return res.status(400).json({ error: "deviceId y relay requeridos" });
  }

  const update = {};
  update[`relays.${relay}.state`] = !!state;
  update[`relays.${relay}.updatedAt`] = new Date();
  update[`relays.${relay}.until`] = holdSec && holdSec > 0
    ? new Date(Date.now() + holdSec * 1000)
    : null;

  const doc = await Relay.findOneAndUpdate(
    { deviceId },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json(doc);
});

export default router;
