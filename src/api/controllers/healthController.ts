import { Request, Response } from "express";
import { getModelInfo } from "../../infrastructure/lib/models/index.js";

export class HealthController {
  /**
   * Health check endpoint
   */
  static getHealth(req: Request, res: Response) {
    const modelInfo = getModelInfo();
    res.json({
      status: "healthy",
      service: "QA Bot API",
      timestamp: new Date().toISOString(),
      model: modelInfo,
      mongodb: "connected",
      cors: "enabled"
    });
  }
}
