import path from "node:path";
import { config } from "../../../shared/config/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { UserStoryVectorStore } from "../../../infrastructure/lib/vectorstore/index.js";
import { 
  getUserStoryFiles, 
  loadUserStoriesFromCSV,
  type UserStoryCSVRow 
} from "../utils/index.js";

/**
 * User Story Ingestion Service
 * Handles the core business logic for ingesting user stories into the vector store
 */
export class UserStoryIngestionService {
  private vectorStore: UserStoryVectorStore | null = null;

  constructor() {
    // Will be initialized via initialize()
  }

  /**
   * Initialize the ingestion service
   */
  async initialize(): Promise<void> {
    const traceId = `ingestion-service-init-${Date.now()}`;
    
    try {
      const embeddingApiKey = config.embeddings.provider === 'mistral'
        ? config.mistral.apiKey
        : config.openai.apiKey;
      
      if (!embeddingApiKey) {
        throw new Error(`API key not configured for embedding provider: ${config.embeddings.provider}`);
      }

      logger.detailed(traceId, `Initializing vector store with ${config.embeddings.provider}`, "🔗");
      this.vectorStore = new UserStoryVectorStore({
        mongoUri: config.mongodb.uri,
        dbName: config.mongodb.dbName,
        collectionName: "user_stories",
        indexName: "user_stories_vector_index",
        embeddingProvider: config.embeddings.provider,
        embeddingModel: config.embeddings.model,
        apiKey: embeddingApiKey,
      });

      await this.vectorStore.initialize();
      logger.status(traceId, "Ingestion service initialized successfully", "✅");
      
    } catch (error) {
      logger.error(traceId, "Failed to initialize ingestion service", error);
      throw error;
    }
  }

  /**
   * Clear existing data from vector store
   */
  async clearExistingData(traceId: string): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    logger.status(traceId, "Clearing existing user stories from vector store", "🗑️");
    await this.vectorStore.clearCollection();
    logger.detailed(traceId, "Existing user stories cleared successfully");
  }

  /**
   * Get list of CSV files to process
   */
  async getFilesToProcess(): Promise<string[]> {
    const documentsPath = path.resolve(process.cwd(), config.userStoryDocuments.folder);
    const csvFiles = await getUserStoryFiles(documentsPath);
    
    if (csvFiles.length === 0) {
      throw new Error(`No CSV files found in ${documentsPath}`);
    }

    return csvFiles;
  }

  /**
   * Process a single CSV file
   */
  async processFile(filePath: string, traceId: string): Promise<{
    success: boolean;
    fileName: string;
    storiesProcessed: number;
    error?: string;
  }> {
    const fileName = path.basename(filePath);
    
    try {
      logger.status(traceId, `Processing ${fileName}`, "📄");
      
      // Load and validate CSV data
      const userStories = await loadUserStoriesFromCSV(filePath);
      logger.detailed(traceId, `Loaded ${userStories.length} user stories from ${fileName}`);

      if (userStories.length === 0) {
        logger.warn(traceId, `No valid user stories found in ${fileName}`, "⚠️");
        return {
          success: true,
          fileName,
          storiesProcessed: 0
        };
      }

      // Process stories in batches for better performance
      await this.processStoriesBatch(userStories, fileName, traceId);

      logger.status(traceId, `✅ Processed ${fileName}: ${userStories.length} stories`, "✅");
      
      return {
        success: true,
        fileName,
        storiesProcessed: userStories.length
      };
      
    } catch (error) {
      const errorMsg = `Failed to process ${fileName}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(traceId, errorMsg, error);
      
      return {
        success: false,
        fileName,
        storiesProcessed: 0,
        error: errorMsg
      };
    }
  }

  /**
   * Process stories in batches
   */
  private async processStoriesBatch(userStories: UserStoryCSVRow[], fileName: string, traceId: string): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    const batchSize = config.ingestion.batchSize;
    for (let i = 0; i < userStories.length; i += batchSize) {
      const batch = userStories.slice(i, i + batchSize);
      logger.detailed(traceId, `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userStories.length / batchSize)} (${batch.length} stories)`);
      
      // Transform CSV data to match expected format
      const transformedBatch = batch.map(story => ({
        storyId: story.storyId || `STORY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        projectName: story.projectName || null,
        title: story.summary || null,
        description: story.text || story.summary || '',
        acceptanceCriteria: story.acceptanceCriteria || null,
        priority: story.priority || null,
        category: story.statusCategory || null,
        risk: story.risk || null,
        fullContent: `Summary: ${story.summary || ''}\nText: ${story.text || ''}\nPriority: ${story.priority || ''}\nStatus: ${story.statusCategory || ''}\nAcceptance Criteria: ${story.acceptanceCriteria || ''}`,
        fileName: fileName
      }));
      
      await this.vectorStore.addUserStories(transformedBatch);
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; initialized: boolean }> {
    try {
      const initialized = this.vectorStore !== null;
      const status = initialized ? 'healthy' : 'unhealthy';
      
      return { status, initialized };
    } catch (error) {
      return { status: 'unhealthy', initialized: false };
    }
  }
}
