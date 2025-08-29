// src/models/RelayState.js
import mongoose from "mongoose";

const relayEntrySchema = new mongoose.Schema({
  state:     { type: Boolean, default: false }, // ON/OFF
  until:     { type: Date,    default: null  }, // auto-off opcional
  updatedAt: { type: Date,    default: Date.now },
}, { _id: false });

const relayStateSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true, index: true },
  relays: {
    R1: { type: relayEntrySchema, default: () => ({}) },
    R2: { type: relayEntrySchema, default: () => ({}) },
    R3: { type: relayEntrySchema, default: () => ({}) },
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("RelayState", relayStateSchema);
