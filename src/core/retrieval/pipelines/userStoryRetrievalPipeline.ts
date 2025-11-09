import { UserStoryRetrievalService } from '../services/userStoryRetrievalService.js';
import { 
  UserStoryRetrievalRequest, 
  UserStoryRetrievalResponse 
} from '../../../shared/types/userStoryRetrieval.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * User Story Retrieval Pipeline
 * Handles the complete retrieval workflow for user stories
 */
export class UserStoryRetrievalPipeline {
  private retrievalService: UserStoryRetrievalService | null = null;

  constructor() {
    // Services will be initialized via initialize() method
  }

  /**
   * Initialize the retrieval pipeline
   */
  async initialize(): Promise<void> {
    const traceId = `pipeline-init-${Date.now()}`;
    try {
      this.retrievalService = new UserStoryRetrievalService();
      await this.retrievalService.initialize();
      
      logger.status(traceId, "Retrieval pipeline initialized successfully", "✅");
    } catch (error) {
      logger.error(traceId, "Failed to initialize retrieval pipeline", error);
      throw error;
    }
  }

  /**
   * Process a retrieval request
   */
  async processRequest(request: UserStoryRetrievalRequest): Promise<UserStoryRetrievalResponse> {
    if (!this.retrievalService) {
      throw new Error("Pipeline not initialized. Call initialize() first.");
    }

    const traceId = `retrieval-pipeline-${Date.now()}`;
    
    try {
      logger.status(traceId, "Processing retrieval request", "🔄");
      
      const response = await this.retrievalService.retrieveUserStories(
        request.userInput,
        request.relevantStoriesLimit,
        traceId,
        request.searchMode,
        request.vectorWeight || 50,
        request.bm25Weight || 50
      );

      logger.status(traceId, "Retrieval request completed", "✅");
      return response;
    } catch (error) {
      logger.error(traceId, "Retrieval pipeline failed", error);
      throw error;
    }
  }

  /**
   * Get pipeline health status
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; initialized: boolean }> {
    try {
      const initialized = this.retrievalService !== null;
      const status = initialized ? 'healthy' : 'unhealthy';
      
      return { status, initialized };
    } catch (error) {
      return { status: 'unhealthy', initialized: false };
    }
  }
}

/**
 * Convenience function to create and initialize a pipeline
 */
export async function createRetrievalPipeline(): Promise<UserStoryRetrievalPipeline> {
  const pipeline = new UserStoryRetrievalPipeline();
  await pipeline.initialize();
  return pipeline;
}
