import { z } from "zod";

/**
 * Intake summary output: Zod validates the API response; {@link INTAKE_SUMMARY_JSON_SCHEMA}
 * is sent to OpenAI Structured Outputs. If you add or rename fields, update both.
 */

export const intakeSummarySchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Short concrete title (~12 words max). Who/what/relationship + issue. No generic phrases like New conflict.",
    ),
  description: z
    .string()
    .min(1)
    .max(32_000)
    .describe(
      "Long, detailed neutral narrative for downstream mediation steps: all parties, relationships, full chronology, disputed points, relevant communications and decisions, and open questions. Third person, factual, no advice.",
    ),
});

export type IntakeSummary = z.infer<typeof intakeSummarySchema>;

export const INTAKE_SUMMARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      description:
        "Short concrete title (~12 words). Who/what/relationship + issue. Never generic like New conflict.",
    },
    description: {
      type: "string",
      description:
        "Detailed third-person factual narrative: parties, relationships, full timeline, what each side says happened, core disagreements, key messages or meetings, stakes, and anything unclear. Rich enough for later stages without re-interviewing the user. No advice or judgment.",
    },
  },
  required: ["title", "description"],
} as const satisfies Record<string, unknown>;
