import { Router } from "express";
import { AdminController } from "../controllers/adminController.js";

/**
 * Admin routes for data management and viewing
 */
export const adminRoutes = Router();

// Data viewing routes
adminRoutes.get('/data', AdminController.getAllUserStories);
adminRoutes.get('/stats', AdminController.getDatabaseStats);

// Health check for admin functionality
adminRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "Admin functionality is operational",
    timestamp: new Date().toISOString()
  });
});
