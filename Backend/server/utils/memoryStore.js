import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.resolve(__dirname, "../data/memory_store.json");

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw);
      return {
        incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [],
        huntJobs: Array.isArray(parsed.huntJobs) ? parsed.huntJobs : [],
        dmcaRecords: Array.isArray(parsed.dmcaRecords) ? parsed.dmcaRecords : [],
        contractRecords: Array.isArray(parsed.contractRecords) ? parsed.contractRecords : [],
        ingestedAssets: Array.isArray(parsed.ingestedAssets) ? parsed.ingestedAssets : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      };
    }
  } catch (err) {
    console.error("[memoryStore] Could not load persisted data:", err.message);
  }
  return {
    incidents: [],
    huntJobs: [],
    dmcaRecords: [],
    contractRecords: [],
    ingestedAssets: [],
    accounts: [],
  };
}

export const memoryStore = loadFromDisk();

function persistToDisk() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), "utf8");
  } catch (err) {
    console.error("[memoryStore] Failed to write store to disk:", err.message);
  }
}

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const safeFindIncidents = async (filter = {}, { page = 1, limit = 20 } = {}) => {
  if (isDbConnected()) {
    const Incident = (await import("../models/Incident.js")).default;
    const [docs, total] = await Promise.all([
      Incident.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Incident.countDocuments(filter),
    ]);
    return { docs, total };
  }

  let list = [...memoryStore.incidents];
  if (filter.jobId) list = list.filter(i => i.jobId === filter.jobId);
  if (filter.asset_id) list = list.filter(i => String(i.asset_id) === String(filter.asset_id));
  if (filter.severity) list = list.filter(i => i.severity === filter.severity);
  if (filter.status) list = list.filter(i => i.status === filter.status);

  const total = list.length;
  const start = (page - 1) * limit;
  const docs = list.slice(start, start + limit);
  return { docs, total };
};

export const safeFindOneIncident = async (filter) => {
  try {
    if (isDbConnected()) {
      const Incident = (await import("../models/Incident.js")).default;
      return await Incident.findOne(filter);
    }
  } catch {}
  return memoryStore.incidents.find(i => {
    for (const [k, v] of Object.entries(filter)) {
      if (i[k] !== v) return false;
    }
    return true;
  }) || null;
};

export const safeSaveIncident = async (data) => {
  if (isDbConnected()) {
    const Incident = (await import("../models/Incident.js")).default;
    return await Incident.create(data);
  }
  const doc = {
    _id: uuidv4(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.incidents.unshift(doc);
  persistToDisk();
  return doc;
};

export const safeFindAssets = async () => {
  if (isDbConnected()) {
    const IngestedAsset = (await import("../models/IngestedAsset.js")).default;
    return await IngestedAsset.find().sort({ createdAt: -1 });
  }
  return memoryStore.ingestedAssets;
};

export const safeSaveAsset = async (data) => {
  try {
    if (isDbConnected()) {
      const IngestedAsset = (await import("../models/IngestedAsset.js")).default;
      return await IngestedAsset.create(data);
    }
  } catch {}
  const doc = {
    _id: uuidv4(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.ingestedAssets.unshift(doc);
  persistToDisk();
  return doc;
};

export const safeUpdateAsset = async (id, update) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const IngestedAsset = (await import("../models/IngestedAsset.js")).default;
      return await IngestedAsset.findByIdAndUpdate(id, update, { new: true });
    }
  } catch {}
  const asset = memoryStore.ingestedAssets.find(a => String(a._id) === String(id));
  if (asset) {
    Object.assign(asset, update, { updatedAt: new Date() });
    persistToDisk();
    return asset;
  }
  return null;
};

export const safeFindDMCAs = async () => {
  if (isDbConnected()) {
    const DMCARecord = (await import("../models/DMCARecord.js")).default;
    return await DMCARecord.find().sort({ createdAt: -1 });
  }
  return memoryStore.dmcaRecords;
};

export const safeFindContracts = async () => {
  if (isDbConnected()) {
    const ContractRecord = (await import("../models/ContractRecord.js")).default;
    return await ContractRecord.find().sort({ createdAt: -1 });
  }
  return memoryStore.contractRecords;
};

export const safeUpdateIncident = async (id, update) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const Incident = (await import("../models/Incident.js")).default;
      return await Incident.findByIdAndUpdate(id, update, { new: true });
    }
  } catch {}
  const inc = memoryStore.incidents.find(i => String(i._id) === String(id));
  if (inc) {
    Object.assign(inc, update, { updatedAt: new Date() });
    persistToDisk();
    return inc;
  }
  return null;
};

