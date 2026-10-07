import { existsSync } from 'fs';
import path from 'path';
import { google } from 'googleapis';
import type { RegistrationData } from '../types/registration.ts';
import type { RegistrationRepository } from './RegistrationRepository.ts';

function getAuthClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE;

  if (!credentials && !keyFile) {
    throw new Error('Provide GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEYFILE in env');
  }

  let parsedCredentials: Record<string, unknown> | undefined;

  if (credentials) {
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a valid JSON');
    }
  }

  if (!parsedCredentials && keyFile) {
    const resolvedKeyFile = path.resolve(process.cwd(), keyFile);

    if (!existsSync(resolvedKeyFile)) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEYFILE points to a missing file: ${resolvedKeyFile}`);
    }
  }

  return new google.auth.GoogleAuth({
    credentials: parsedCredentials,
    keyFilename: !parsedCredentials ? keyFile : undefined,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export class GoogleSheetsRepository implements RegistrationRepository {
  private sheets: any;
  private sheetId: string;

  constructor() {
    const auth = getAuthClient();

    this.sheets = google.sheets({
      version: 'v4',
      auth,
    });

    this.sheetId = process.env.GOOGLE_SHEETS_ID ?? '1ikVXcPU9U7Sga7_1IqSIwV2s1wtQ8aB6Dh2MiH3Gedw';

    if (!this.sheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }
  }

  async ensureSheetExists(sheetName: string): Promise<void> {
    const metadata = await this.sheets.spreadsheets.get({
      spreadsheetId: this.sheetId,
    });

    const exists = metadata.data.sheets?.some((sheet: any) => sheet.properties?.title === sheetName);

    if (exists) {
      return;
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  }

  async readSheet(sheetName: string): Promise<string[][]> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${sheetName}!A:Z`,
      });

      return res.data.values ?? [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Unable to parse range|not found|does not exist|INVALID_ARGUMENT/i.test(message)) {
        await this.ensureSheetExists(sheetName);
        const res = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: `${sheetName}!A:Z`,
        });
        return res.data.values ?? [];
      }

      throw error;
    }
  }

  async writeSheet(sheetName: string, rows: string[][]): Promise<void> {
    await this.ensureSheetExists(sheetName);

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.sheetId,
      range: `${sheetName}!A:Z`,
    });

    if (!rows.length) {
      return;
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  }

  async appendRows(sheetName: string, rows: string[][]): Promise<void> {
    if (!rows.length) {
      return;
    }

    await this.ensureSheetExists(sheetName);

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
  }

  async findByEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();

    const rows = await this.readSheet('CADASTROS');

    for (const row of rows) {
      const rowEmail = (row[3] || '')
        .toString()
        .trim()
        .toLowerCase();

      if (rowEmail === normalized) {
        return true;
      }
    }

    return false;
  }

  async save(registrationData: RegistrationData): Promise<void> {
    const values = registrationData.residents.map((r) => [
      new Date().toISOString(),
      registrationData.houseNumber,
      r.name,
      r.email,
    ]);

    await this.appendRows('CADASTROS', values);
  }
}
