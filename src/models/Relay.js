// src/models/Relay.js
import mongoose from "mongoose";

const relaySchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  relays: {
    R1: {
      state: { type: Boolean, default: false },
      until: { type: Date, default: null },
      updatedAt: { type: Date, default: Date.now }
    },
    R2: {
      state: { type: Boolean, default: false },
      until: { type: Date, default: null },
      updatedAt: { type: Date, default: Date.now }
    },
    R3: {
      state: { type: Boolean, default: false },
      until: { type: Date, default: null },
      updatedAt: { type: Date, default: Date.now }
    }
  }
});

relaySchema.index({ deviceId: 1 }, { unique: true });

export default mongoose.model("Relay", relaySchema);
