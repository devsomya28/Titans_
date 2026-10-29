import { Router } from "express";
import axios from "axios";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";

const router = Router();
const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";
const fastapiClient = axios.create({ baseURL: FASTAPI, timeout: 60_000 });

router.post("/resolve", wrapAsync(async (req, res) => {
  const { url } = req.body;
  if (!url) throw new ExpressError(400, "url is required");

  try {
    const resp = await fastapiClient.post("/resolve", { url });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    throw new ExpressError(status, detail);
  }
}));

router.get("/resolver/matrix", wrapAsync(async (req, res) => {
  try {
    const resp = await fastapiClient.get("/resolver/matrix");
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    throw new ExpressError(status, detail);
  }
}));

export default router;
