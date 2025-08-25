import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    celsius:  { type: Number, required: true },
    meta:     { type: Object, default: {} } // por si quieres enviar más campos
  },
  { timestamps: true }
);

ReadingSchema.virtual("fahrenheit").get(function () {
  return this.celsius * 9/5 + 32;
});

ReadingSchema.index({ deviceId: 1, createdAt: -1 });

export const Reading = mongoose.model("Reading", ReadingSchema);
