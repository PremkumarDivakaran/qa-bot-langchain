import path from "node:path";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { UserStoryVectorStore } from "../../lib/vectorstore/index.js";
import { 
  getUserStoryFiles, 
  extractUserStoryInfoFromCSV,
  validateUserStoryMetadata, 
  loadUserStoriesFromCSV,
  type UserStoryCSVRow 
} from "../../utils/index.js";

/**
 * Main user story ingestion pipeline with vector embeddings using Mistral
 */
export async function ingestUserStories(clearExisting: boolean = false): Promise<{
  totalFiles: number;
  successful: number;
  skipped: number;
  errors: number;
  userStoriesProcessed: number;
  added: number;
  duplicatesReplaced: number;
  duplicatesSkipped: number;
  warnings: number;
}> {
  const traceId = `ingest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.status(traceId, "=== USER STORY INGESTION PIPELINE STARTED ===", "🚀");
  
  // Validate configuration
  logger.detailed(traceId, "Validating configuration", "🔧");
  if (!config.userStoryMongodb.uri) {
    throw new Error("MONGODB_URI is not set in .env file");
  }
  
  const embeddingProvider = config.embeddings.provider;
  const apiKey = embeddingProvider === "mistral" 
    ? config.mistral.apiKey 
    : config.openai.apiKey;
  
  if (!apiKey) {
    throw new Error(`${embeddingProvider.toUpperCase()}_API_KEY is required for generating embeddings`);
  }
  
  // Always show configuration (overview logging)
  console.log(`📊 Configuration:`);
  console.log(`  - Database: ${config.userStoryMongodb.dbName}.${config.userStoryMongodb.collection}`);
  console.log(`  - Embedding Provider: ${embeddingProvider}`);
  console.log(`  - Embedding Model: ${config.embeddings.model}`);
  console.log(`  - Dimension: ${config.embeddings.dimension}`);
  console.log();
  
  // Detailed configuration logging 
  logger.detailed(traceId, `📊 Detailed Configuration:`);
  logger.detailed(traceId, `  - MongoDB URI: ${config.userStoryMongodb.uri}`);
  logger.detailed(traceId, `  - Database: ${config.userStoryMongodb.dbName}.${config.userStoryMongodb.collection}`);
  logger.detailed(traceId, `  - Vector Index: ${config.userStoryMongodb.vectorIndexName}`);
  logger.detailed(traceId, `  - Embedding Provider: ${embeddingProvider}`);
  logger.detailed(traceId, `  - Embedding Model: ${config.embeddings.model}`);
  logger.detailed(traceId, `  - Dimension: ${config.embeddings.dimension}`);
  logger.detailed(traceId, `  - Batch Size: ${config.ingestion.batchSize}`);
  
  // Initialize LangChain MongoDB Vector Store
  const vectorStore = new UserStoryVectorStore({
    mongoUri: config.userStoryMongodb.uri,
    dbName: config.userStoryMongodb.dbName,
    collectionName: config.userStoryMongodb.collection,
    indexName: config.userStoryMongodb.vectorIndexName,
    embeddingProvider: embeddingProvider,
    embeddingModel: config.embeddings.model,
    apiKey: apiKey
  });
  
  try {
    // Connect to MongoDB
    await vectorStore.initialize();
    
    // Clear existing data if requested (overview logging)
    if (clearExisting) {
      console.log("🗑️  Clearing existing user stories...");
      logger.detailed(traceId, "Clearing existing user stories from database", "🗑️");
      await vectorStore.clearCollection();
      logger.detailed(traceId, "Database cleared successfully");
      console.log();
    }
    
    // Get all user story files (overview logging)
    console.log(`📂 Reading documents from: ${config.userStoryDocuments.folder}`);
    logger.detailed(traceId, `Scanning directory: ${config.userStoryDocuments.folder}`, "📂");
    const userStoryFiles = await getUserStoryFiles(config.userStoryDocuments.folder);
    
    if (userStoryFiles.length === 0) {
      console.log("⚠️  No PDF, DOCX, TXT, MD, or CSV files found in user stories folder");
      logger.detailed(traceId, "No supported files found for ingestion", "⚠️");
      return {
        totalFiles: 0,
        successful: 0,
        skipped: 0,
        errors: 0,
        userStoriesProcessed: 0,
        added: 0,
        duplicatesReplaced: 0,
        duplicatesSkipped: 0,
        warnings: 0
      };
    }
    
    console.log(`✓ Found ${userStoryFiles.length} user story file(s)\n`);
    logger.detailed(traceId, `Found files: ${userStoryFiles.map(f => path.basename(f)).join(', ')}`, "📋");
    
    // Process each user story file with concurrent loading (overview logging)
    console.log("📝 Processing user stories...\n");
    logger.detailed(traceId, "Starting file processing phase", "📝");
    const userStoriesData: Array<{
      title: string | null;
      description: string;
      priority: string | null;
      category: string | null;
      fullContent: string;
      fileName: string;
    }> = [];
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const warnings: Array<{ fileName: string; warnings: string[] }> = [];
    const skipped: Array<{ fileName: string; reason: string }> = [];
    
    // Process user story files
    for (const filePath of userStoryFiles) {
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath).toLowerCase();
      
      logger.status(traceId, `Processing file: ${fileName}`, "📄");
      
      try {
        if (fileExt === '.csv') {
          // Handle CSV files
          const csvRows = await loadUserStoriesFromCSV(filePath);
          logger.detailed(traceId, `Found ${csvRows.length} user stories in CSV: ${fileName}`);
          
          for (const [index, csvRow] of csvRows.entries()) {
            logger.detailed(traceId, `Processing row ${index + 1}/${csvRows.length} in ${fileName}`);
            const extractedInfo = extractUserStoryInfoFromCSV(csvRow);
            
            // Log detailed payload when detailed logging is enabled
            logger.detailed(traceId, `Row ${index + 1} payload: ${JSON.stringify(csvRow, null, 2)}`);
            logger.detailed(traceId, `Extracted info: Title="${extractedInfo.title}", Description length=${extractedInfo.description.length}`);
            
            // Check if meaningful content exists
            const hasTitle = !!extractedInfo.title;
            const hasDescription = extractedInfo.description.length >= 20;
            
            if (!hasTitle && !hasDescription) {
              logger.detailed(traceId, `⚠️  SKIPPED row ${index + 1}: No meaningful title or description found`);
              skipped.push({
                fileName: `${fileName}:row${index + 1}`,
                reason: "No meaningful content found"
              });
              skippedCount++;
              continue;
            }
            
            // Validate metadata
            const validation = validateUserStoryMetadata(extractedInfo);
            
            // Create user story data object
            const userStoryData = {
              storyId: csvRow.storyId,
              title: extractedInfo.title,
              description: extractedInfo.description,
              priority: extractedInfo.priority,
              category: extractedInfo.category,
              fullContent: extractedInfo.fullContent,
              fileName: `${fileName}:${csvRow.storyId || `row${index + 1}`}`
            };
            
            // Detailed logging: Show individual row details when detailed logging is enabled
            logger.detailed(traceId, `    ✓ Row ${index + 1} - ID: ${csvRow.storyId || 'N/A'}`);
            logger.detailed(traceId, `      Title: ${userStoryData.title || "Not found"}`);
            logger.detailed(traceId, `      Priority: ${userStoryData.priority || "Not found"}`);
            logger.detailed(traceId, `      Category: ${userStoryData.category || "Not found"}`);
            
            // Also show rows in console when detailed logging is enabled
            if (logger.isDetailedLoggingEnabled()) {
              console.log(`    ✓ Row ${index + 1} - ID: ${csvRow.storyId || 'N/A'}`);
              console.log(`      Title: ${userStoryData.title || "Not found"}`);
              console.log(`      Priority: ${userStoryData.priority || "Not found"}`);
              console.log(`      Category: ${userStoryData.category || "Not found"}`);
            }
            
            if (validation.warnings.length > 0) {
              logger.detailed(traceId, `      ⚠️  Warnings: ${validation.warnings.join(", ")}`);
              if (logger.isDetailedLoggingEnabled()) {
                console.log(`      ⚠️  Warnings: ${validation.warnings.join(", ")}`);
              }
              warnings.push({
                fileName: `${fileName}:row${index + 1}`,
                warnings: validation.warnings
              });
            }
            
            userStoriesData.push(userStoryData);
            successCount++;
          }
        } else {
          // Only CSV files are supported for user story ingestion
          logger.detailed(traceId, `SKIPPED: Only CSV files are supported for user story ingestion`, "⚠️");
          if (logger.isDetailedLoggingEnabled()) {
            console.log(`    ⚠️  SKIPPED: Only CSV files are supported for user story ingestion`);
          }
          skipped.push({
            fileName,
            reason: "Unsupported file format (only CSV files are supported)"
          });
          skippedCount++;
        }
        
        if (logger.isDetailedLoggingEnabled()) {
          console.log();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(traceId, `Error processing ${fileName}`, error, "✗");
        if (logger.isDetailedLoggingEnabled()) {
          console.error(`    ✗ Error processing ${fileName}:`, errorMsg);
          console.log();
        }
        errorCount++;
      }
    }
    
    // Add all user stories with embeddings to MongoDB using batch processing with deduplication
    let deduplicationResult = { added: 0, removed: 0, skipped: 0 };
    
    if (userStoriesData.length > 0) {
      logger.status(traceId, `Generating embeddings and storing ${userStoriesData.length} user story(ies)`, "🔄");
      
      // Use batch size from config - increase for parallel processing
      const batchSize = Math.max(config.ingestion.batchSize, 5); // Minimum batch size of 5 for efficiency
      logger.detailed(traceId, `Batch size: ${batchSize}`);
      
      deduplicationResult = await vectorStore.addUserStoriesWithDeduplication(userStoriesData, batchSize);
      
      logger.detailed(traceId, `📊 Deduplication Summary:`);
      logger.detailed(traceId, `   - Added: ${deduplicationResult.added} user stories`);
      logger.detailed(traceId, `   - Replaced duplicates: ${deduplicationResult.removed} user stories`);
      logger.detailed(traceId, `   - Skipped: ${deduplicationResult.skipped} user stories`);
    } else {
      logger.status(traceId, "No user stories to ingest (all files skipped or failed)", "⚠️");
    }
    
    // Summary
    logger.status(traceId, "=== USER STORY INGESTION COMPLETE ===", "✅");
    logger.detailed(traceId, `📊 Statistics:`);
    logger.detailed(traceId, `  - Total files: ${userStoryFiles.length}`);
    logger.detailed(traceId, `  - Successful: ${successCount}`);
    logger.detailed(traceId, `  - Skipped: ${skippedCount}`);
    logger.detailed(traceId, `  - Errors: ${errorCount}`);
    logger.detailed(traceId, `  - Embeddings generated: ${userStoriesData.length}`);
    
    // Always show warnings count in overview
    console.log(`  - Warnings: ${warnings.length}`);
    
    // Detailed logging: Show complete statistics
    if (logger.isDetailedLoggingEnabled()) {
      console.log(`📊 Detailed Statistics:`);
      console.log(`  - Total files: ${userStoryFiles.length}`);
      console.log(`  - Successful: ${successCount}`);
      console.log(`  - Skipped: ${skippedCount}`);
      console.log(`  - Errors: ${errorCount}`);
      console.log(`  - Embeddings generated: ${userStoriesData.length}`);
      console.log(`  - Warnings: ${warnings.length}`);
    }
    
    if (skipped.length > 0) {
      logger.detailed(traceId, `⏭️  Skipped files (no meaningful content):`);
      if (logger.isDetailedLoggingEnabled()) {
        console.log(`\n⏭️  Skipped files (no meaningful content):`);
        skipped.forEach(({ fileName, reason }) => {
          console.log(`  - ${fileName}: ${reason}`);
        });
      }
      skipped.forEach(({ fileName, reason }) => {
        logger.detailed(traceId, `  - ${fileName}: ${reason}`);
      });
    }
    
    if (warnings.length > 0) {
      logger.detailed(traceId, `⚠️  Files with warnings:`);
      if (logger.isDetailedLoggingEnabled()) {
        console.log(`\n⚠️  Files with warnings:`);
        warnings.forEach(({ fileName, warnings: fileWarnings }) => {
          console.log(`  - ${fileName}:`);
          fileWarnings.forEach(w => console.log(`    • ${w}`));
        });
      }
      warnings.forEach(({ fileName, warnings: fileWarnings }) => {
        logger.detailed(traceId, `  - ${fileName}:`);
        fileWarnings.forEach(w => logger.detailed(traceId, `    • ${w}`));
      });
    }
    
    if (logger.isDetailedLoggingEnabled()) {
      console.log();
    }

    // Return statistics
    return {
      totalFiles: userStoryFiles.length,
      successful: successCount,
      skipped: skippedCount,
      errors: errorCount,
      userStoriesProcessed: userStoriesData.length,
      added: deduplicationResult.added,
      duplicatesReplaced: deduplicationResult.removed,
      duplicatesSkipped: deduplicationResult.skipped,
      warnings: warnings.length
    };

  } catch (error) {
    console.error("❌ User story ingestion failed:", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    // Close MongoDB connection
    await vectorStore.close();
  }
}

/**
 * Run the user story ingestion pipeline if this script is executed directly
 * Usage: tsx src/pipelines/ingestion/userStoryPipeline.ts [--clear]
 */
async function main() {
  const clearExisting = process.argv.includes("--clear");
  
  try {
    await ingestUserStories(clearExisting);
    console.log("Done!");
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
