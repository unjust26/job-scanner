import { v } from "convex/values";
import {
  query,
  mutation,
  action,
  internalMutation,
} from "./_generated/server";
import { internal, api } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const VIKTOR_API_URL = process.env.APP_API_URL!;
const PROJECT_NAME = process.env.APP_PROJECT_NAME!;
const PROJECT_SECRET = process.env.APP_PROJECT_SECRET!;

async function callTool<T>(
  role: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(
    `${VIKTOR_API_URL}/api/viktor-spaces/tools/call`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: PROJECT_NAME,
        project_secret: PROJECT_SECRET,
        role,
        arguments: args,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error ?? "Tool call failed");
  }
  return json.result as T;
}

// Generate upload URL for file storage (no auth needed)
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Create a new scan record (no auth needed — uses sessionId)
export const createScan = mutation({
  args: {
    sessionId: v.string(),
    fileName: v.string(),
    fileId: v.id("_storage"),
  },
  returns: v.id("scans"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("scans", {
      sessionId: args.sessionId,
      fileName: args.fileName,
      fileId: args.fileId,
      status: "uploading",
    });
  },
});

// Get all scans for a session
export const listScans = query({
  args: { sessionId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("scans"),
      _creationTime: v.number(),
      fileName: v.string(),
      status: v.string(),
      extractedProfile: v.optional(v.any()),
      jobs: v.optional(v.any()),
      errorMessage: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("scans")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    return scans.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      fileName: s.fileName,
      status: s.status,
      extractedProfile: s.extractedProfile,
      jobs: s.jobs,
      errorMessage: s.errorMessage,
    }));
  },
});

