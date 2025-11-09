import path from "node:path";
import fs from "node:fs/promises";

/**
 * Get all supported user story files from a directory
 * Supports PDF, DOCX, TXT, MD, and CSV files
 */
export async function getUserStoryFiles(documentsDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(documentsDir);
    const userStoryFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === ".pdf" || ext === ".docx" || ext === ".txt" || ext === ".md" || ext === ".csv";
    });
    
    return userStoryFiles.map(file => path.join(documentsDir, file));
  } catch (error) {
    throw new Error(
      `Failed to read user story documents directory at ${documentsDir}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
