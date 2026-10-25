import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { DetectedInputType, ExtractedInputData } from '../types/brandDna';

export class FileExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileExtractionError';
  }
}

/**
 * Extracts plain text or image payload client-side in the browser
 */
export async function extractInputData(fileOrText: File | string): Promise<ExtractedInputData> {
  if (typeof fileOrText === 'string') {
    return {
      type: 'plain_text',
      textContent: fileOrText.trim(),
      fileSize: new Blob([fileOrText]).size
    };
  }

  const file = fileOrText;
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;

  // 1. Text and Markdown files (.txt, .md)
  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    try {
      const text = await file.text();
      return {
        type: 'document',
        fileName: file.name,
        fileSize,
        textContent: text.trim()
      };
    } catch (err) {
      throw new FileExtractionError(`Failed to read text/markdown file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // 2. Word documents (.docx)
  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value.trim();
      if (!text) {
        throw new FileExtractionError('Extracted document text is empty.');
      }
      return {
        type: 'document',
        fileName: file.name,
        fileSize,
        textContent: text
      };
    } catch (err) {
      throw new FileExtractionError(`Failed to extract text from Word document: ${err instanceof Error ? err.message : 'Invalid or corrupt file'}`);
    }
  }

  // 3. Spreadsheets (.xlsx, .xls, .csv)
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const textLines: string[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });
        
        jsonData.forEach((row, rowIndex) => {
          if (!Array.isArray(row)) return;
          // Filter out pure numbers or empty cells; extract text-bearing content
          const rowWords = row
            .filter((cell) => cell !== null && cell !== undefined && String(cell).trim().length > 0)
            .map((cell) => String(cell).trim())
            .filter((cellStr) => !/^[-+]?[0-9]*\.?[0-9]+$/.test(cellStr)); // skip pure numeric cells

          if (rowWords.length > 0) {
            textLines.push(`[${sheetName} Row ${rowIndex + 1}] ${rowWords.join(' | ')}`);
          }
        });
      });

      const fullText = textLines.join('\n');
      if (!fullText) {
        throw new FileExtractionError('Spreadsheet contains no readable text content (all numeric or empty).');
      }

      return {
        type: 'spreadsheet',
        fileName: file.name,
        fileSize,
        textContent: fullText
      };
    } catch (err) {
      throw new FileExtractionError(`Failed to parse spreadsheet: ${err instanceof Error ? err.message : 'Invalid spreadsheet file'}`);
    }
  }

  // 4. Image files (.png, .jpg, .jpeg, .webp)
  if (file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(fileName)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          type: 'image',
          fileName: file.name,
          fileSize,
          imageDataUrl: reader.result as string,
          rawImageFile: file
        });
      };
      reader.onerror = () => {
        reject(new FileExtractionError('Failed to read visual image asset.'));
      };
      reader.readAsDataURL(file);
    });
  }

  throw new FileExtractionError(`Unsupported file format "${file.name}". Please provide .docx, .txt, .md, .xlsx, .csv, .png, .jpg, or .webp.`);
}
