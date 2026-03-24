/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_kinds_intakeInterview from "../ai/kinds/intakeInterview.js";
import type * as ai_prompts_intakeInterview from "../ai/prompts/intakeInterview.js";
import type * as ai_streamingChat from "../ai/streamingChat.js";
import type * as conflicts from "../conflicts.js";
import type * as http_conflictIntakeStream from "../http/conflictIntakeStream.js";
import type * as http from "../http.js";
import type * as intake_constants from "../intake/constants.js";
import type * as intake_summary from "../intake/summary.js";
import type * as intake_summarySchema from "../intake/summarySchema.js";
import type * as messages from "../messages.js";
import type * as streaming from "../streaming.js";
import type * as users from "../users.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/kinds/intakeInterview": typeof ai_kinds_intakeInterview;
  "ai/prompts/intakeInterview": typeof ai_prompts_intakeInterview;
  "ai/streamingChat": typeof ai_streamingChat;
  conflicts: typeof conflicts;
  "http/conflictIntakeStream": typeof http_conflictIntakeStream;
  http: typeof http;
  "intake/constants": typeof intake_constants;
  "intake/summary": typeof intake_summary;
  "intake/summarySchema": typeof intake_summarySchema;
  messages: typeof messages;
  streaming: typeof streaming;
  users: typeof users;
  voice: typeof voice;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
