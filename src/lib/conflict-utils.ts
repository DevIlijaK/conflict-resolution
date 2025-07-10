import { type Doc } from "../../convex/_generated/dataModel";

type ConflictStatus = Doc<"conflicts">["status"];

// Define the workflow order
const STATUS_ORDER: ConflictStatus[] = [
  "draft",
  "interview",
  "in_progress",
  "resolved",
  "archived",
];

// Helper function to check if a stage is completed
export function isStageCompleted(
  currentStatus: ConflictStatus,
  targetStage: ConflictStatus,
): boolean {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const targetIndex = STATUS_ORDER.indexOf(targetStage);
  return currentIndex > targetIndex;
}

// Specific helper functions for each stage
export function isDraftCompleted(status: ConflictStatus): boolean {
  return isStageCompleted(status, "draft");
}

export function isInterviewCompleted(status: ConflictStatus): boolean {
  return isStageCompleted(status, "interview");
}

export function isInProgressCompleted(status: ConflictStatus): boolean {
  return isStageCompleted(status, "in_progress");
}

export function isResolved(status: ConflictStatus): boolean {
  return status === "resolved" || status === "archived";
}

// Get completion info for all stages
export function getCompletionStatus(status: ConflictStatus) {
  return {
    draft: isDraftCompleted(status),
    interview: isInterviewCompleted(status),
    inProgress: isInProgressCompleted(status),
    resolved: isResolved(status),
    archived: status === "archived",
  };
}
