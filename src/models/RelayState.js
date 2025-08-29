// src/models/RelayState.js
import mongoose from "mongoose";

const relayEntrySchema = new mongoose.Schema({
  state: { type: Boolean, default: false },     // ON/OFF
  until: { type: Date, default: null },         // opcional: apagar automático (server-time)
  updatedAt: { type: Date, default: Date.now }, // última orden (para que el device invalide caché)
}, { _id: false });

const relayStateSchema = new mongoose.Schema({
  deviceId: { type: String, index: true, unique: true },
  // Mapa de relés. Por defecto 3 relés (R1, R2, R3).
  relays: {
    R1: { type: relayEntrySchema, default: () => ({}) },
    R2: { type: relayEntrySchema, default: () => ({}) },
    R3: { type: relayEntrySchema, default: () => ({}) },
  },
  updatedAt: { type: Date, default: Date.now }, // última vez que cambió cualquiera
}, { timestamps: true });

export default mongoose.model("RelayState", relayStateSchema);