export const safeSaveDMCA = async (data) => {
  try {
    if (isDbConnected() && (!data.incident_id || mongoose.Types.ObjectId.isValid(data.incident_id))) {
      const DMCARecord = (await import("../models/DMCARecord.js")).default;
      return await DMCARecord.create(data);
    }
  } catch {}
  const doc = {
    _id: uuidv4(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.dmcaRecords.unshift(doc);
  persistToDisk();
  return doc;
};

export const safeSaveContract = async (data) => {
  try {
    if (isDbConnected() && (!data.incident_id || mongoose.Types.ObjectId.isValid(data.incident_id))) {
      const ContractRecord = (await import("../models/ContractRecord.js")).default;
      return await ContractRecord.create(data);
    }
  } catch {}
  const doc = {
    _id: uuidv4(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.contractRecords.unshift(doc);
  persistToDisk();
  return doc;
};

export const safeSaveHuntJob = async (data) => {
  try {
    if (isDbConnected()) {
      const HuntJob = (await import("../models/HuntJob.js")).default;
      return await HuntJob.create(data);
    }
  } catch {}
  const doc = {
    _id: uuidv4(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.huntJobs.unshift(doc);
  persistToDisk();
  return doc;
};

export const safeUpdateHuntJob = async (query, update) => {
  try {
    if (isDbConnected()) {
      const HuntJob = (await import("../models/HuntJob.js")).default;
      return await HuntJob.findOneAndUpdate(query, update, { new: true });
    }
  } catch {}
  let job = null;
  if (query.jobId) job = memoryStore.huntJobs.find(j => j.jobId === query.jobId);
  else if (query._id) job = memoryStore.huntJobs.find(j => String(j._id) === String(query._id));
  if (job) {
    Object.assign(job, update, { updatedAt: new Date() });
    persistToDisk();
    return job;
  }
  return null;
};

export const safeFindHuntJob = async (query) => {
  try {
    if (isDbConnected()) {
      const HuntJob = (await import("../models/HuntJob.js")).default;
      return await HuntJob.findOne(query);
    }
  } catch {}
  if (query.jobId) return memoryStore.huntJobs.find(j => j.jobId === query.jobId) || null;
  if (query._id) return memoryStore.huntJobs.find(j => String(j._id) === String(query._id)) || null;
  return null;
};

export const safeFindAssetById = async (id) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const IngestedAsset = (await import("../models/IngestedAsset.js")).default;
      return await IngestedAsset.findById(id);
    }
  } catch {}
  return memoryStore.ingestedAssets.find(a => String(a._id) === String(id)) || null;
};

export const safeFindIncidentById = async (id) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const Incident = (await import("../models/Incident.js")).default;
      return await Incident.findById(id);
    }
  } catch {}
  return memoryStore.incidents.find(i => String(i._id) === String(id)) || null;
};

export const safeFindDMCAById = async (id) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const DMCARecord = (await import("../models/DMCARecord.js")).default;
      return await DMCARecord.findById(id);
    }
  } catch {}
  return memoryStore.dmcaRecords.find(d => String(d._id) === String(id)) || null;
};

export const safeUpdateDMCA = async (id, update) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const DMCARecord = (await import("../models/DMCARecord.js")).default;
      return await DMCARecord.findByIdAndUpdate(id, update, { new: true });
    }
  } catch {}
  const dmca = memoryStore.dmcaRecords.find(d => String(d._id) === String(id));
  if (dmca) {
    Object.assign(dmca, update, { updatedAt: new Date() });
    persistToDisk();
    return dmca;
  }
  return null;
};

export const safeFindContractById = async (id) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const ContractRecord = (await import("../models/ContractRecord.js")).default;
      return await ContractRecord.findById(id);
    }
  } catch {}
  return memoryStore.contractRecords.find(c => String(c._id) === String(id)) || null;
};

export const safeUpdateContract = async (id, update) => {
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const ContractRecord = (await import("../models/ContractRecord.js")).default;
      return await ContractRecord.findByIdAndUpdate(id, update, { new: true });
    }
  } catch {}
  const contract = memoryStore.contractRecords.find(c => String(c._id) === String(id));
  if (contract) {
    Object.assign(contract, update, { updatedAt: new Date() });
    persistToDisk();
    return contract;
  }
  return null;
};

export const safeDeleteAsset = async (id) => {
  let asset = null;
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const IngestedAsset = (await import("../models/IngestedAsset.js")).default;
      asset = await IngestedAsset.findByIdAndDelete(id);
    }
  } catch {}
  const idx = memoryStore.ingestedAssets.findIndex(a => String(a._id) === String(id));
  if (idx !== -1) {
    asset = asset || memoryStore.ingestedAssets[idx];
    memoryStore.ingestedAssets.splice(idx, 1);
    persistToDisk();
  }
  return asset;
};

export const safeDeleteIncident = async (id) => {
  let incident = null;
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const Incident = (await import("../models/Incident.js")).default;
      incident = await Incident.findByIdAndDelete(id);
    }
  } catch {}
  const idx = memoryStore.incidents.findIndex(i => String(i._id) === String(id));
  if (idx !== -1) {
    incident = incident || memoryStore.incidents[idx];
    memoryStore.incidents.splice(idx, 1);
    persistToDisk();
  }
  return incident;
};

