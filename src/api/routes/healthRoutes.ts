import { Router } from "express";
import { HealthController } from "../controllers/healthController.js";

const router = Router();

// Health check endpoint
router.get("/health", HealthController.getHealth);

export { router as healthRoutes };
