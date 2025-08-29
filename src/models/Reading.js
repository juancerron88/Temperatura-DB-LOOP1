// src/models/Reading.js
import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    deviceId: { type: String, index: true, required: true },
    celsius:  { type: Number, required: true },
    meta:     { type: Object,  default: {} },   // ej: { sensor: "K1" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// Índices: por dispositivo y fecha; y por sensor
ReadingSchema.index({ deviceId: 1, createdAt: -1 });
ReadingSchema.index({ deviceId: 1, "meta.sensor": 1, createdAt: -1 });

export const Reading = mongoose.model("Reading", ReadingSchema);

