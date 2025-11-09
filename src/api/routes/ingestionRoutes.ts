import { Router } from "express";
import multer from "multer";
import { IngestionController } from "../controllers/ingestionController.js";

// File validation utility
const validateFileType = (mimeType: string, fileName: string): boolean => {
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/octet-stream' // Sometimes CSV files are detected as this
  ];
  
  const allowedExtensions = ['.csv', '.txt'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  return allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(fileExtension);
};

const router = Router();

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

// User story ingestion endpoint
router.post("/user-stories", upload.single("file"), IngestionController.ingestUserStories);

export { router as ingestionRoutes };
