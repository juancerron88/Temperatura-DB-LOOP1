// src/routes/relay.js
import { Router } from "express";
import Relay from "../models/Relay.js";

const router = Router();

// ---- Leer estados (para la placa) ----
router.get("/pull", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId requerido" });

  let doc = await Relay.findOne({ deviceId });
  if (!doc) {
    // si no existe, lo crea con todos OFF
    doc = await Relay.create({ deviceId });
  }

  res.json(doc);
});

// ---- Cambiar un relé ----
router.post("/set", async (req, res) => {
  const { deviceId, relay, state, holdSec } = req.body;
  if (!deviceId || !relay) {
    return res.status(400).json({ error: "deviceId y relay requeridos" });
  }

  const update = {};
  update[`relays.${relay}.state`] = !!state;
  update[`relays.${relay}.updatedAt`] = new Date();

  if (holdSec && holdSec > 0) {
    update[`relays.${relay}.until`] = new Date(Date.now() + holdSec * 1000);
  } else {
    update[`relays.${relay}.until`] = null;
  }

  const doc = await Relay.findOneAndUpdate(
    { deviceId },
    { $set: update },
    { new: true, upsert: true }
  );

  res.json(doc);
});

export default router;
