import "dotenv/config";
import express from "express";
import { corsMiddleware, errorHandler, requestLogger } from "./api/middleware/index.js";
import { healthRoutes, ingestionRoutes, retrievalRoutes, adminRoutes } from "./api/routes/index.js";
import { RetrievalController } from "./api/controllers/index.js";
import { getModelInfo } from "./infrastructure/lib/models/index.js";

class QABotApplication {
  private app: express.Application;
  private port: number;
  private host: string;
  private serverUrl: string;

  constructor() {
    this.app = express();
    this.port = Number(process.env.PORT ?? 8787);
    this.host = process.env.HOST ?? "localhost";
    this.serverUrl = process.env.SERVER_URL ?? `http://${this.host}:${this.port}`;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup application middleware
   */
  private setupMiddleware() {
    // CORS middleware - Must be before other middleware
    this.app.use(corsMiddleware);
    
    // Request logging
    this.app.use(requestLogger);
    
    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    
    // Serve static files for testing
    this.app.use(express.static("./"));
  }

  /**
   * Setup application routes
   */
  private setupRoutes() {
    // Health check
    this.app.use("/", healthRoutes);
    
    // Ingestion endpoints
    this.app.use("/ingest", ingestionRoutes);
    
    // Retrieval endpoints
    this.app.use("/retrieve", retrievalRoutes);
    
    // Admin endpoints
    this.app.use("/admin", adminRoutes);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * Initialize services
   */
  private async initializeServices() {
    console.log("🔧 Initializing services...");
    
    // Initialize User Story Retrieval Service
    try {
      await RetrievalController.initializeService();
    } catch (error) {
      console.error("❌ Failed to initialize services:", error);
      throw error;
    }
  }

  /**
   * Start the application server
   */
  async start() {
    try {
      // Initialize services first
      await this.initializeServices();
      
      // Start the server
      this.app.listen(this.port, () => {
        const modelInfo = getModelInfo();
        
        console.log(`\n🚀 QA Bot API listening on ${this.serverUrl}`);
        console.log(`📊 Configuration:`);
        console.log(`  - Provider: ${modelInfo.provider}`);
        console.log(`  - Model: ${modelInfo.model}`);
        console.log(`  - Temperature: ${modelInfo.temperature}`);
        
        console.log(`\n🛠️  Services:`);
        console.log("✅ User Story Ingestion Service ready");
        console.log("✅ User Story Retrieval Service ready");
        
        console.log(`\n🌐 Endpoints:`);
        console.log(`  - Health: ${this.serverUrl}/health`);
        console.log(`  - Ingestion: ${this.serverUrl}/ingest/user-stories`);
        console.log(`  - Retrieval: ${this.serverUrl}/retrieve/user-stories`);
        
        console.log("\n🎉 Server ready!");
      });
    } catch (error) {
      console.error("❌ Failed to start application:", error);
      process.exit(1);
    }
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }
}

// Create and start the application
const app = new QABotApplication();
app.start();

export default app;
