import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { createEmbeddings } from "../embeddings/index.js";
import { logger } from "../../utils/logger.js";

export interface UserStoryVectorStoreConfig {
  mongoUri: string;
  dbName: string;
  collectionName: string;
  indexName?: string;
  embeddingProvider: string;
  embeddingModel: string;
  apiKey: string;
}

/**
 * LangChain MongoDB Vector Store for User Story Management
 * Supports Mistral (mistral-embed, 1024 dims) and OpenAI embeddings
 * Uses LangChain's MongoDBAtlasVectorSearch integration
 */
export class UserStoryVectorStore {
  private client: MongoClient;
  private vectorStore: MongoDBAtlasVectorSearch | null = null;
  private embeddings: Embeddings | null = null;
  private config: UserStoryVectorStoreConfig;

  constructor(config: UserStoryVectorStoreConfig) {
    this.config = config;
    this.client = new MongoClient(config.mongoUri);
  }

  /**
   * Initialize the vector store connection
   */
  async initialize(): Promise<void> {
    try {
      // Initialize embeddings using factory
      this.embeddings = await createEmbeddings({
        provider: this.config.embeddingProvider,
        model: this.config.embeddingModel,
        apiKey: this.config.apiKey,
      });
      
      logger.detailed('vector-store', `Initialized ${this.config.embeddingProvider} embeddings (${this.config.embeddingModel})`);
      
      await this.client.connect();
      
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);

      // Initialize LangChain MongoDB Atlas Vector Search
      this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
        collection,
        indexName: this.config.indexName || "vector_index",
        textKey: "fullContent",
        embeddingKey: "embedding"
      });

      logger.detailed('vector-store', `Connected to MongoDB Vector Store: ${this.config.dbName}.${this.config.collectionName}`);
    } catch (error) {
      throw new Error(`Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add user story documents with automatic embedding generation
   * Uses batch processing for efficiency
   */
  async addUserStories(userStories: Array<{
    title: string | null;
    description: string;
    priority: string | null;
    category: string | null;
    fullContent: string;
    fileName: string;
  }>): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    if (userStories.length === 0) {
      logger.detailed('vector-store', "No user stories to add");
      return;
    }

    // Convert to LangChain Documents
    const documents = userStories.map((userStory) => 
      new Document({
        pageContent: userStory.fullContent,
        metadata: {
          title: userStory.title || "Untitled",
          description: userStory.description,
          priority: userStory.priority || "unknown",
          category: userStory.category || "general",
          fileName: userStory.fileName,
          processedAt: new Date().toISOString(),
        }
      })
    );

    try {
      logger.detailed('vector-store', `Generating embeddings for ${userStories.length} user stories...`);
      const startTime = Date.now();
      
      await this.vectorStore.addDocuments(documents);
      
      const duration = Date.now() - startTime;
      logger.detailed('vector-store', `✓ Added ${userStories.length} user stories with embeddings (${duration}ms)`);
    } catch (error) {
      throw new Error(`Failed to add user stories: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add user stories with concurrent batch processing for better performance
   * Recommended for large datasets
   */
  async addUserStoriesBatch(
    userStories: Array<{
      title: string | null;
      description: string;
      priority: string | null;
      category: string | null;
      fullContent: string;
      fileName: string;
      storyId?: string;
    }>,
    batchSize: number = 5
  ): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    if (userStories.length === 0) {
      logger.detailed('vector-store', "No user stories to add");
      return;
    }

    logger.detailed('vector-store', `Processing ${userStories.length} user stories in batches of ${batchSize}...`);
    const startTime = Date.now();

    // Split into batches
    const batches: typeof userStories[] = [];
    for (let i = 0; i < userStories.length; i += batchSize) {
      batches.push(userStories.slice(i, i + batchSize));
    }

    let successCount = 0;
    let failureCount = 0;

    // Process batches in parallel with concurrency limit
    const concurrencyLimit = Math.min(5, batches.length); // Max 5 concurrent batches
    const results = [];
    
    for (let i = 0; i < batches.length; i += concurrencyLimit) {
      const batchGroup = batches.slice(i, i + concurrencyLimit);
      
      const groupPromises = batchGroup.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex;
        const documents = batch.map((userStory) => 
          new Document({
            pageContent: userStory.fullContent,
            metadata: {
              title: userStory.title || "Untitled",
              description: userStory.description,
              priority: userStory.priority || "unknown",
              category: userStory.category || "general",
              fileName: userStory.fileName,
              storyId: userStory.storyId || `${userStory.fileName}_${userStory.title}`,
              processedAt: new Date().toISOString(),
            }
          })
        );

        try {
          if (!this.vectorStore) {
            throw new Error("Vector store not initialized during batch processing");
          }
          await this.vectorStore.addDocuments(documents);
          logger.detailed('vector-store', `✓ Batch ${actualBatchIndex + 1}/${batches.length} completed (${batch.length} user stories)`);
          return { success: true, count: batch.length };
        } catch (error) {
          console.error(`✗ Batch ${actualBatchIndex + 1} failed:`, error instanceof Error ? error.message : String(error));
          return { success: false, count: 0 };
        }
      });

      const groupResults = await Promise.all(groupPromises);
      results.push(...groupResults);
    }

    // Calculate final statistics
    for (const result of results) {
      if (result.success) {
        successCount += result.count;
      } else {
        failureCount++;
      }
    }

    const duration = Date.now() - startTime;
    logger.detailed('vector-store', `\n✓ Batch processing complete:`);
    logger.detailed('vector-store', `  - Successful: ${successCount} user stories`);
    logger.detailed('vector-store', `  - Failed: ${failureCount} batches`);
    logger.detailed('vector-store', `  - Duration: ${duration}ms`);
    logger.detailed('vector-store', `  - Average: ${(duration / userStories.length).toFixed(2)}ms per user story`);

    if (failureCount > 0) {
      throw new Error(`${failureCount} batch(es) failed during processing`);
    }
  }

  /**
   * Semantic search across user stories using vector similarity
   */
  async searchUserStories(query: string, topK: number = 5): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, topK);
      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Semantic search with relevance scores
   */
  async searchWithScores(query: string, topK: number = 5): Promise<Array<[Document, number]>> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    try {
      const results = await this.vectorStore.similaritySearchWithScore(query, topK);
      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all documents from the collection
   */
  async clearCollection(): Promise<void> {
    try {
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);
      
      const result = await collection.deleteMany({});
      logger.detailed('vector-store', `Cleared ${result.deletedCount} documents from collection`);
    } catch (error) {
      throw new Error(`Failed to clear collection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if user stories already exist by their IDs or content hash
   */
  async getExistingUserStoryIds(): Promise<Set<string>> {
    try {
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);
      
      // Get all existing user story IDs from metadata
      const existingDocs = await collection.find(
        { "metadata.storyId": { $exists: true } },
        { projection: { "metadata.storyId": 1 } }
      ).toArray();
      
      const existingIds = new Set<string>();
      for (const doc of existingDocs) {
        if (doc.metadata?.storyId) {
          existingIds.add(doc.metadata.storyId);
        }
      }
      
      logger.detailed('vector-store', `Found ${existingIds.size} existing user story IDs in database`);
      return existingIds;
    } catch (error) {
      console.error("Error checking existing user stories:", error);
      return new Set<string>();
    }
  }

  /**
   * Remove user stories by their IDs
   */
  async removeUserStoriesByIds(storyIds: string[]): Promise<number> {
    try {
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);
      
      const result = await collection.deleteMany({
        "metadata.storyId": { $in: storyIds }
      });
      
      logger.detailed('vector-store', `Removed ${result.deletedCount} existing user stories to prevent duplicates`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error removing existing user stories:", error);
      return 0;
    }
  }

  /**
   * Add user stories with duplicate detection and removal
   */
  async addUserStoriesWithDeduplication(
    userStories: Array<{
      storyId?: string;
      title: string | null;
      description: string;
      priority: string | null;
      category: string | null;
      fullContent: string;
      fileName: string;
    }>,
    batchSize: number = 5
  ): Promise<{ added: number; skipped: number; removed: number }> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    if (userStories.length === 0) {
      logger.detailed('vector-store', "No user stories to add");
      return { added: 0, skipped: 0, removed: 0 };
    }

    logger.detailed('vector-store', `🔍 Checking for duplicates among ${userStories.length} user stories...`);
    
    // Get existing user story IDs
    const existingIds = await this.getExistingUserStoryIds();
    
    // Filter out duplicates and track which ones to remove
    const storiesToAdd: typeof userStories = [];
    const duplicateIds: string[] = [];
    
    for (const story of userStories) {
      const storyId = story.storyId || `${story.fileName}_${story.title}`;
      if (existingIds.has(storyId)) {
        duplicateIds.push(storyId);
        storiesToAdd.push({ ...story, storyId }); // Still add it after removing old version
      } else {
        storiesToAdd.push({ ...story, storyId });
      }
    }

    // Remove existing duplicates
    let removedCount = 0;
    if (duplicateIds.length > 0) {
      logger.detailed('vector-store', `🗑️ Removing ${duplicateIds.length} existing user stories to prevent duplicates...`);
      removedCount = await this.removeUserStoriesByIds(duplicateIds);
    }

    // Add new user stories
    await this.addUserStoriesBatch(storiesToAdd.map(story => ({
      title: story.title,
      description: story.description,
      priority: story.priority,
      category: story.category,
      fullContent: story.fullContent,
      fileName: story.fileName,
      storyId: story.storyId!
    })), batchSize);

    logger.detailed('vector-store', `✅ Deduplication complete: ${storiesToAdd.length} added, ${removedCount} duplicates replaced`);
    
    return {
      added: storiesToAdd.length,
      skipped: 0,
      removed: removedCount
    };
  }

  /**
   * Close the MongoDB connection
   */
  async close(): Promise<void> {
    await this.client.close();
    logger.detailed('vector-store', "MongoDB connection closed");
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{ count: number; dbSize: string }> {
    try {
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);
      
      const count = await collection.countDocuments();
      const stats = await this.client.db(this.config.dbName).stats();
      
      return {
        count,
        dbSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the underlying vector store for advanced operations
   */
  getVectorStore(): MongoDBAtlasVectorSearch {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }
    return this.vectorStore;
  }
}
