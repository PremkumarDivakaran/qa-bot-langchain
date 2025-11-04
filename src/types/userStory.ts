export interface UserStoryData {
  title: string | null;
  description: string;
  priority: string | null;
  category: string | null;
  fullContent: string;
  fileName: string;
  processedAt: Date;
  embedding?: number[]; // Vector embedding for semantic search
}

export interface UserStoryExtractionResult {
  title: string | null;
  description: string;
  priority: string | null;
  category: string | null;
  fullContent: string;
}

export interface UserStoryEmbeddingConfig {
  provider: string;
  model: string;
  apiKey: string;
}
