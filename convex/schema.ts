import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  scans: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.id("users")),
    fileName: v.string(),
    fileId: v.id("_storage"),
    status: v.union(
      v.literal("uploading"),
      v.literal("parsing"),
      v.literal("extracting"),
      v.literal("searching"),
      v.literal("complete"),
      v.literal("error"),
    ),
    resumeText: v.optional(v.string()),
    extractedProfile: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        location: v.optional(v.string()),
        summary: v.optional(v.string()),
        skills: v.array(v.string()),
        experience: v.array(
          v.object({
            title: v.string(),
            company: v.optional(v.string()),
            duration: v.optional(v.string()),
          }),
        ),
        education: v.array(
          v.object({
            degree: v.string(),
            institution: v.optional(v.string()),
          }),
        ),
        jobTitlesSearched: v.array(v.string()),
      }),
    ),
    jobs: v.optional(
      v.array(
        v.object({
          title: v.string(),
          company: v.string(),
          location: v.string(),
          description: v.string(),
          url: v.optional(v.string()),
          source: v.optional(v.string()),
          matchReason: v.optional(v.string()),
        }),
      ),
    ),
    errorMessage: v.optional(v.string()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),
});

export default schema;
