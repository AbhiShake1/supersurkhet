import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Parse CSV file and convert to JSON
 */
export function parseCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      worker: false,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(", ")}`));
        } else {
          resolve(results.data as any[]);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse Excel file and convert to JSON
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

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
      reject(new Error("Error reading Excel file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse JSON file
 */
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
      reject(new Error("Error reading JSON file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate parsed data against a Zod schema
 */
export function validateDataAgainstSchema<T extends z.ZodObject<any>>(
  data: any[],
  schema: T
): { validData: z.infer<T>[], errors: { index: number; error: string }[] } {
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
          error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      } else {
        errors.push({
          index,
          error: 'Unknown validation error'
        });
      }
    }
  });

  return { validData, errors };
}
