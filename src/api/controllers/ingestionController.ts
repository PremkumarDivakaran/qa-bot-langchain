import { Request, Response } from "express";
import { logger } from "../../shared/utils/logger.js";
import { 
  runUserStoryIngestion, 
  saveUploadedFile, 
  validateFileType,
  type IngestionResult 
} from "../../core/ingestion/utils/ingestionRunner.js";

export class IngestionController {
  /**
   * Handle user story file ingestion
   */
  static async ingestUserStories(req: Request, res: Response) {
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
      const clearFromQuery = req.query.clear === "true";
      const clearFromBody = req.body.clear === true || req.body.clear === "true";
      const clearExistingFromBody = req.body.clearExisting === true || 
                                    req.body.clearExisting === "true" ||
                                    req.body.clearExisting === "on";
      
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
  }
}
