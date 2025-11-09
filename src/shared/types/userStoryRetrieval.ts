import { z } from "zod";

/**
 * User Story Retrieval Request Schema with advanced validation
 */
export const UserStoryRetrievalRequestSchema = z.object({
  userInput: z.string().min(1, "User input cannot be empty"),
  relevantStoriesLimit: z.number().int().positive().optional().default(5),
  searchMode: z.enum(["vector", "bm25", "hybrid"]).optional().default("hybrid"),
  vectorWeight: z.number().min(0).max(1).optional().default(0.5),
  bm25Weight: z.number().min(0).max(1).optional().default(0.5)
}).refine((data) => {
  // Custom validation logic for search mode and weights consistency
  const { searchMode, vectorWeight, bm25Weight } = data;
  
  if (searchMode === "vector") {
    if (vectorWeight !== 1) {
      throw new Error("When searchMode is 'vector', vectorWeight must be 1");
    }
    if (bm25Weight !== 0) {
      throw new Error("When searchMode is 'vector', bm25Weight must be 0");
    }
  }
  
  if (searchMode === "bm25") {
    if (vectorWeight !== 0) {
      throw new Error("When searchMode is 'bm25', vectorWeight must be 0");
    }
    if (bm25Weight !== 1) {
      throw new Error("When searchMode is 'bm25', bm25Weight must be 1");
    }
  }
  
  if (searchMode === "hybrid") {
    if (vectorWeight < 0 || vectorWeight > 1) {
      throw new Error("When searchMode is 'hybrid', vectorWeight must be between 0 and 1");
    }
    if (bm25Weight < 0 || bm25Weight > 1) {
      throw new Error("When searchMode is 'hybrid', bm25Weight must be between 0 and 1");
    }
    // Additional check: weights should sum to 1 for hybrid mode
    if (Math.abs(vectorWeight + bm25Weight - 1) > 0.001) {
      throw new Error("When searchMode is 'hybrid', vectorWeight + bm25Weight must equal 1");
    }
  }
  
  return true;
}, {
  message: "Invalid combination of searchMode and weight parameters"
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
  projectName: string;
  title: string;
  description: string;
  acceptanceCriteria?: string | null;
  priority: string;
  category: string;
  risk?: string | null;
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
