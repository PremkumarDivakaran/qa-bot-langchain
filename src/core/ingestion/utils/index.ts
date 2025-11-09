// Ingestion utilities
export * from './ingestionRunner.js';
export * from './csvLoader.js';
export * from './userStoryDocumentLoader.js';
export * from './userStoryExtractors.js';

// File handling utilities
export const validateFileType = (mimeType: string, fileName: string): boolean => {
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

export const saveUploadedFile = async (buffer: Buffer, originalName: string): Promise<string> => {
  const { promises: fs } = await import('fs');
  const path = await import('path');
  
  // Ensure user_stories directory exists
  const userStoriesDir = './user_stories';
  try {
    await fs.access(userStoriesDir);
  } catch {
    await fs.mkdir(userStoriesDir, { recursive: true });
  }
  
  // Generate unique filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  const fileName = `${baseName}_${timestamp}${extension}`;
  const filePath = path.join(userStoriesDir, fileName);
  
  // Save file
  await fs.writeFile(filePath, buffer);
  
  return fileName;
};
