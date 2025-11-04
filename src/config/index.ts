import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Model Provider
  modelProvider: (process.env.MODEL_PROVIDER || "groq").toLowerCase().trim(),
  temperature: Number(process.env.TEMPERATURE ?? 0.1),
  maxTokens: Number(process.env.MAX_TOKENS) || 4096,

  // Testleaf
  testleaf: {
    apiKey: process.env.TESTLEAF_API_KEY || "",
    model: process.env.TESTLEAF_MODEL || "gpt-4o-mini",
  },

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "",
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  // Anthropic
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
  },

  // Mistral
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || "",
    embeddingModel: process.env.MISTRAL_EMBEDDING_MODEL || "mistral-embed",
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || "",
    dbName: process.env.USER_STORY_DB_NAME || "RAG_DEMO",
    collection: process.env.USER_STORY_COLLECTION || "user_stories",
    vectorIndexName: process.env.USER_STORY_VECTOR_INDEX || "user_stories_vector_index",
  },

  // User Stories MongoDB (for backward compatibility)
  userStoryMongodb: {
    uri: process.env.MONGODB_URI || "",
    dbName: process.env.USER_STORY_DB_NAME || "RAG_DEMO",
    collection: process.env.USER_STORY_COLLECTION || "user_stories",
    vectorIndexName: process.env.USER_STORY_VECTOR_INDEX || "user_stories_vector_index",
  },

  // Embeddings
  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER || "mistral",
    model: process.env.EMBEDDING_MODEL || "mistral-embed",
    dimension: Number(process.env.EMBEDDING_DIMENSION) || 1024,
  },

  // Documents
  documents: {
    folder: process.env.DOCUMENTS_FOLDER || "./documents",
  },

  // User Story Documents
  userStoryDocuments: {
    folder: process.env.USER_STORY_DOCUMENTS_FOLDER || "./user_stories",
  },

  // Ingestion
  ingestion: {
    batchSize: Number(process.env.INGESTION_BATCH_SIZE) || 10,
    requireContactInfo: process.env.REQUIRE_CONTACT_INFO !== "false", // Default: true
  },

  // Hybrid Search Weights
  hybridSearch: {
    vectorWeight: Number(process.env.HYBRID_VECTOR_WEIGHT) || 0.7,
    keywordWeight: Number(process.env.HYBRID_KEYWORD_WEIGHT) || 0.3,
  },

  // LLM Re-ranking Configuration
  llmReranking: {
    enabled: process.env.LLM_RERANKING_ENABLED !== "false", // Default: true
    retrievalTopK: Number(process.env.LLM_RETRIEVAL_TOP_K) || 10, // Retrieve more for LLM to filter
  },

  // Server
  server: {
    url: process.env.SERVER_URL || "http://localhost:8787",
    port: Number(process.env.PORT) || 8787,
  },
} as const;

export type Config = typeof config;