// Get a single scan
export const getScan = query({
  args: { scanId: v.id("scans") },
  returns: v.union(
    v.object({
      _id: v.id("scans"),
      _creationTime: v.number(),
      fileName: v.string(),
      status: v.string(),
      extractedProfile: v.optional(v.any()),
      jobs: v.optional(v.any()),
      errorMessage: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;

    return {
      _id: scan._id,
      _creationTime: scan._creationTime,
      fileName: scan.fileName,
      status: scan.status,
      extractedProfile: scan.extractedProfile,
      jobs: scan.jobs,
      errorMessage: scan.errorMessage,
    };
  },
});

// Internal mutation to update scan status
export const updateScanStatus = internalMutation({
  args: {
    scanId: v.id("scans"),
    status: v.string(),
    resumeText: v.optional(v.string()),
    extractedProfile: v.optional(v.any()),
    jobs: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = { status: args.status };
    if (args.resumeText !== undefined) update.resumeText = args.resumeText;
    if (args.extractedProfile !== undefined)
      update.extractedProfile = args.extractedProfile;
    if (args.jobs !== undefined) update.jobs = args.jobs;
    if (args.errorMessage !== undefined)
      update.errorMessage = args.errorMessage;
    await ctx.db.patch(args.scanId, update);
    return null;
  },
});

// Internal mutation to get file URL
export const getFileUrl = internalMutation({
  args: { fileId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

// Delete a scan
export const deleteScan = mutation({
  args: { scanId: v.id("scans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) throw new Error("Scan not found");

    // Delete the stored file too
    await ctx.storage.delete(scan.fileId);
    await ctx.db.delete(args.scanId);
    return null;
  },
});

// Sanitize extracted profile to only include schema-valid fields
function sanitizeProfile(raw: any): {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: { title: string; company?: string; duration?: string }[];
  education: { degree: string; institution?: string }[];
  jobTitlesSearched: string[];
} {
  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
    summary: typeof raw.summary === "string" ? raw.summary : undefined,
    skills: Array.isArray(raw.skills)
      ? raw.skills.filter((s: any) => typeof s === "string")
      : [],
    experience: Array.isArray(raw.experience)
      ? raw.experience.map((e: any) => ({
          title: typeof e.title === "string" ? e.title : "Unknown",
          company: typeof e.company === "string" ? e.company : undefined,
          duration: typeof e.duration === "string" ? e.duration : undefined,
        }))
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.map((e: any) => ({
          degree: typeof e.degree === "string" ? e.degree : "Unknown",
          institution:
            typeof e.institution === "string" ? e.institution : undefined,
        }))
      : [],
    jobTitlesSearched: Array.isArray(raw.jobTitlesSearched)
      ? raw.jobTitlesSearched.filter((s: any) => typeof s === "string")
      : ["developer", "software engineer"],
  };
}

// Sanitize job objects to only include schema-valid fields
function sanitizeJobs(
  raw: any[],
): {
  title: string;
  company: string;
  location: string;
  description: string;
  url?: string;
  source?: string;
  matchReason?: string;
}[] {
  return raw.map((j: any) => ({
    title: typeof j.title === "string" ? j.title : "Unknown Position",
    company: typeof j.company === "string" ? j.company : "Unknown Company",
    location: typeof j.location === "string" ? j.location : "Unknown",
    description:
      typeof j.description === "string"
        ? j.description
        : "No description available",
    url: typeof j.url === "string" ? j.url : undefined,
    source: typeof j.source === "string" ? j.source : undefined,
    matchReason:
      typeof j.matchReason === "string" ? j.matchReason : undefined,
  }));
}

// Main processing action — orchestrates the full pipeline
export const processScan = action({
  args: { scanId: v.id("scans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Get the scan record
      const scan = await ctx.runQuery(api.scans.getScan, {
        scanId: args.scanId,
      });
      if (!scan) throw new Error("Scan not found");

      // 2. Parse resume — update status
      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId: args.scanId,
        status: "parsing",
      });

      const scanFull = await ctx.runQuery(api.scans.getScanFull, {
        scanId: args.scanId,
      });
      if (!scanFull) throw new Error("Scan not found");

      const storageUrl = await ctx.runMutation(internal.scans.getFileUrl, {
        fileId: scanFull.fileId,
      });

      if (!storageUrl) throw new Error("File URL not found");

      // Use file_to_markdown to convert
      let resumeText = "";
      try {
        const mdResult = await callTool<{ content: string }>(
          "file_to_markdown",
          {
            file_path_or_url: storageUrl,
          },
        );
        resumeText = mdResult.content;
      } catch {
        // Fallback: fetch raw text
        try {
          const fileResp = await fetch(storageUrl);
          const fileBytes = await fileResp.arrayBuffer();
          const textDecoder = new TextDecoder();
          resumeText = textDecoder.decode(fileBytes);
        } catch {
          resumeText = "";
        }
      }

      if (!resumeText || resumeText.trim().length < 20) {
        throw new Error(
          "Could not extract text from the uploaded file. Please ensure it's a valid PDF or DOCX document.",
        );
      }

      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId: args.scanId,
        status: "extracting",
        resumeText: resumeText.slice(0, 10000),
      });

      // 3. Extract profile details using AI
      const extractionPrompt = `Analyze this resume/CV text and extract the following details in a strict JSON format. Return ONLY valid JSON, no markdown code fences, no explanations.

Resume text:
---
${resumeText.slice(0, 6000)}
---

Return this exact JSON structure:
{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone or null",
  "location": "city/country or null",
  "summary": "brief 1-2 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": [{"title": "job title", "company": "company name", "duration": "time period"}],
  "education": [{"degree": "degree name", "institution": "school name"}],
  "jobTitlesSearched": ["3-5 relevant job titles to search for based on this person's profile"]
}`;

      const extractionResult = await callTool<{ search_response: string }>(
        "quick_ai_search",
        {
          search_question: extractionPrompt,
        },
      );

      let profile: any;
      try {
        const responseText = extractionResult.search_response;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          profile = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch {
        const words = resumeText.split(/\s+/).slice(0, 200);
        profile = {
          name: null,
          email: null,
          phone: null,
          location: null,
          summary: words.slice(0, 30).join(" "),
          skills: [],
          experience: [],
          education: [],
          jobTitlesSearched: ["web developer", "software developer", "IT support"],
        };
      }

      // Sanitize to only include schema-valid fields
      const cleanProfile = sanitizeProfile(profile);

      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId: args.scanId,
        status: "searching",
        extractedProfile: cleanProfile,
      });

      // 4. Search for jobs based on extracted profile
      const allJobs: any[] = [];
      const searchQueries = cleanProfile.jobTitlesSearched.slice(0, 4);
      const locationStr = cleanProfile.location || "remote";

      for (const jobTitle of searchQueries) {
        try {
          const searchQuery = `Find current job vacancies and openings for "${jobTitle}" in ${locationStr}. Include company name, location, job description, and application URL if available. Focus on recent listings from job boards like LinkedIn, Indeed, Glassdoor, JobStreet, or local job sites.`;

          const searchResult = await callTool<{ search_response: string }>(
            "quick_ai_search",
            { search_question: searchQuery },
          );

          const parsePrompt = `From this job search result, extract individual job listings as a JSON array. Return ONLY valid JSON array, no markdown, no explanations.

Search results:
---
${searchResult.search_response}
---

Return this format:
[{"title": "job title", "company": "company name", "location": "location", "description": "brief description (2-3 sentences)", "url": "application link or null", "source": "source website", "matchReason": "why this matches the candidate"}]

Extract up to 5 jobs. If no real jobs found, return empty array [].`;

          const parseResult = await callTool<{ search_response: string }>(
            "quick_ai_search",
            { search_question: parsePrompt },
          );

          try {
            const jobsText = parseResult.search_response;
            const jsonArrMatch = jobsText.match(/\[[\s\S]*\]/);
            if (jsonArrMatch) {
              const parsed = JSON.parse(jsonArrMatch[0]);
              if (Array.isArray(parsed)) {
                for (const job of parsed) {
                  allJobs.push({
                    title: job.title || jobTitle,
                    company: job.company || "Unknown Company",
                    location: job.location || locationStr,
                    description: job.description || "No description available",
                    url: job.url || undefined,
                    source: job.source || undefined,
                    matchReason:
                      job.matchReason ||
                      `Matches your profile as ${jobTitle}`,
                  });
                }
              }
            }
          } catch {
            allJobs.push({
              title: jobTitle,
              company: "Various Companies",
              location: locationStr,
              description: searchResult.search_response.slice(0, 300),
              matchReason: `Based on your experience as ${jobTitle}`,
            });
          }
        } catch (e) {
          console.error(`Search failed for "${jobTitle}":`, e);
        }
      }

      // 5. Update with final results — sanitize job objects
      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId: args.scanId,
        status: "complete",
        jobs: sanitizeJobs(allJobs),
      });
    } catch (error: any) {
      console.error("Scan processing error:", error);
      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId: args.scanId,
        status: "error",
        errorMessage:
          error.message || "An unexpected error occurred while processing",
      });
    }
    return null;
  },
});

// Query that also returns fileId (for internal use)
export const getScanFull = query({
  args: { scanId: v.id("scans") },
  returns: v.union(
    v.object({
      _id: v.id("scans"),
      _creationTime: v.number(),
      fileName: v.string(),
      fileId: v.id("_storage"),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;
    return {
      _id: scan._id,
      _creationTime: scan._creationTime,
      fileName: scan.fileName,
      fileId: scan.fileId,
      status: scan.status,
    };
  },
});
