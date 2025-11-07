import { UserStoryVectorStore } from "../lib/vectorstore/userStoryVectorStore.js";
import { createChatModel } from "../lib/models/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { Document } from "@langchain/core/documents";
import { 
  UserStorySearchResult, 
  StandardizedUserStory, 
  UserStoryRetrievalResponse 
} from "../types/userStoryRetrieval.js";

/**
 * User Story Retrieval Service
 * Implements vector search and LLM-based user story standardization
 */
export class UserStoryRetrievalService {
  private vectorStore: UserStoryVectorStore | null = null;
  private chatModel: any;
  
  constructor() {
    // Will be initialized in initialize() method
  }

  /**
   * Initialize the retrieval service
   */
  async initialize(): Promise<void> {
    // Initialize vector store
    const embeddingApiKey = config.embeddings.provider === 'mistral'
      ? config.mistral.apiKey
      : config.openai.apiKey;
    
    if (!embeddingApiKey) {
      throw new Error(`API key not configured for embedding provider: ${config.embeddings.provider}`);
    }

    this.vectorStore = new UserStoryVectorStore({
      mongoUri: config.mongodb.uri,
      dbName: config.mongodb.dbName,
      collectionName: "user_stories", // Use user stories collection
      indexName: "user_stories_vector_index",
      embeddingProvider: config.embeddings.provider,
      embeddingModel: config.embeddings.model,
      apiKey: embeddingApiKey,
    });

    await this.vectorStore.initialize();

    // Initialize chat model
    this.chatModel = createChatModel();
  }

  /**
   * Retrieve and standardize user stories with hybrid search support
   */
  async retrieveUserStories(
    userInput: string, 
    relevantStoriesLimit: number = 5, 
    traceId: string,
    searchMode: "vector" | "bm25" | "hybrid" = "hybrid",
    vectorWeight: number = 50,
    bm25Weight: number = 50
  ): Promise<UserStoryRetrievalResponse> {
    // Overview logging: Start retrieval process and show main steps
    logger.status(traceId, "=== USER STORY RETRIEVAL PROCESS STARTED ===", "🚀");
    logger.status(traceId, `Step 1: User input received: "${userInput}"`, "📝");
    logger.status(traceId, `Step 2: Relevant stories limit set to: ${relevantStoriesLimit}`, "🎯");
    
    // Detailed logging: Show all steps
    logger.detailed(traceId, "=== USER STORY RETRIEVAL PROCESS STARTED ===", "🚀");
    logger.detailed(traceId, `Step 1: User input received: "${userInput}"`, "📝");
    logger.detailed(traceId, `Step 2: Relevant stories limit set to: ${relevantStoriesLimit}`, "🎯");

    const startTime = Date.now();

    try {
      // Step 3: Perform search based on search mode
      logger.status(traceId, `Step 3: Performing ${searchMode} search`, "🔍");
      logger.detailed(traceId, `Step 3: Starting ${searchMode} search process`, "🔍");
      
      if (searchMode === "hybrid") {
        logger.detailed(traceId, `Hybrid search weights - Vector: ${vectorWeight}%, BM25: ${bm25Weight}%`);
      }
      
      const searchResults = await this.performSearch(userInput, relevantStoriesLimit, traceId, searchMode, vectorWeight, bm25Weight);
      logger.detailed(traceId, `${searchMode} search completed - found ${searchResults.length} relevant stories`);

      // Step 5: Format search results for prompt
      logger.status(traceId, "Step 5: Formatting search results for LLM prompt", "📋");
      logger.detailed(traceId, "Step 5: Formatting search results for LLM prompt", "📋");
      const vectorDbJson = this.formatSearchResultsForPrompt(searchResults);
      logger.detailed(traceId, `Formatted ${searchResults.length} stories for prompt context`);

      // Step 6: Generate standardized user story using LLM
      logger.status(traceId, "Step 6: Generating standardized user story with LLM", "🤖");
      logger.detailed(traceId, "Step 6: Generating standardized user story with LLM", "🤖");
      const llmResponse = await this.generateStandardizedUserStory(
        userInput, 
        vectorDbJson, 
        traceId
      );
      logger.detailed(traceId, "LLM response received and processed");

      // Step 7: Parse LLM response to extract standardized user story and score
      logger.status(traceId, "Step 7: Parsing LLM response and extracting user story fields", "🔧");
      logger.detailed(traceId, "Step 7: Parsing LLM response and extracting fields", "🔧");
      const { createdUserStory, score } = this.parseLLMResponse(llmResponse, searchResults, userInput);
      logger.detailed(traceId, `Generated user story ID: ${createdUserStory.storyId}`);
      logger.detailed(traceId, `Quality score: ${score}/100`);

      const duration = Date.now() - startTime;

      const response: UserStoryRetrievalResponse = {
        createdUserStory,
        relevantUserStories: searchResults,
        score,
        query: userInput,
        resultCount: searchResults.length,
        duration,
        metadata: {
          traceId,
          model: config.modelProvider,
          embedding: `${config.embeddings.provider}/${config.embeddings.model}`
        }
      };

      // Overview logging: Completion
      logger.status(traceId, `Retrieval completed in ${duration}ms`, "✅");
      logger.detailed(traceId, `=== USER STORY RETRIEVAL COMPLETED === (${duration}ms)`, "✅");
      return response;

    } catch (error) {
      logger.error(traceId, "User story retrieval failed", error, "❌");
      throw error;
    }
  }

