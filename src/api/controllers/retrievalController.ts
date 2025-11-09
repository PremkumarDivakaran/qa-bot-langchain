import { Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../../shared/utils/logger.js";
import { UserStoryRetrievalService } from "../../core/retrieval/services/userStoryRetrievalService.js";
import { 
  UserStoryRetrievalRequestSchema,
  UserStoryRetrievalRequest,
  UserStoryRetrievalResponse,
  UserStoryRetrievalErrorResponse
} from "../../shared/types/index.js";

export class RetrievalController {
  private static retrievalService: UserStoryRetrievalService | null = null;
  
  /**
   * Initialize the retrieval service
   */
  static async initializeService() {
    try {
      this.retrievalService = new UserStoryRetrievalService();
      await this.retrievalService.initialize();
      console.log("✅ User Story Retrieval Service ready");
    } catch (error) {
      console.error("❌ Failed to initialize User Story Retrieval Service:", error);
      throw error;
    }
  }
  
  /**
   * Get retrieval service instance
   */
  static getService(): UserStoryRetrievalService {
    if (!this.retrievalService) {
      throw new Error("User Story Retrieval Service not initialized. Please wait for server startup to complete.");
    }
    return this.retrievalService;
  }
  
  /**
   * Handle user story retrieval request
   */
  static async retrieveUserStories(req: Request, res: Response) {
    const traceId = `retrieve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      logger.detailed(traceId, `=== USER STORY RETRIEVAL REQUEST ===`);
      logger.detailed(traceId, `Timestamp: ${new Date().toISOString()}`);
      logger.detailed(traceId, `Request Body: ${JSON.stringify(req.body, null, 2)}`);

      // Validate request
      const parsed = UserStoryRetrievalRequestSchema.parse(req.body as UserStoryRetrievalRequest);
      
      logger.detailed(traceId, `Request validated`);
      logger.detailed(traceId, `User Input: "${parsed.userInput}"`);
      logger.detailed(traceId, `Relevant Stories Limit: ${parsed.relevantStoriesLimit}`);
      logger.detailed(traceId, `Search Mode: ${parsed.searchMode}`);
      logger.detailed(traceId, `Vector Weight: ${parsed.vectorWeight}`);
      logger.detailed(traceId, `BM25 Weight: ${parsed.bm25Weight}`);

      // Check if retrieval service is initialized
      const retrievalService = RetrievalController.getService();

      // Perform retrieval and standardization  
      const result: UserStoryRetrievalResponse = await retrievalService.retrieveUserStories(
        parsed.userInput,
        parsed.relevantStoriesLimit || 5,
        traceId,
        parsed.searchMode || "hybrid",
        parsed.vectorWeight !== undefined ? parsed.vectorWeight : 0.5,
        parsed.bm25Weight !== undefined ? parsed.bm25Weight : 0.5
      );

      const duration = Date.now() - startTime;
      result.duration = duration;

      logger.status(traceId, `Retrieval completed in ${duration}ms`);
      logger.detailed(traceId, `Created user story ID: ${result.createdUserStory.storyId}`);
      logger.detailed(traceId, `Found ${result.relevantUserStories.length} relevant stories`);
      logger.detailed(traceId, `Generated score: ${result.score}/100`);

      logger.detailed(traceId, `📤 Sending response to client`);
      logger.detailed(traceId, `====================================`);

      res.json(result);
      
    } catch (err: any) {
      const duration = Date.now() - startTime;
      
      // Handle different types of errors with appropriate status codes
      let statusCode = 500; // Default to internal server error
      let errorMessage = err.message ?? String(err);
      
      if (err instanceof ZodError) {
        // Validation error - return 400 Bad Request
        statusCode = 400;
        errorMessage = err.errors.map(e => e.message).join('; ');
        
        console.error(`\n[${traceId}] === VALIDATION ERROR ===`);
        console.error(`Validation errors:`, err.errors);
        console.error(`Duration: ${duration}ms`);
        console.error(`====================================\n`);
      } else if (errorMessage.includes("searchMode") || errorMessage.includes("Weight")) {
        // Custom validation errors from our refine method - return 400 Bad Request
        statusCode = 400;
        
        console.error(`\n[${traceId}] === PARAMETER VALIDATION ERROR ===`);
        console.error(`Error:`, errorMessage);
        console.error(`Duration: ${duration}ms`);
        console.error(`====================================\n`);
      } else if (errorMessage.includes("not initialized")) {
        // Service initialization error - return 503 Service Unavailable
        statusCode = 503;
        
        console.error(`\n[${traceId}] === SERVICE UNAVAILABLE ERROR ===`);
        console.error(`Error:`, errorMessage);
        console.error(`Duration: ${duration}ms`);
        console.error(`====================================\n`);
      } else {
        // General server error - return 500 Internal Server Error
        console.error(`\n[${traceId}] === RETRIEVAL ERROR ===`);
        console.error(`Error:`, errorMessage);
        console.error(`Duration: ${duration}ms`);
        console.error(`Stack:`, err.stack);
        console.error(`====================================\n`);
      }

      const errorResponse: UserStoryRetrievalErrorResponse = {
        error: errorMessage,
        details: err.stack,
        timestamp: new Date().toISOString(),
        traceId
      };

      res.status(statusCode).json(errorResponse);
    }
  }
}
