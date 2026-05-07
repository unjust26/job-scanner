import { runTest } from "./auth";

runTest("Job Scanner App Test", async (helper) => {
  const { page } = helper;

  // Test 1: Dashboard loads
  await helper.goto("/dashboard");
  await page.waitForTimeout(2000);

  // Check the page title
  const title = await page.locator("h1").textContent();
  if (!title?.includes("Job Scanner")) {
    throw new Error(`Expected 'Job Scanner' title, got: ${title}`);
  }
  console.log("✅ Dashboard loads with correct title");

  // Check upload zone exists
  const uploadZone = page.locator("text=Drop your CV here");
  const hasUploadZone = await uploadZone.isVisible();
  if (!hasUploadZone) {
    throw new Error("Upload zone not found");
  }
  console.log("✅ Upload zone is visible");

  // Check empty state
  const emptyState = page.locator("text=No scans yet");
  const hasEmptyState = await emptyState.isVisible();
  if (!hasEmptyState) {
    throw new Error("Empty state not found");
  }
  console.log("✅ Empty state is displayed");

  // Take screenshot of dashboard
  await helper.screenshot("dashboard.png");
  console.log("✅ Dashboard screenshot taken");

  // Test 2: Landing page
  await helper.goto("/");
  await page.waitForTimeout(2000);

  const heroTitle = await page.locator("h1").textContent();
  if (!heroTitle?.includes("Upload Your CV")) {
    throw new Error(`Expected hero title with 'Upload Your CV', got: ${heroTitle}`);
  }
  console.log("✅ Landing page loads correctly");

  await helper.screenshot("landing.png");
  console.log("✅ Landing page screenshot taken");

  console.log("\n🎉 All tests passed!");
}).catch(() => process.exit(1));
