import { z } from "zod";

/**
 * User Story Retrieval Request Schema
 */
export const UserStoryRetrievalRequestSchema = z.object({
  userInput: z.string().min(1, "User input cannot be empty"),
  relevantStoriesLimit: z.number().int().positive().optional().default(5)
});

export type UserStoryRetrievalRequest = z.infer<typeof UserStoryRetrievalRequestSchema>;

/**
 * Standardized User Story Structure
 */
export interface StandardizedUserStory {
  storyId: string;
  summary: string;
  projectName: string;
  description: string;
  acceptanceCriteria: string;
  parentSummary: string;
  statusCategory: string;
  priority: string;
  risk: string;
  createdDate: string;
  lastModifiedDate: string;
}

/**
 * User Story Vector Search Result
 */
export interface UserStorySearchResult {
  storyId: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  fullContent: string;
  fileName: string;
  score: number;
}

/**
 * User Story Retrieval Response
 */
export interface UserStoryRetrievalResponse {
  createdUserStory: StandardizedUserStory;
  relevantUserStories: UserStorySearchResult[];
  score: number;
  query: string;
  resultCount: number;
  duration: number;
  metadata: {
    traceId: string;
    model: string;
    embedding: string;
  };
}

/**
 * Error Response
 */
export interface UserStoryRetrievalErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
  traceId?: string;
}
