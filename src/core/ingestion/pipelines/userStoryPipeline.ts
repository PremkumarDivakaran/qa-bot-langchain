import { logger } from "../../../shared/utils/logger.js";
import { UserStoryIngestionService } from "../services/userStoryIngestionService.js";

/**
 * Ingest user stories from CSV files into the vector store
 */
export async function ingestUserStories(clearExisting: boolean = false): Promise<{
  success: boolean;
  processedFiles: number;
  totalStories: number;
  errors: string[];
}> {
  const traceId = `ingestion_${Date.now()}`;
  logger.status(traceId, "=== USER STORY INGESTION STARTED ===", "🚀");
  
  let processedFiles = 0;
  let totalStories = 0;
  const errors: string[] = [];

  try {
    // Initialize ingestion service
    const ingestionService = new UserStoryIngestionService();
    await ingestionService.initialize();

    // Clear existing data if requested
    if (clearExisting) {
      await ingestionService.clearExistingData(traceId);
    }

    // Get CSV files to process
    const csvFiles = await ingestionService.getFilesToProcess();
    logger.status(traceId, `Found ${csvFiles.length} CSV files to process`, "📁");

    // Process each CSV file using the service
    for (const filePath of csvFiles) {
      const result = await ingestionService.processFile(filePath, traceId);
      
      if (result.success) {
        processedFiles++;
        totalStories += result.storiesProcessed;
      } else {
        errors.push(result.error || `Unknown error processing ${result.fileName}`);
      }
    }

    // Final summary
    logger.status(traceId, `=== INGESTION COMPLETED ===`, "🎉");
    logger.status(traceId, `Files processed: ${processedFiles}/${csvFiles.length}`, "📊");
    logger.status(traceId, `Total stories ingested: ${totalStories}`, "📊");
    
    if (errors.length > 0) {
      logger.warn(traceId, `Errors encountered: ${errors.length}`, "⚠️");
    }

    return {
      success: errors.length === 0,
      processedFiles,
      totalStories,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(traceId, "Ingestion failed", error, "❌");
    
    return {
      success: false,
      processedFiles,
      totalStories,
      errors: [errorMsg, ...errors]
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 Starting User Story Ingestion Pipeline");
  
  try {
    const result = await ingestUserStories(true); // Clear existing data
    
    if (result.success) {
      console.log("✅ Ingestion completed successfully");
      console.log(`📊 Processed ${result.processedFiles} files with ${result.totalStories} user stories`);
    } else {
      console.error("❌ Ingestion completed with errors:");
      result.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1]?.includes("userStoryPipeline")) {
  main();
}
