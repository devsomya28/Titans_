import mongoose from "mongoose";
import Incident from "./models/Incident.js";
import { adjudicateRequestSchema, enforceRequestSchema } from "./schemas/Schema.js";

async function runTests() {
  console.log("==================================================");
  console.log("  Unit Test: Incident Model & Schema Platform Enum");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  const requiredPlatforms = ["TikTok", "X", "Twitter", "Facebook", "Dailymotion"];

  // Test 1: Verify all required platforms pass Mongoose Incident schema validation
  for (const plat of requiredPlatforms) {
    try {
      const doc = new Incident({
        jobId: "test-job-123",
        title: `Test video on ${plat}`,
        platform: plat,
        account_handle: "@tester",
      });
      const err = doc.validateSync();
      if (err && err.errors && err.errors.platform) {
        console.log(`❌ Mongoose Incident enum rejected valid platform: ${plat}`);
        failed++;
      } else {
        console.log(`✅ Mongoose Incident enum accepts: ${plat}`);
        passed++;
      }
    } catch (e) {
      console.log(`❌ Exception testing platform ${plat}:`, e.message);
      failed++;
    }
  }

  // Test 2: Verify all required platforms pass Joi Schema validation
  for (const plat of requiredPlatforms) {
    const payload = {
      incident_id: "inc-123",
      sentinel_report: "Test report content",
      platform: plat,
      account_handle: "@tester",
      video_title: "Sample Match Highlight",
    };
    const { error } = adjudicateRequestSchema.validate(payload);
    if (error) {
      console.log(`❌ Joi adjudicateRequestSchema rejected: ${plat} -> ${error.message}`);
      failed++;
    } else {
      console.log(`✅ Joi adjudicateRequestSchema accepts: ${plat}`);
      passed++;
    }
  }

  // Test 3: Verify invalid platform is properly rejected by Mongoose
  const invalidDoc = new Incident({
    jobId: "test-job-123",
    title: "Test invalid platform",
    platform: "NonExistentPlatform999",
  });
  const invalidErr = invalidDoc.validateSync();
  if (invalidErr && invalidErr.errors && invalidErr.errors.platform) {
    console.log("✅ Mongoose Incident enum correctly rejects invalid platform");
    passed++;
  } else {
    console.log("❌ Mongoose Incident enum failed to reject invalid platform");
    failed++;
  }

  // Test 4: Verify invalid platform is rejected by Joi schema
  const { error: joiInvalidErr } = adjudicateRequestSchema.validate({
    incident_id: "inc-123",
    sentinel_report: "Test report",
    platform: "NonExistentPlatform999",
    account_handle: "@tester",
    video_title: "Sample Video",
  });
  if (joiInvalidErr) {
    console.log("✅ Joi adjudicateRequestSchema correctly rejects invalid platform");
    passed++;
  } else {
    console.log("❌ Joi adjudicateRequestSchema failed to reject invalid platform");
    failed++;
  }

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