  /**
   * Perform vector search using the vector store
   */
  private async performVectorSearch(
    query: string, 
    relevantStoriesLimit: number, 
    traceId: string
  ): Promise<UserStorySearchResult[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      // Determine initial search count based on re-ranking configuration
      const initialSearchCount = config.llmReranking.enabled 
        ? config.llmReranking.retrievalTopK 
        : relevantStoriesLimit;

      logger.detailed(traceId, `LLM Re-ranking: ${config.llmReranking.enabled ? 'ENABLED' : 'DISABLED'}`, "🔧");
      logger.detailed(traceId, `Initial vector search count: ${initialSearchCount}`);
      logger.detailed(traceId, `Final results needed: ${relevantStoriesLimit}`);

      // Step 3.1: Initial vector search
      logger.detailed(traceId, "Executing vector similarity search", "🎯");
      const initialDocuments: Document[] = await this.vectorStore.searchUserStories(query, initialSearchCount);
      
      logger.detailed(traceId, `Vector search returned ${initialDocuments.length} initial results`);
      
      // Log initial results summary
      if (initialDocuments.length > 0) {
        logger.detailed(traceId, "Initial Results Summary:", "📋");
        initialDocuments.slice(0, 5).forEach((doc, index) => {
          const storyId = doc.metadata.storyId || `STORY-${index + 1}`;
          const title = doc.metadata.title || doc.pageContent.substring(0, 50) + '...';
          const score = doc.metadata.score || 0.8;
          logger.detailed(traceId, `  ${index + 1}. ${storyId} - "${title}" (score: ${score.toFixed(3)})`);
        });
        if (initialDocuments.length > 5) {
          logger.detailed(traceId, `  ... and ${initialDocuments.length - 5} more results`);
        }
      }

      let finalDocuments = initialDocuments;

      // Step 4: Apply LLM re-ranking if enabled
      if (config.llmReranking.enabled && initialDocuments.length > relevantStoriesLimit) {
        logger.status(traceId, "Step 4: Applying LLM re-ranking to improve relevance", "🤖");
        logger.detailed(traceId, "Step 4: Starting LLM re-ranking process", "🤖");
        finalDocuments = await this.performLLMReranking(query, initialDocuments, relevantStoriesLimit, traceId);
        
        logger.detailed(traceId, `LLM re-ranking completed. Final count: ${finalDocuments.length}`);
        
        // Log final results after re-ranking
        logger.detailed(traceId, "Final Re-ranked Results:", "🎯");
        finalDocuments.forEach((doc, index) => {
          const storyId = doc.metadata.storyId || `STORY-${index + 1}`;
          const title = doc.metadata.title || doc.pageContent.substring(0, 50) + '...';
          const score = doc.metadata.score || 0.8;
          logger.detailed(traceId, `  ${index + 1}. ${storyId} - "${title}" (score: ${score.toFixed(3)})`);
        });
      } else if (config.llmReranking.enabled) {
        logger.detailed(traceId, `LLM re-ranking skipped: initial results (${initialDocuments.length}) <= target count (${relevantStoriesLimit})`, "⏭️");
      }

      // Convert to UserStorySearchResult format
      logger.detailed(traceId, "Converting documents to search result format", "🔄");
      const searchResults = finalDocuments.map((doc: Document, index: number) => ({
        storyId: doc.metadata.storyId || `STORY-${index + 1}`,
        title: doc.metadata.title || doc.pageContent.substring(0, 100),
        description: doc.metadata.description || doc.pageContent,
        priority: doc.metadata.priority || "medium",
        category: doc.metadata.category || "General",
        fullContent: doc.pageContent,
        fileName: doc.metadata.fileName || "unknown",
        score: doc.metadata.score || 0.8 // Default score if not provided
      }));

      logger.detailed(traceId, `Successfully converted ${searchResults.length} documents`);
      return searchResults;

    } catch (error) {
      logger.error(traceId, "Vector search failed", error, "❌");
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Vector search failed: ${errorMessage}`);
    }
  }

  /**
   * Perform LLM-based re-ranking of search results
   */
  private async performLLMReranking(
    query: string,
    documents: Document[],
    targetCount: number,
    traceId: string
  ): Promise<Document[]> {
    logger.detailed(traceId, `Re-ranking ${documents.length} documents to select top ${targetCount}`, "🔄");

    try {
      // Create re-ranking prompt
      logger.detailed(traceId, "Preparing re-ranking prompt for LLM");
      const documentsText = documents.map((doc, index) => {
        const storyId = doc.metadata.storyId || `DOC-${index + 1}`;
        const title = doc.metadata.title || 'No title';
        const content = doc.pageContent.substring(0, 200);
        return `${index + 1}. [${storyId}] ${title}\n   Content: ${content}...`;
      }).join('\n\n');

      const rerankingPrompt = `
You are an expert at ranking user stories based on relevance to a given query.

Query: "${query}"

Here are ${documents.length} user stories ranked by vector similarity. Please re-rank them based on true semantic relevance, business value, and contextual similarity to the query.

Documents:
${documentsText}

Instructions:
1. Analyze each user story's relevance to the query
2. Consider semantic meaning, not just keyword matching
3. Prioritize stories that would provide the best context for generating a similar user story
4. Return ONLY the document numbers (1-${documents.length}) in order of relevance, separated by commas
5. Return exactly ${targetCount} document numbers

Example response: 3,1,7,5,2

Your response (top ${targetCount} document numbers):`;

      logger.detailed(traceId, "Sending re-ranking request to LLM", "📤");
      const response = await this.chatModel.invoke([
        { role: "user", content: rerankingPrompt }
      ]);

      // Parse LLM response to get document indices
      const rankingText = response.content.trim();
      logger.detailed(traceId, `LLM re-ranking response: "${rankingText}"`, "📥");

      const indices = rankingText
        .split(',')
        .map((s: string) => parseInt(s.trim()) - 1) // Convert to 0-based index
        .filter((i: number) => i >= 0 && i < documents.length) // Validate indices
        .slice(0, targetCount); // Ensure we don't exceed target count

      logger.detailed(traceId, `Parsed indices: [${indices.join(', ')}]`);

      if (indices.length < targetCount) {
        logger.warn(traceId, `LLM returned ${indices.length} indices, filling remaining with original order`);
        // Fill remaining slots with documents not already selected
        const usedIndices = new Set(indices);
        for (let i = 0; i < documents.length && indices.length < targetCount; i++) {
          if (!usedIndices.has(i)) {
            indices.push(i);
          }
        }
      }

      // Return re-ranked documents
      const rerankedDocs = indices.map((i: number) => documents[i]).filter(Boolean);
      logger.detailed(traceId, `Re-ranking successful: ${rerankedDocs.length} documents selected`);
      
      return rerankedDocs;

    } catch (error) {
      logger.error(traceId, "LLM re-ranking failed", error, "❌");
      logger.detailed(traceId, "Falling back to original vector ranking", "🔄");
      return documents.slice(0, targetCount);
    }
  }

  /**
   * Perform search using the specified mode (vector, bm25, or hybrid)
   */
  private async performSearch(
    query: string, 
    relevantStoriesLimit: number, 
    traceId: string,
    searchMode: "vector" | "bm25" | "hybrid" = "hybrid",
    vectorWeight: number = 50,
    bm25Weight: number = 50
  ): Promise<UserStorySearchResult[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      // Determine initial search count based on re-ranking configuration
      const initialSearchCount = config.llmReranking.enabled 
        ? config.llmReranking.retrievalTopK 
        : relevantStoriesLimit;

      logger.detailed(traceId, `LLM Re-ranking: ${config.llmReranking.enabled ? 'ENABLED' : 'DISABLED'}`, "🔧");
      logger.detailed(traceId, `Initial search count: ${initialSearchCount}`);
      logger.detailed(traceId, `Final results needed: ${relevantStoriesLimit}`);
      logger.detailed(traceId, `Search mode: ${searchMode}`);

      let initialDocuments: Array<[Document, number]> = [];

      // Perform search based on the selected mode
      switch (searchMode) {
        case "vector":
          logger.detailed(traceId, "Executing vector similarity search", "🎯");
          initialDocuments = await this.vectorStore.searchWithScores(query, initialSearchCount);
          break;
          
        case "bm25":
          logger.detailed(traceId, "Executing BM25 text search", "📝");
          initialDocuments = await this.vectorStore.textSearch(query, initialSearchCount);
          break;
          
        case "hybrid":
          logger.detailed(traceId, "Executing hybrid search (vector + BM25)", "⚡");
          logger.detailed(traceId, `Weights - Vector: ${vectorWeight}%, BM25: ${bm25Weight}%`);
          // Convert percentages to decimals
          const vectorWeightDecimal = vectorWeight / 100;
          const bm25WeightDecimal = bm25Weight / 100;
          initialDocuments = await this.vectorStore.hybridSearch(query, initialSearchCount, vectorWeightDecimal, bm25WeightDecimal);
          break;
          
        default:
          throw new Error(`Unsupported search mode: ${searchMode}`);
      }
      
      logger.detailed(traceId, `${searchMode} search returned ${initialDocuments.length} initial results`);
      
      // Convert to Document array for compatibility with existing code
      const documentsWithScores = initialDocuments.map(([doc, score]) => {
        // Add score to metadata
        doc.metadata.score = score;
        return doc;
      });
      
      // Log initial results summary
      if (documentsWithScores.length > 0) {
        logger.detailed(traceId, "Initial Results Summary:", "📋");
        documentsWithScores.slice(0, 5).forEach((doc, index) => {
          const storyId = doc.metadata.storyId || `STORY-${index + 1}`;
          const title = doc.metadata.title || doc.pageContent.substring(0, 50) + '...';
          const score = doc.metadata.score || 0;
          logger.detailed(traceId, `  ${index + 1}. ${storyId} - "${title}" (score: ${score.toFixed(3)})`);
        });
        if (documentsWithScores.length > 5) {
          logger.detailed(traceId, `  ... and ${documentsWithScores.length - 5} more results`);
        }
      }

      let finalDocuments = documentsWithScores;

      // Step 4: Apply LLM re-ranking if enabled
      if (config.llmReranking.enabled && documentsWithScores.length > relevantStoriesLimit) {
        logger.status(traceId, "Step 4: Applying LLM re-ranking to improve relevance", "🤖");
        logger.detailed(traceId, "Step 4: Starting LLM re-ranking process", "🤖");
        finalDocuments = await this.performLLMReranking(query, documentsWithScores, relevantStoriesLimit, traceId);
        
        logger.detailed(traceId, `LLM re-ranking completed. Final count: ${finalDocuments.length}`);
      } else {
        // No re-ranking, just limit the results
        finalDocuments = documentsWithScores.slice(0, relevantStoriesLimit);
      }

      // Convert documents to UserStorySearchResult format
      return finalDocuments.map((doc, index) => ({
        storyId: doc.metadata.storyId || `${searchMode.toUpperCase()}-STORY-${index + 1}`,
        title: doc.metadata.title || `User Story ${index + 1}`,
        description: doc.pageContent,
        priority: doc.metadata.priority || 'Medium',
        category: doc.metadata.category || 'Uncategorized',
        fullContent: doc.pageContent,
        fileName: doc.metadata.fileName || 'uploaded_file',
        score: doc.metadata.score || 0.8
      }));
    } catch (error) {
      logger.detailed(traceId, `${searchMode} search error: ${error instanceof Error ? error.message : String(error)}`, "❌");
      throw new Error(`${searchMode} search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format search results for the prompt template
   */
  private formatSearchResultsForPrompt(results: UserStorySearchResult[]): string {
    return results.map(result => 
      `${result.storyId},${result.fullContent},${result.title},${result.category},${result.description},${result.priority}`
    ).join('\n');
  }

  /**
   * Generate standardized user story using LLM
   */
  private async generateStandardizedUserStory(
    userInput: string, 
    vectorDbJson: string, 
    traceId: string
  ): Promise<string> {
    const promptTemplate = `Instruction:
You are required to answer the user's question using only the information provided in the context. Do not make assumptions or provide information not present in the context. If the answer cannot be found in the context, respond with "The answer is not available in the provided context." 

Do NOT invent new stories for the "Existing Stories" section. Only use the stories provided in the Vector DB Fetch.

Question:
Format the given user story from the user input into a fully detailed and standardized user story as per the existing user stories. Also, select 3 relevant user stories from the provided vector database.

Context:
User Input:
${userInput}

Vector DB Fetch (Relevant Stories / Examples):
${vectorDbJson}

Expected Result:
1. [MANDATORY] Standardize the user input story into proper format with the following fields:
   - summary
   - projectName (use category from similar stories in Vector DB)
   - description (as per vector DB if needed)
   - acceptanceCriteria
   - storyId
   - parentSummary
   - statusCategory
   - priority (MUST use the most common priority format from Vector DB stories - look for P1, P2, P3, P4 or critical/high/medium/low)
   - risk (analyze similar stories to determine appropriate risk level: Low/Medium/High)
   - createdDate
   - lastModifiedDate
2. Include relevant existing user stories from the vector DB in the same format. **Do not modify their storyId, summary, or other fields.**
3. Provide a score (0–100) for the created user story based on:
   - **Input Quality (0-40 points)**: 
     * Nonsensical input (like random characters): 0-15 points
     * Incomplete sentences: 15-25 points  
     * Basic but unclear requests: 25-35 points
     * Well-formed user story structure: 35-40 points
   - **Business Value (0-30 points)**: Clear purpose and user benefit
   - **Completeness (0-30 points)**: All required fields properly filled
   **Be strict with scoring - poor input should receive 15 points or less.**
4. Ensure output is readable, properly structured, and suitable for ingestion into MongoDB or CSV.

Tone:
Professional, helpful, and factual. Avoid speculation or personal opinions.

Output Format:
- Answer in complete sentences.
- Display all user stories with all fields clearly labeled.
- Include the score for the created user story.
- Avoid including unrelated information.

Persona:
You are an expert assistant with in-depth knowledge of QA, software testing, and healthcare domain user stories. You are precise, clear, and focused on producing accurate, standardized user stories.`;

    try {
      const response = await this.chatModel.invoke([
        { role: "user", content: promptTemplate }
      ]);
      
      return response.content;
    } catch (error) {
      console.error(`[${traceId}] Error generating standardized user story:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM generation failed: ${errorMessage}`);
    }
  }

  /**
   * Parse LLM response to extract standardized user story and score
   */
  private parseLLMResponse(
    llmResponse: string, 
    vectorDbResults?: UserStorySearchResult[], 
    originalInput?: string
  ): { 
    createdUserStory: StandardizedUserStory, 
    score: number 
  } {
    // This is a simplified parser - in production, you might want more robust parsing
    const currentDate = new Date().toISOString();
    
    // Always use our enhanced quality scoring algorithm instead of LLM-provided scores
    // This ensures consistent and strict validation of required fields
    let score = this.calculateInputQualityScore(llmResponse, vectorDbResults, originalInput);
    
    // Ensure score is within valid range
    score = Math.max(0, Math.min(100, score));
    
    logger.detailed('Score calculation completed', `Enhanced scoring algorithm gave: ${score}/100`);

    // Get fallback values from vector DB results
    const vectorDbFallbacks = this.getVectorDbFallbacks(vectorDbResults);

    // For now, create a basic standardized user story
    // In production, you'd want more sophisticated parsing of the LLM response
    const createdUserStory: StandardizedUserStory = {
      storyId: `USR-${Date.now()}`,
      summary: this.extractField(llmResponse, 'summary') || "Generated User Story",
      projectName: this.extractField(llmResponse, 'projectName') || vectorDbFallbacks.projectName,
      description: this.extractField(llmResponse, 'description') || llmResponse.substring(0, 200),
      acceptanceCriteria: this.extractField(llmResponse, 'acceptanceCriteria') || "To be defined",
      parentSummary: this.extractField(llmResponse, 'parentSummary') || "",
      statusCategory: this.extractField(llmResponse, 'statusCategory') || "New",
      priority: this.mapToPriorityFormat(this.extractField(llmResponse, 'priority') || vectorDbFallbacks.priority),
      risk: this.extractField(llmResponse, 'risk') || vectorDbFallbacks.risk,
      createdDate: currentDate,
      lastModifiedDate: currentDate
    };

    return { createdUserStory, score };
  }

  /**
   * Extract fallback values from vector DB results
   */
  private getVectorDbFallbacks(vectorDbResults?: UserStorySearchResult[]): {
    priority: string;
    risk: string;
    projectName: string;
  } {
    if (!vectorDbResults || vectorDbResults.length === 0) {
      return {
        priority: "P3",
        risk: "Low", 
        projectName: "Healthcare System"
      };
    }

    // Get most common priority from vector DB results
    const priorities = vectorDbResults.map(r => r.priority).filter(p => p);
    const mostCommonPriority = this.getMostCommon(priorities) || "P3";

    // For risk and project, use the first available or defaults
    const firstResult = vectorDbResults[0];
    
    return {
      priority: mostCommonPriority,
      risk: "Medium", // Could be enhanced to extract from metadata
      projectName: firstResult.category || "Healthcare System"
    };
  }

  /**
   * Get most common value from array
   */
  private getMostCommon<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    
    const counts = arr.reduce((acc, val) => {
      acc[String(val)] = (acc[String(val)] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxCount = Math.max(...Object.values(counts));
    const mostCommon = Object.keys(counts).find(key => counts[key] === maxCount);
    
    return mostCommon as T;
  }

  /**
   * Map priority text to P-format (P1, P2, P3, P4)
   */
  private mapToPriorityFormat(priority: string): string {
    if (!priority) return "P3";
    
    const cleanPriority = priority.toLowerCase().trim();
    
    // If already in P-format, return as is
    if (/^p[1-4]$/i.test(cleanPriority)) {
      return priority.toUpperCase();
    }
    
    // Map text values to P-format
    switch (cleanPriority) {
      case 'critical':
      case 'urgent':
      case 'highest':
        return 'P1';
      case 'high':
      case 'important':
        return 'P2';
      case 'medium':
      case 'normal':
      case 'moderate':
        return 'P3';
      case 'low':
      case 'minor':
      case 'lowest':
        return 'P4';
      default:
        return 'P3'; // Default to medium priority
    }
  }

  /**
   * Extract field value from LLM response
   */
  private extractField(response: string, fieldName: string): string | null {
    // Updated regex to handle various formatting patterns like "Summary**: text", "Summary: text", etc.
    const regex = new RegExp(`${fieldName}[:\\s*]*:?\\s*([^\\n]+)`, 'i');
    const match = response.match(regex);
    if (match && match[1]) {
      // Clean up the extracted value by removing leading asterisks, colons, and whitespace
      return match[1].replace(/^[*:\s]+/, '').trim();
    }
    return null;
  }

  /**
   * Calculate input quality score based on user input characteristics
   */
  private calculateInputQualityScore(
    llmResponse: string, 
    vectorDbResults?: UserStorySearchResult[], 
    originalInput?: string
  ): number {
    let score = 50; // Start with a neutral base score
    
    // Use original input if provided, otherwise try to extract from LLM response
    let userInput = originalInput;
    if (!userInput) {
      const userInputMatch = llmResponse.match(/user input[:\s]*["]?([^"\\n]+)["]?/i);
      userInput = userInputMatch ? userInputMatch[1].trim() : '';
    }
    
    // If we still don't have user input, return low score
    if (!userInput) {
      return 20;
    }

    // Check if input contains structured user story fields (like a complete user story)
    const inputStructureChecks = {
      hasExplicitSummary: /summary[:\s]*[^\\n]+/i.test(userInput),
      hasExplicitDescription: /description[:\s]*[^\\n]+/i.test(userInput),
      hasExplicitAcceptanceCriteria: /(acceptance\s*criteria|given.*when.*then)/i.test(userInput),
      hasExplicitPriority: /(priority[:\s]*[^\\n]+|p[1-4]|critical|high|medium|low)/i.test(userInput),
      hasExplicitRisk: /(risk\s*level?[:\s]*[^\\n]+|risk[:\s]*(low|medium|high|critical))/i.test(userInput),
      hasExplicitProject: /(project[:\s]*[^\\n]+|story\s*id[:\s]*[^\\n]+)/i.test(userInput)
    };

    const basicChecks = {
      // Basic structure and length
      hasMinLength: userInput.length >= 10,
      hasReasonableLength: userInput.length >= 20,
      hasUserStoryStructure: /as\s+(a|an)\s+\w+/i.test(userInput),
      hasWantStatement: /want\s+to/i.test(userInput),
      hasSoThatClause: /so\s+that/i.test(userInput),
      
      // Content quality
      hasValidWords: !/^[^a-zA-Z]*$/.test(userInput), // Not just symbols/numbers
      hasRepeatedChars: !/(.)\1{4,}/.test(userInput), // No repeated chars like "aaaa"
      isNotGibberish: !/^[a-z]{1,5}$/i.test(userInput.replace(/\s/g, '')), // Not like "adadf"
      hasVowels: /[aeiou]/i.test(userInput),
      hasCommonWords: /\b(user|system|want|need|should|can|will|the|and|or|is|are)\b/i.test(userInput),
      
      // Domain relevance (if healthcare context)
      hasDomainRelevance: vectorDbResults && vectorDbResults.length > 0,
      hasBusinessValue: /\b(manage|create|view|update|delete|process|handle|track|monitor|report)\b/i.test(userInput)
    };

    // Domain matching analysis
    const domainAnalysis = this.analyzeDomainRelevance(userInput, vectorDbResults);
    
    // Score calculation - First check for completely invalid input
    if (!basicChecks.hasValidWords || !basicChecks.hasVowels) {
      return 10; // Very poor input like "adadf"
    }
    
    if (!basicChecks.hasMinLength || !basicChecks.isNotGibberish) {
      return 15; // Poor input - includes gibberish like "adadf"
    }
    
    // Check if input is a properly structured complete user story
    const structureFieldsCount = Object.values(inputStructureChecks).filter(Boolean).length;
    
    if (structureFieldsCount >= 4) {
      // Input contains 4+ structured fields - this is a complete user story
      score += 30; // Bonus for well-structured input
      logger.detailed('Input analysis', `Complete user story detected with ${structureFieldsCount}/6 structured fields`);
    } else if (structureFieldsCount >= 2) {
      // Input contains some structured fields
      score += 15; // Moderate bonus
      logger.detailed('Input analysis', `Partial user story structure detected with ${structureFieldsCount}/6 structured fields`);
    } else if (structureFieldsCount === 0) {
      // No structured fields found - penalize heavily if it's also not a basic user story
      if (!basicChecks.hasUserStoryStructure && !basicChecks.hasWantStatement) {
        score -= 25; // Heavy penalty for unstructured input
        logger.detailed('Input analysis', 'No user story structure detected - applying heavy penalty');
      }
    }
    
    if (!basicChecks.hasReasonableLength) {
      score -= 20;
    }
    
    // User story structure scoring (for basic "As a... I want... so that..." format)
    if (basicChecks.hasUserStoryStructure) score += 20;
    if (basicChecks.hasWantStatement) score += 15;
    if (basicChecks.hasSoThatClause) score += 10;
    
    // Content quality scoring
    if (basicChecks.hasRepeatedChars) score -= 15;
    if (basicChecks.hasCommonWords) score += 10;
    if (basicChecks.hasBusinessValue) score += 15;
    
    // Domain relevance scoring
    if (basicChecks.hasDomainRelevance) {
      if (domainAnalysis.isRelevant) {
        score += 15; // Bonus for domain match
        logger.detailed('Domain analysis', `Domain match detected: ${domainAnalysis.inputDomain} matches ${domainAnalysis.contextDomain}`);
      } else {
        score -= 20; // Penalty for domain mismatch  
        logger.detailed('Domain analysis', `Domain mismatch: ${domainAnalysis.inputDomain} vs ${domainAnalysis.contextDomain} - applying penalty`);
      }
    } else {
      score += 5; // Small bonus if no vector results (no context to mismatch with)
    }
    
    // CRITICAL: LLM response quality - these are REQUIRED fields, not optional bonuses
    const hasValidSummary = this.extractField(llmResponse, 'summary') !== null;
    const hasValidDescription = this.extractField(llmResponse, 'description') !== null;
    const hasValidCriteria = this.extractField(llmResponse, 'acceptanceCriteria') !== null;
    const hasValidProject = this.extractField(llmResponse, 'projectName') !== null;
    const hasValidPriority = this.extractField(llmResponse, 'priority') !== null;
    const hasValidRiskLevel = this.extractField(llmResponse, 'risk') !== null;
    
    // Count missing required fields
    const requiredFields = [hasValidSummary, hasValidDescription, hasValidCriteria, hasValidProject, hasValidPriority, hasValidRiskLevel];
    const missingFieldsCount = requiredFields.filter(field => !field).length;
    
    // Severe penalties for missing required fields
    if (missingFieldsCount >= 5) {
      return Math.max(5, score - 60); // Missing 5+ fields = massive penalty
    } else if (missingFieldsCount >= 3) {
      return Math.max(10, score - 40); // Missing 3-4 fields = major penalty
    } else if (missingFieldsCount >= 1) {
      score -= (missingFieldsCount * 15); // 15 points penalty per missing field
    }
    
    // Only give bonuses if all required fields are present
    if (missingFieldsCount === 0) {
      score += 20; // Bonus for having all required fields
    }
    
    // Use already calculated structure completeness for logging
    const hasBasicStructure = basicChecks.hasUserStoryStructure && basicChecks.hasWantStatement;
    
    logger.detailed('Quality scoring breakdown', 
      `Input structure: ${structureFieldsCount}/6 explicit fields, ` +
      `basic user story format: ${hasBasicStructure ? 'YES' : 'NO'}, ` +
      `domain relevance: ${domainAnalysis.isRelevant ? 'MATCH' : 'MISMATCH'} (${domainAnalysis.inputDomain} vs ${domainAnalysis.contextDomain}), ` +
      `missing LLM fields: ${missingFieldsCount}/6, ` +
      `final score: ${Math.max(5, Math.min(100, score))}`
    );
    
    return Math.max(5, Math.min(100, score)); // Ensure score is between 5-100
  }

  /**
   * Analyze domain relevance between user input and retrieved context
   */
  private analyzeDomainRelevance(
    userInput: string, 
    vectorDbResults?: UserStorySearchResult[]
  ): {
    isRelevant: boolean;
    inputDomain: string;
    contextDomain: string;
    confidence: number;
  } {
    // If no vector results, assume relevance (no context to mismatch with)
    if (!vectorDbResults || vectorDbResults.length === 0) {
      return {
        isRelevant: true,
        inputDomain: 'unknown',
        contextDomain: 'none',
        confidence: 0.5
      };
    }

    // Define domain keywords for detection
    const domainKeywords = {
      healthcare: [
        'patient', 'doctor', 'nurse', 'medical', 'health', 'hospital', 'clinic', 'treatment',
        'diagnosis', 'medication', 'prescription', 'therapy', 'surgery', 'ward', 'emergency',
        'radiology', 'laboratory', 'blood', 'appointment', 'consultation', 'billing',
        'discharge', 'admission', 'pharmacy', 'dietician', 'physiotherapy'
      ],
      retail: [
        'customer', 'product', 'purchase', 'shopping', 'store', 'inventory', 'sales',
        'cart', 'checkout', 'payment', 'order', 'delivery', 'shipping', 'warehouse',
        'catalog', 'discount', 'promotion', 'refund', 'return', 'merchandise'
      ],
      finance: [
        'account', 'transaction', 'payment', 'bank', 'loan', 'credit', 'debit', 'investment',
        'portfolio', 'trading', 'mortgage', 'insurance', 'budget', 'financial', 'money',
        'currency', 'interest', 'balance', 'deposit', 'withdrawal'
      ],
      education: [
        'student', 'teacher', 'course', 'class', 'grade', 'assignment', 'exam', 'curriculum',
        'school', 'university', 'enrollment', 'academic', 'learning', 'education',
        'instructor', 'syllabus', 'semester', 'tuition', 'scholarship'
      ],
      logistics: [
        'shipping', 'delivery', 'transport', 'warehouse', 'inventory', 'supply', 'logistics',
        'freight', 'cargo', 'tracking', 'distribution', 'fulfillment', 'supplier'
      ]
    };

    // Detect input domain
    const inputDomain = this.detectDomain(userInput, domainKeywords);
    
    // Detect context domain from vector results
    const contextText = vectorDbResults
      .map(result => `${result.title} ${result.description} ${result.fullContent}`)
      .join(' ');
    const contextDomain = this.detectDomain(contextText, domainKeywords);

    // Calculate relevance
    const isRelevant = inputDomain === contextDomain || 
                      inputDomain === 'unknown' || 
                      contextDomain === 'unknown';

    // Calculate confidence based on keyword matches
    const inputKeywords = domainKeywords[inputDomain as keyof typeof domainKeywords] || [];
    const contextKeywords = domainKeywords[contextDomain as keyof typeof domainKeywords] || [];
    const inputMatches = this.countDomainMatches(userInput, inputKeywords);
    const contextMatches = this.countDomainMatches(contextText, contextKeywords);
    const confidence = Math.min(1.0, (inputMatches + contextMatches) / 10);

    return {
      isRelevant,
      inputDomain,
      contextDomain,
      confidence
    };
  }

  /**
   * Detect domain based on keyword matching
   */
  private detectDomain(text: string, domainKeywords: Record<string, string[]>): string {
    const lowerText = text.toLowerCase();
    let maxMatches = 0;
    let detectedDomain = 'unknown';

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      const matches = this.countDomainMatches(lowerText, keywords);
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedDomain = domain;
      }
    }

    // Require at least 2 keyword matches to confidently detect a domain
    return maxMatches >= 2 ? detectedDomain : 'unknown';
  }

  /**
   * Count domain keyword matches in text
   */
  private countDomainMatches(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    ).length;
  }
}
