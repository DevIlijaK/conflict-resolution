export type ConflictStatus =
  | "draft"
  | "interview"
  | "in_progress"
  | "resolved"
  | "archived";

export const statusLabel: Record<ConflictStatus, string> = {
  draft: "Step 1 — Your side",
  interview: "Step 1 — Your side",
  in_progress: "Processing",
  resolved: "Resolved",
  archived: "Archived",
};
