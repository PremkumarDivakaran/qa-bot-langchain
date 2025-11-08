import "dotenv/config";
import express from "express";
import multer from "multer";
import { MongoClient } from "mongodb";
import { ZodError } from "zod";
import { createChatModel, getModelInfo } from "./lib/models/index.js";
import { 
  ErrorResponse,
  UserStoryRetrievalRequestSchema,
  UserStoryRetrievalRequest,
  UserStoryRetrievalResponse,
  UserStoryRetrievalErrorResponse
} from "./types/index.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { 
  runUserStoryIngestion, 
  saveUploadedFile, 
  validateFileType,
  type IngestionResult 
} from "./utils/ingestionRunner.js";
import { UserStoryRetrievalService } from "./services/userStoryRetrievalService.js";

const app = express();

// CORS middleware - Must be before other middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.json({ limit: "10mb" }));

// Serve static files for testing
app.use(express.static("./"));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (validateFileType(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and TXT files are allowed.'));
    }
  },
});

let mongoClient: MongoClient | null = null;

// Initialize User Story Retrieval Service
let retrievalService: UserStoryRetrievalService | null = null;

// Health check endpoint
app.get("/health", (req, res) => {
  const modelInfo = getModelInfo();
  res.json({
    status: "healthy",
    service: "QA Bot API",
    timestamp: new Date().toISOString(),
    model: modelInfo,
    mongodb: "connected",
    cors: "enabled"
  });
});

