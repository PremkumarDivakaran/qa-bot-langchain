import fs from "node:fs/promises";
import path from "node:path";

/**
 * CSV parser utility for user stories
 */
export interface UserStoryCSVRow {
  summary: string;
  projectName: string;
  text: string;
  acceptanceCriteria: string;
  storyId: string;
  parentSummary: string;
  statusCategory: string;
  priority: string;
  risk: string;
  createdDate: string;
  lastModifiedDate: string;
}

/**
 * Parse CSV content into user story rows
 */
export function parseCSV(csvContent: string): UserStoryCSVRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  const headers = parseCSVLine(lines[0]);
  const rows: UserStoryCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`Skipping row ${i + 1}: column count mismatch`);
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row as UserStoryCSVRow);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * Load and parse CSV file
 */
export async function loadUserStoriesFromCSV(filePath: string): Promise<UserStoryCSVRow[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseCSV(content);
  } catch (error) {
    throw new Error(
      `Failed to load CSV file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all CSV files from a directory
 */
export async function getCSVFiles(documentsDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(documentsDir);
    const csvFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === ".csv";
    });
    
    return csvFiles.map(file => path.join(documentsDir, file));
  } catch (error) {
    throw new Error(
      `Failed to read CSV directory at ${documentsDir}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert CSV row to user story text content
 */
export function csvRowToUserStoryContent(row: UserStoryCSVRow): string {
  const parts: string[] = [];
  
  // Title/Summary
  if (row.summary) {
    parts.push(`Title: ${row.summary}`);
  }
  
  // Story ID
  if (row.storyId) {
    parts.push(`Story ID: ${row.storyId}`);
  }
  
  // Priority
  if (row.priority) {
    parts.push(`Priority: ${row.priority}`);
  }
  
  // Risk level
  if (row.risk) {
    parts.push(`Risk: ${row.risk}`);
  }
  
  // Status
  if (row.statusCategory) {
    parts.push(`Status: ${row.statusCategory}`);
  }
  
  // Project/Category
  if (row.projectName) {
    parts.push(`Project: ${row.projectName}`);
  }
  
  if (row.parentSummary) {
    parts.push(`Category: ${row.parentSummary}`);
  }
  
  // Main user story text
  if (row.text) {
    parts.push(`\nUser Story:\n${row.text}`);
  }
  
  // Acceptance criteria
  if (row.acceptanceCriteria) {
    parts.push(`\nAcceptance Criteria:\n${row.acceptanceCriteria}`);
  }
  
  // Dates
  if (row.createdDate) {
    parts.push(`\nCreated: ${row.createdDate}`);
  }
  
  if (row.lastModifiedDate) {
    parts.push(`Last Modified: ${row.lastModifiedDate}`);
  }
  
  return parts.join('\n');
}
