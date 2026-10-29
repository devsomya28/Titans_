import { Router } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { validateHuntRequest } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";
import { safeSaveHuntJob, safeUpdateHuntJob, safeFindHuntJob } from "../utils/memoryStore.js";
import { getIO } from "../config/socket.js";

const router = Router();
const fastapiClient = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8001",
  timeout: 5 * 60 * 1000,
});

router.post(
  "/hunt",
  validateHuntRequest,
  wrapAsync(async (req, res) => {
    const { official_video_url, official_title = "" } = req.body;
    const jobId = uuidv4();
    const io = getIO();

    const job = await safeSaveHuntJob({ jobId, official_video_url, official_title, status: "queued" });

    res.json({ success: true, message: "Hunt started.", jobId, huntJobId: job._id });

    try {
      await safeUpdateHuntJob({ jobId }, { status: "processing" });
      io.to(`hunt:${jobId}`).emit("hunt:started", { jobId, message: "Spider crawling the web..." });

      const { data } = await fastapiClient.post("/hunt", { official_video_url, official_title });

      if (!data.success) throw new Error("FastAPI hunt failed");

      const { official_source, threat_nodes = [], country_threat_counts = {} } = data.data;

      await safeUpdateHuntJob({ jobId }, {
        status: "complete",
        official_source: official_source
          ? { country: official_source.country, coordinates: official_source.coordinates }
          : undefined,
        threat_count: threat_nodes.length,
        completed_at: new Date(),
      });

      io.to(`hunt:${jobId}`).emit("hunt:complete", {
        jobId,
        official_source,
        threat_nodes,
        country_threat_counts,
        total: threat_nodes.length,
      });

    } catch (err) {
      await safeUpdateHuntJob({ jobId }, { status: "failed", error_message: err.message });
      io.to(`hunt:${jobId}`).emit("hunt:error", { jobId, message: err.message });
    }
  })
);

router.get("/hunt/:jobId", wrapAsync(async (req, res) => {
  const job = await safeFindHuntJob({ jobId: req.params.jobId });
  if (!job) throw new ExpressError(404, "Hunt job not found");
  res.json({ success: true, data: job });
}));

export default router;
