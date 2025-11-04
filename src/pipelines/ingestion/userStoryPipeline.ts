import path from "node:path";
import { config } from "../../config/index.js";
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
  console.log("🚀 Starting user story ingestion pipeline with vector embeddings\n");
  
  // Validate configuration
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
  
  console.log(`📊 Configuration:`);
  console.log(`  - Database: ${config.userStoryMongodb.dbName}.${config.userStoryMongodb.collection}`);
  console.log(`  - Embedding Provider: ${embeddingProvider}`);
  console.log(`  - Embedding Model: ${config.embeddings.model}`);
  console.log(`  - Dimension: ${config.embeddings.dimension}`);
  console.log();
  
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
    
    // Clear existing data if requested
    if (clearExisting) {
      console.log("🗑️  Clearing existing user stories...");
      await vectorStore.clearCollection();
      console.log();
    }
    
    // Get all user story files
    console.log(`📂 Reading documents from: ${config.userStoryDocuments.folder}`);
    const userStoryFiles = await getUserStoryFiles(config.userStoryDocuments.folder);
    
    if (userStoryFiles.length === 0) {
      console.log("⚠️  No PDF, DOCX, TXT, MD, or CSV files found in user stories folder");
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
    
    // Process each user story file with concurrent loading
    console.log("📝 Processing user stories...\n");
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
      
      console.log(`  Processing: ${fileName}...`);
      
      try {
        if (fileExt === '.csv') {
          // Handle CSV files
          const csvRows = await loadUserStoriesFromCSV(filePath);
          console.log(`    Found ${csvRows.length} user stories in CSV`);
          
          for (const [index, csvRow] of csvRows.entries()) {
            const extractedInfo = extractUserStoryInfoFromCSV(csvRow);
            
            // Check if meaningful content exists
            const hasTitle = !!extractedInfo.title;
            const hasDescription = extractedInfo.description.length >= 20;
            
            if (!hasTitle && !hasDescription) {
              console.log(`    ⚠️  SKIPPED row ${index + 1}: No meaningful title or description found`);
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
            
            console.log(`    ✓ Row ${index + 1} - ID: ${csvRow.storyId || 'N/A'}`);
            console.log(`      Title: ${userStoryData.title || "Not found"}`);
            console.log(`      Priority: ${userStoryData.priority || "Not found"}`);
            console.log(`      Category: ${userStoryData.category || "Not found"}`);
            
            if (validation.warnings.length > 0) {
              console.log(`      ⚠️  Warnings: ${validation.warnings.join(", ")}`);
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
          console.log(`    ⚠️  SKIPPED: Only CSV files are supported for user story ingestion`);
          skipped.push({
            fileName,
            reason: "Unsupported file format (only CSV files are supported)"
          });
          skippedCount++;
        }
        
        console.log();
      } catch (error) {
        console.error(`    ✗ Error processing ${fileName}:`, error instanceof Error ? error.message : String(error));
        console.log();
        errorCount++;
      }
    }
    
    // Add all user stories with embeddings to MongoDB using batch processing with deduplication
    let deduplicationResult = { added: 0, removed: 0, skipped: 0 };
    
    if (userStoriesData.length > 0) {
      console.log(`🔄 Generating embeddings and storing ${userStoriesData.length} user story(ies) with deduplication...`);
      
      // Use batch size from config - increase for parallel processing
      const batchSize = Math.max(config.ingestion.batchSize, 5); // Minimum batch size of 5 for efficiency
      console.log(`   Batch size: ${batchSize}`);
      
      deduplicationResult = await vectorStore.addUserStoriesWithDeduplication(userStoriesData, batchSize);
      
      console.log(`📊 Deduplication Summary:`);
      console.log(`   - Added: ${deduplicationResult.added} user stories`);
      console.log(`   - Replaced duplicates: ${deduplicationResult.removed} user stories`);
      console.log(`   - Skipped: ${deduplicationResult.skipped} user stories`);
      console.log();
    } else {
      console.log("⚠️  No user stories to ingest (all files skipped or failed)\n");
    }
    
    // Summary
    console.log("=" .repeat(60));
    console.log("✅ USER STORY INGESTION COMPLETE");
    console.log("=" .repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`  - Total files: ${userStoryFiles.length}`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Embeddings generated: ${userStoriesData.length}`);
    console.log(`  - Warnings: ${warnings.length}`);
    
    if (skipped.length > 0) {
      console.log(`\n⏭️  Skipped files (no meaningful content):`);
      skipped.forEach(({ fileName, reason }) => {
        console.log(`  - ${fileName}: ${reason}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  Files with warnings:`);
      warnings.forEach(({ fileName, warnings: fileWarnings }) => {
        console.log(`  - ${fileName}:`);
        fileWarnings.forEach(w => console.log(`    • ${w}`));
      });
    }
    console.log();

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
