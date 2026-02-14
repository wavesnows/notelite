import fs from 'fs';
import path from 'path';

export interface SearchResult {
  filePath: string;
  fileName: string;
  matchedText: string;
  context: string;
  blockType: string;
  score: number;
}

/**
 * Extract plain text from EditorJS JSON data
 */
export function extractTextFromEditorJS(jsonData: any): string[] {
  if (!jsonData || !jsonData.blocks || !Array.isArray(jsonData.blocks)) {
    return [];
  }

  const textBlocks: string[] = [];

  jsonData.blocks.forEach((block: any) => {
    let text = '';

    switch (block.type) {
      case 'paragraph':
      case 'header':
        text = block.data?.text || '';
        break;
      case 'list':
        if (block.data?.items && Array.isArray(block.data.items)) {
          text = block.data.items.join(' ');
        }
        break;
      case 'quote':
        text = block.data?.text || '';
        if (block.data?.caption) {
          text += ' ' + block.data.caption;
        }
        break;
      case 'warning':
        text = (block.data?.title || '') + ' ' + (block.data?.message || '');
        break;
      case 'checklist':
        if (block.data?.items && Array.isArray(block.data.items)) {
          text = block.data.items.map((item: any) => item.text).join(' ');
        }
        break;
      case 'table':
        if (block.data?.content && Array.isArray(block.data.content)) {
          text = block.data.content.flat().join(' ');
        }
        break;
      case 'code':
        text = block.data?.code || '';
        break;
      default:
        // Try to extract text from any data.text field
        if (block.data?.text) {
          text = block.data.text;
        }
    }

    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');

    if (text.trim()) {
      textBlocks.push(text.trim());
    }
  });

  return textBlocks;
}

/**
 * Create context snippet around matched text
 */
function createContext(text: string, query: string, contextLength: number = 100): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text.substring(0, contextLength) + '...';

  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(text.length, index + query.length + contextLength / 2);

  let context = text.substring(start, end);

  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  return context;
}

/**
 * Calculate relevance score for search result
 */
function calculateScore(text: string, query: string, fileName: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  let score = 0;

  // Exact match in file name
  if (lowerFileName.includes(lowerQuery)) {
    score += 50;
  }

  // Count occurrences in content
  const matches = (lowerText.match(new RegExp(lowerQuery, 'g')) || []).length;
  score += matches * 10;

  // Bonus for match at start of text
  if (lowerText.startsWith(lowerQuery)) {
    score += 20;
  }

  return score;
}

/**
 * Search a single file
 */
function searchFile(filePath: string, query: string): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Skip empty files
    if (!fileContent || fileContent.trim().length === 0) {
      return results;
    }

    // Check for Git merge conflict markers
    if (fileContent.includes('<<<<<<<') || fileContent.includes('>>>>>>>') || fileContent.includes('=======')) {
      console.warn(`File ${filePath} contains unresolved Git merge conflicts, skipping`);
      return results;
    }

    const jsonData = JSON.parse(fileContent);

    // Validate EditorJS data structure
    if (!jsonData || !jsonData.blocks || !Array.isArray(jsonData.blocks)) {
      console.warn(`Invalid EditorJS format in file ${filePath}, skipping`);
      return results;
    }

    const textBlocks = extractTextFromEditorJS(jsonData);
    const fileName = path.basename(filePath, '.json');

    textBlocks.forEach((text, index) => {
      if (text.toLowerCase().includes(query.toLowerCase())) {
        const blockType = jsonData.blocks[index]?.type || 'unknown';
        const score = calculateScore(text, query, fileName);

        results.push({
          filePath,
          fileName,
          matchedText: text,
          context: createContext(text, query),
          blockType,
          score
        });
      }
    });
  } catch (error) {
    // Silently skip files with JSON parse errors or read errors
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Skipping file ${filePath} due to error:`, error instanceof Error ? error.message : error);
    }
  }

  return results;
}

/**
 * Recursively search all notes in a directory
 */
function searchDirectory(dirPath: string, query: string, results: SearchResult[] = []): SearchResult[] {
  try {
    if (!fs.existsSync(dirPath)) {
      return results;
    }

    const items = fs.readdirSync(dirPath);

    items.forEach(item => {
      // Skip hidden files and folders
      if (item.startsWith('.')) return;

      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Recursively search subdirectories
        searchDirectory(itemPath, query, results);
      } else if (stat.isFile() && item.endsWith('.json')) {
        // Search JSON files
        const fileResults = searchFile(itemPath, query);
        results.push(...fileResults);
      }
    });
  } catch (error) {
    console.error(`Error searching directory ${dirPath}:`, error);
  }

  return results;
}

/**
 * Main search function
 */
export function searchNotes(notebookPath: string, query: string): SearchResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const notesPath = path.join(notebookPath, 'notes');
  const results = searchDirectory(notesPath, query.trim());

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Highlight matched text in search results
 */
export function highlightMatches(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
