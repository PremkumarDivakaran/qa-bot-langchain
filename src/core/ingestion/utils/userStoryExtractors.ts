import { UserStoryExtractionResult } from "../../../shared/types/userStory.js";
import { UserStoryCSVRow } from "./csvLoader.js";

/**
 * Extract user story information from CSV row data
 */
export function extractUserStoryInfoFromCSV(csvRow: UserStoryCSVRow): UserStoryExtractionResult {
  // Use summary as title, fallback to extracting from text
  let title = csvRow.summary || null;
  
  // Map CSV priority to standardized format
  let priority: string | null = null;
  if (csvRow.priority) {
    const p = csvRow.priority.toLowerCase();
    if (p.includes('p1') || p.includes('critical')) priority = 'critical';
    else if (p.includes('p2') || p.includes('high')) priority = 'high';
    else if (p.includes('p3') || p.includes('medium')) priority = 'medium';
    else if (p.includes('p4') || p.includes('low')) priority = 'low';
    else priority = csvRow.priority;
  }
  
  // Use parentSummary as category, fallback to projectName
  const category = csvRow.parentSummary || csvRow.projectName || null;
  
  // Combine text and acceptance criteria for description
  let description = '';
  if (csvRow.text) {
    description += csvRow.text;
  }
  if (csvRow.acceptanceCriteria) {
    if (description) description += '\n\n';
    description += `Acceptance Criteria: ${csvRow.acceptanceCriteria}`;
  }
  
  // Create full content with all available information
  const fullContentParts: string[] = [];
  
  if (title) fullContentParts.push(`Title: ${title}`);
  if (csvRow.storyId) fullContentParts.push(`Story ID: ${csvRow.storyId}`);
  if (priority) fullContentParts.push(`Priority: ${priority}`);
  if (csvRow.risk) fullContentParts.push(`Risk: ${csvRow.risk}`);
  if (csvRow.statusCategory) fullContentParts.push(`Status: ${csvRow.statusCategory}`);
  if (category) fullContentParts.push(`Category: ${category}`);
  if (csvRow.text) fullContentParts.push(`\nUser Story: ${csvRow.text}`);
  if (csvRow.acceptanceCriteria) fullContentParts.push(`\nAcceptance Criteria: ${csvRow.acceptanceCriteria}`);
  if (csvRow.createdDate) fullContentParts.push(`\nCreated: ${csvRow.createdDate}`);
  if (csvRow.lastModifiedDate) fullContentParts.push(`Last Modified: ${csvRow.lastModifiedDate}`);
  
  return {
    title,
    description: description || csvRow.text || '',
    priority,
    category,
    fullContent: fullContentParts.join('\n')
  };
}

/**
 * Extract user story information from text using enhanced regex patterns
 */
export function extractUserStoryInfo(text: string): UserStoryExtractionResult {
  // Enhanced title extraction - look for patterns like "Title:", "Story:", "Feature:", etc.
  const titleRegex = /(?:title|story|feature|epic|task):\s*(.+?)(?:\n|$)/i;
  const titleMatch = text.match(titleRegex);
  
  // Alternative title extraction from first line if formal pattern not found
  let title: string | null = null;
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    // Try to get first meaningful line as title
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length <= 100) { // Reasonable title length
        title = firstLine;
      }
    }
  }
  
  // Priority extraction - look for priority indicators
  const priorityRegex = /(?:priority|importance|urgency):\s*(high|medium|low|critical|normal)/i;
  const priorityMatch = text.match(priorityRegex);
  let priority: string | null = null;
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase();
  } else {
    // Look for standalone priority indicators
    const standalonePriorityRegex = /\b(high|medium|low|critical|urgent)\s*priority\b/i;
    const standalonePriorityMatch = text.match(standalonePriorityRegex);
    if (standalonePriorityMatch) {
      priority = standalonePriorityMatch[1].toLowerCase();
    }
  }
  
  // Category extraction - look for category/type indicators
  const categoryRegex = /(?:category|type|area|module):\s*([^\n]+)/i;
  const categoryMatch = text.match(categoryRegex);
  let category: string | null = null;
  if (categoryMatch) {
    category = categoryMatch[1].trim();
  } else {
    // Look for common categories
    const commonCategories = ['frontend', 'backend', 'api', 'database', 'ui', 'ux', 'authentication', 'security', 'reporting', 'admin'];
    for (const cat of commonCategories) {
      if (text.toLowerCase().includes(cat)) {
        category = cat;
        break;
      }
    }
  }
  
  // Extract description - remove title if found, otherwise use full content
  let description = text.trim();
  if (title && titleMatch) {
    description = text.replace(titleMatch[0], '').trim();
  }
  
  return {
    title,
    description: description || text.trim(),
    priority,
    category,
    fullContent: text.trim()
  };
}

/**
 * Validate extracted user story metadata
 */
export function validateUserStoryMetadata(data: UserStoryExtractionResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!data.title) {
    warnings.push("No title found");
  } else if (data.title.length < 5) {
    warnings.push(`Title is too short: ${data.title}`);
  } else if (data.title.length > 200) {
    warnings.push(`Title is too long (${data.title.length} chars): ${data.title.substring(0, 50)}...`);
  }

  if (!data.description || data.description.length < 20) {
    warnings.push("Description is too short (< 20 characters)");
  }

  if (!data.priority) {
    warnings.push("No priority found");
  }

  if (!data.category) {
    warnings.push("No category found");
  }

  if (!data.fullContent || data.fullContent.length < 50) {
    warnings.push("User story content is too short (< 50 characters)");
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Validate priority format
 */
function isValidPriority(priority: string): boolean {
  const validPriorities = ['high', 'medium', 'low', 'critical', 'normal'];
  return validPriorities.includes(priority.toLowerCase());
}

/**
 * Validate category format
 */
function isValidCategory(category: string): boolean {
  return category.length >= 2 && category.length <= 50;
}
