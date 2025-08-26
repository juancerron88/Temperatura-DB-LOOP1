import { Parser as Json2Csv } from "json2csv";
import ExcelJS from "exceljs";

// GET /api/thermo/export?deviceId=xxx&limit=1000&format=csv|xlsx
router.get("/export", async (req, res) => {
  try {
    const { deviceId } = req.query;
    const limit = Math.min(parseInt(req.query.limit || "1000", 10), 20000);
    const format = (req.query.format || "csv").toLowerCase();

    if (!deviceId) return res.status(400).json({ error: "deviceId required" });

    const rows = await Reading.find({ deviceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const data = rows.map((r) => ({
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
    } else { // CSV por defecto
      const parser = new Json2Csv({ fields: ["deviceId", "celsius", "fahrenheit", "createdAt"] });
      const csv = parser.parse(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="readings_${deviceId}.csv"`);
      return res.status(200).send(csv);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});
