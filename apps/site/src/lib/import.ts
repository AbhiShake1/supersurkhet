import { z } from 'zod';
import { csvParse } from 'd3-dsv';
import * as XLSX from 'xlsx';

/**
 * Parse CSV file and convert to JSON
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export async function parseCSVFile(file: File): Promise<any[]> {
  const text = await file.text();
  const parsed = csvParse(text);
  return parsed;
}

/**
 * Parse Excel file and convert to JSON
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading Excel file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse JSON file
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function parseJSONFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);

        // If it's an array, return it directly; otherwise wrap in array
        if (Array.isArray(jsonData)) {
          resolve(jsonData);
        } else {
          resolve([jsonData]);
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading JSON file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate parsed data against a Zod schema
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function validateDataAgainstSchema<T extends z.ZodObject<any>>(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  data: any[],
  schema: T,
): { validData: z.infer<T>[]; errors: { index: number; error: string }[] } {
  const validData: z.infer<T>[] = [];
  const errors: { index: number; error: string }[] = [];

  data.forEach((item, index) => {
    try {
      const parsed = schema.parse(item);
      validData.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          index,
          error: error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
        });
      } else {
        errors.push({
          index,
          error: 'Unknown validation error',
        });
      }
    }
  });

  return { validData, errors };
}
