import { promises as fs } from "fs";
import path from "path";
import { ingestUserStories } from "../pipelines/userStoryPipeline.js";
import { config } from "../../../shared/config/index.js";

export interface IngestionResult {
  success: boolean;
  message: string;
  stats?: {
    totalFiles: number;
    successful: number;
    errors: number;
    duration: number;
    embeddingsGenerated: number;
  };
  ingestionStats?: {
    totalFiles: number;
    successful: number;
    skipped: number;
    errors: number;
    userStoriesProcessed: number;
    added: number;
    duplicatesReplaced: number;
    duplicatesSkipped: number;
    warnings: number;
  };
  error?: string;
}

export interface IngestionOptions {
  clear?: boolean;
  fileName?: string;
}

/**
 * Run user story ingestion programmatically
 */
export async function runUserStoryIngestion(
  options: IngestionOptions = {}
): Promise<IngestionResult> {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting user story ingestion pipeline with vector embeddings");
    console.log("\n📊 Configuration:");
    console.log(`  - Database: ${config.userStoryMongodb.dbName}.${config.userStoryMongodb.collection}`);
    console.log(`  - Embedding Provider: ${config.embeddings.provider}`);
    console.log(`  - Embedding Model: ${config.embeddings.model}`);
    console.log(`  - Dimension: ${config.embeddings.dimension}`);

    // Run ingestion with clear option
    const ingestionStats = await ingestUserStories(options.clear || false);

    const totalDuration = Date.now() - startTime;

    // Use actual statistics from ingestion
    const stats = {
      totalFiles: ingestionStats.processedFiles,
      successful: ingestionStats.processedFiles,
      errors: ingestionStats.errors.length,
      duration: totalDuration,
      embeddingsGenerated: ingestionStats.totalStories
    };

    // Map to expected ingestionStats format for the controller
    const mappedIngestionStats = {
      totalFiles: ingestionStats.processedFiles,
      successful: ingestionStats.processedFiles,
      skipped: 0,
      errors: ingestionStats.errors.length,
      userStoriesProcessed: ingestionStats.totalStories,
      added: ingestionStats.totalStories,
      duplicatesReplaced: 0,
      duplicatesSkipped: 0,
      warnings: 0
    };

    return {
      success: ingestionStats.success,
      message: ingestionStats.success 
        ? `Successfully processed ${ingestionStats.processedFiles} files with ${ingestionStats.totalStories} user stories`
        : `Processing failed with ${ingestionStats.errors.length} errors`,
      stats,
      ingestionStats: mappedIngestionStats
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("\n❌ INGESTION FAILED");
    console.error("Error:", errorMessage);
    console.error(`Duration: ${duration}ms`);

    return {
      success: false,
      message: "User story ingestion failed",
      error: errorMessage,
      stats: {
        totalFiles: 0,
        successful: 0,
        errors: 1,
        duration,
        embeddingsGenerated: 0
      }
    };
  }
}

/**
 * Save uploaded file to user_stories directory
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  // Ensure user_stories directory exists
  const userStoriesDir = "./user_stories";
  try {
    await fs.access(userStoriesDir);
  } catch {
    await fs.mkdir(userStoriesDir, { recursive: true });
  }

  // Use original filename without timestamp to avoid duplicates
  const safeFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = path.join(userStoriesDir, safeFileName);

  // Save file (overwrite if exists)
  await fs.writeFile(filePath, buffer);
  
  console.log(`📁 File saved: ${safeFileName}`);
  return safeFileName;
}

/**
 * Validate file type for user story ingestion
 */
export function validateFileType(mimetype: string, filename: string): boolean {
  const allowedTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel'
  ];
  
  const allowedExtensions = ['.csv', '.txt'];
  const hasValidMimetype = allowedTypes.includes(mimetype);
  const hasValidExtension = allowedExtensions.some(ext => 
    filename.toLowerCase().endsWith(ext)
  );
  
  return hasValidMimetype || hasValidExtension;
}
