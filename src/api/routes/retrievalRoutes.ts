import { Router } from "express";
import { RetrievalController } from "../controllers/retrievalController.js";

const router = Router();

// User story retrieval endpoint
router.post("/user-stories", RetrievalController.retrieveUserStories);

export { router as retrievalRoutes };
