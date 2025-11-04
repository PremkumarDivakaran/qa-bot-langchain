import { UserStoryVectorStore } from "../lib/vectorstore/userStoryVectorStore.js";
import { createChatModel } from "../lib/models/index.js";
import { config } from "../config/index.js";
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
   * Retrieve and standardize user stories
   */
  async retrieveUserStories(
    userInput: string, 
    relevantStoriesLimit: number = 5, 
    traceId: string
  ): Promise<UserStoryRetrievalResponse> {
    console.log(`[${traceId}] 🔍 Starting user story retrieval...`);
    console.log(`[${traceId}] User Input: "${userInput}"`);
    console.log(`[${traceId}] Relevant Stories Limit: ${relevantStoriesLimit}`);

    const startTime = Date.now();

    try {
      // Step 1: Perform vector search
      console.log(`[${traceId}] 📊 Performing vector search...`);
      const searchResults = await this.performVectorSearch(userInput, relevantStoriesLimit, traceId);
      console.log(`[${traceId}] Found ${searchResults.length} relevant user stories`);

      // Step 2: Format search results for prompt
      const vectorDbJson = this.formatSearchResultsForPrompt(searchResults);

      // Step 3: Generate standardized user story using LLM
      console.log(`[${traceId}] 🤖 Generating standardized user story...`);
      const llmResponse = await this.generateStandardizedUserStory(
        userInput, 
        vectorDbJson, 
        traceId
      );

      // Step 4: Parse LLM response to extract standardized user story and score
      const { createdUserStory, score } = this.parseLLMResponse(llmResponse, searchResults);

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

      console.log(`[${traceId}] ✅ Retrieval completed in ${duration}ms`);
      return response;

    } catch (error) {
      console.error(`[${traceId}] ❌ Error during retrieval:`, error);
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
      // Use the vector store's searchUserStories method
      const documents: Document[] = await this.vectorStore.searchUserStories(query, relevantStoriesLimit);
      
      return documents.map((doc: Document, index: number) => ({
        storyId: doc.metadata.storyId || `STORY-${index + 1}`,
        title: doc.metadata.title || doc.pageContent.substring(0, 100),
        description: doc.metadata.description || doc.pageContent,
        priority: doc.metadata.priority || "medium",
        category: doc.metadata.category || "General",
        fullContent: doc.pageContent,
        fileName: doc.metadata.fileName || "unknown",
        score: doc.metadata.score || 0.8 // Default score if not provided
      }));
    } catch (error) {
      console.error(`[${traceId}] Error in vector search:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Vector search failed: ${errorMessage}`);
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
2. Include 3 relevant existing user stories from the vector DB in the same format. **Do not modify their storyId, summary, or other fields.**
3. Provide a score (0–100) for the created user story based on business value, completeness, and adherence to the standard format.
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
  private parseLLMResponse(llmResponse: string, vectorDbResults?: UserStorySearchResult[]): { 
    createdUserStory: StandardizedUserStory, 
    score: number 
  } {
    // This is a simplified parser - in production, you might want more robust parsing
    const currentDate = new Date().toISOString();
    
    // Extract score (look for patterns like "Score: 85" or "85/100")
    const scoreMatch = llmResponse.match(/(?:score|rating):\s*(\d+)|(\d+)\/100|(\d+)\s*out\s*of\s*100/i);
    const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]) : 75;

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
}
