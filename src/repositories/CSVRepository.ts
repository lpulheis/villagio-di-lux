import Papa from 'papaparse';
import { promises as fs } from 'fs';
import path from 'path';
import type { RegistrationData } from '../types/registration.js';
import type { RegistrationRepository } from './RegistrationRepository.js';

const CSV_PATH = path.resolve(process.cwd(), 'cadastros.csv');

const parseCsv = async (): Promise<string[]> => {
  try {
    const file = await fs.readFile(CSV_PATH, 'utf-8');
    const result = Papa.parse<string[]>(file, { skipEmptyLines: true }).data;
    return result
      .slice(1)
      .flatMap((row: string[]) => (row.length >= 3 ? [row[2].trim().toLowerCase()] : []));
  } catch {
    return [];
  }
};

export class CSVRepository implements RegistrationRepository {
  async findByEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const emails = await parseCsv();
    return emails.some((existing) => existing === normalized);
  }

  async save(registrationData: RegistrationData): Promise<void> {
    const lines = registrationData.residents.map(
      (resident) => `${registrationData.houseNumber},${resident.name},${resident.email}`,
    );
    const content = lines.join('\n') + '\n';
    await fs.appendFile(CSV_PATH, content, 'utf-8');
  }
}