// User story ingestion endpoint
app.post("/ingest/user-stories", upload.single("file"), async (req, res) => {
  const traceId = `ingest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    logger.detailed(traceId, "=== INGESTION REQUEST RECEIVED ===");
    logger.detailed(traceId, `Timestamp: ${new Date().toISOString()}`);

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please provide a CSV or TXT file.",
        error: "FILE_MISSING"
      });
    }

    logger.detailed(traceId, "File received:");
    logger.detailed(traceId, `  - Original name: ${req.file.originalname}`);
    logger.detailed(traceId, `  - Size: ${req.file.size} bytes`);
    logger.detailed(traceId, `  - MIME type: ${req.file.mimetype}`);

    // Validate file type
    if (!validateFileType(req.file.mimetype, req.file.originalname)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only CSV and TXT files are allowed.",
        error: "INVALID_FILE_TYPE"
      });
    }

    // Save uploaded file
    const fileName = await saveUploadedFile(req.file.buffer, req.file.originalname);
    logger.detailed(traceId, `File saved as: ${fileName}`);

    // Parse query parameters and form data
    // FormData sends everything as strings, so we need to check for string values
    const clearFromQuery = req.query.clear === "true";
    const clearFromBody = req.body.clear === true || req.body.clear === "true";
    const clearExistingFromBody = req.body.clearExisting === true || 
                                  req.body.clearExisting === "true" ||
                                  req.body.clearExisting === "on"; // HTML form checkbox value
    
    const clear = clearFromQuery || clearFromBody || clearExistingFromBody;
    
    logger.detailed(traceId, "Starting ingestion...");
    logger.detailed(traceId, `  - Clear existing: ${clear}`);

    // Run ingestion
    const result: IngestionResult = await runUserStoryIngestion({
      clear,
      fileName
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.status(traceId, `Ingestion completed successfully in ${duration}ms`);
      
      // Use actual ingestion statistics
      const ingestionStats = result.ingestionStats;
      
      res.json({
        success: true,
        message: result.message,
        processed: ingestionStats?.userStoriesProcessed || 0,
        added: ingestionStats?.added || 0,
        duplicates: (ingestionStats?.duplicatesReplaced || 0) + (ingestionStats?.duplicatesSkipped || 0),
        processingTime: `${Math.round(duration / 1000)}s`,
        duration,
        stats: result.stats,
        metadata: {
          traceId,
          fileName: req.file.originalname,
          savedAs: fileName,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error(`[${traceId}] Ingestion failed:`, result.error);
      
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        duration,
        stats: result.stats,
        metadata: {
          traceId,
          fileName: req.file.originalname,
          savedAs: fileName,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`\n[${traceId}] === INGESTION ERROR ===`);
    console.error(`Error:`, errorMessage);
    console.error(`Duration: ${duration}ms`);

    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
        error: "FILE_TOO_LARGE",
        duration,
        metadata: { traceId }
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during ingestion",
      error: errorMessage,
      duration,
      metadata: { traceId }
    });
  }
});

// User Story Retrieval endpoint with vector search
app.post("/retrieve/user-stories", async (req, res) => {
  const traceId = `retrieve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    logger.detailed(traceId, `=== USER STORY RETRIEVAL REQUEST ===`);
    logger.detailed(traceId, `Timestamp: ${new Date().toISOString()}`);
    logger.detailed(traceId, `Request Body: ${JSON.stringify(req.body, null, 2)}`);

    // Validate request
    const parsed = UserStoryRetrievalRequestSchema.parse(req.body as UserStoryRetrievalRequest);
    
    logger.detailed(traceId, `Request validated`);
    logger.detailed(traceId, `User Input: "${parsed.userInput}"`);
    logger.detailed(traceId, `Relevant Stories Limit: ${parsed.relevantStoriesLimit}`);
    logger.detailed(traceId, `Search Mode: ${parsed.searchMode}`);
    logger.detailed(traceId, `Vector Weight: ${parsed.vectorWeight}`);
    logger.detailed(traceId, `BM25 Weight: ${parsed.bm25Weight}`);

    // Check if retrieval service is initialized
    if (!retrievalService) {
      throw new Error("User Story Retrieval Service not initialized. Please wait for server startup to complete.");
    }

    // Perform retrieval and standardization  
    const result: UserStoryRetrievalResponse = await (retrievalService as UserStoryRetrievalService).retrieveUserStories(
      parsed.userInput,
      parsed.relevantStoriesLimit || 5,
      traceId,
      parsed.searchMode || "hybrid",
      parsed.vectorWeight || 0.5,
      parsed.bm25Weight || 0.5
    );

    const duration = Date.now() - startTime;
    result.duration = duration;

    logger.status(traceId, `Retrieval completed in ${duration}ms`);
    logger.detailed(traceId, `Created user story ID: ${result.createdUserStory.storyId}`);
    logger.detailed(traceId, `Found ${result.relevantUserStories.length} relevant stories`);
    logger.detailed(traceId, `Generated score: ${result.score}/100`);

    logger.detailed(traceId, `📤 Sending response to client`);
    logger.detailed(traceId, `====================================`);

    res.json(result);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    
    // Handle different types of errors with appropriate status codes
    let statusCode = 500; // Default to internal server error
    let errorMessage = err.message ?? String(err);
    
    if (err instanceof ZodError) {
      // Validation error - return 400 Bad Request
      statusCode = 400;
      errorMessage = err.errors.map(e => e.message).join('; ');
      
      console.error(`\n[${traceId}] === VALIDATION ERROR ===`);
      console.error(`Validation errors:`, err.errors);
      console.error(`Duration: ${duration}ms`);
      console.error(`====================================\n`);
    } else if (errorMessage.includes("searchMode") || errorMessage.includes("Weight")) {
      // Custom validation errors from our refine method - return 400 Bad Request
      statusCode = 400;
      
      console.error(`\n[${traceId}] === PARAMETER VALIDATION ERROR ===`);
      console.error(`Error:`, errorMessage);
      console.error(`Duration: ${duration}ms`);
      console.error(`====================================\n`);
    } else if (errorMessage.includes("not initialized")) {
      // Service initialization error - return 503 Service Unavailable
      statusCode = 503;
      
      console.error(`\n[${traceId}] === SERVICE UNAVAILABLE ERROR ===`);
      console.error(`Error:`, errorMessage);
      console.error(`Duration: ${duration}ms`);
      console.error(`====================================\n`);
    } else {
      // General server error - return 500 Internal Server Error
      console.error(`\n[${traceId}] === RETRIEVAL ERROR ===`);
      console.error(`Error:`, errorMessage);
      console.error(`Duration: ${duration}ms`);
      console.error(`Stack:`, err.stack);
      console.error(`====================================\n`);
    }

    const errorResponse: UserStoryRetrievalErrorResponse = {
      error: errorMessage,
      details: err.stack,
      timestamp: new Date().toISOString(),
      traceId
    };

    res.status(statusCode).json(errorResponse);
  }
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "localhost";
const serverUrl = process.env.SERVER_URL ?? `http://${host}:${port}`;



app.listen(port, async () => {
  const modelInfo = getModelInfo();
  console.log(`QA Bot API listening on ${serverUrl}`);
  console.log(`Provider: ${modelInfo.provider}`);
  console.log(`Model: ${modelInfo.model}`);
  console.log(`Temperature: ${modelInfo.temperature}`);
  
  // Verify Ingestion Capabilities
  console.log("✅ User Story Ingestion Service ready");
  
  // Initialize User Story Retrieval Service
  try {
    retrievalService = new UserStoryRetrievalService();
    await retrievalService.initialize();
    console.log("✅ User Story Retrieval Service ready");
  } catch (error) {
    console.error("❌ Failed to initialize User Story Retrieval Service:", error);
  }
  
  console.log("Server ready!");
});
