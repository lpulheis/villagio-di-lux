import { google } from 'googleapis';
import type { RegistrationData } from '../types/registration';
import type { RegistrationRepository } from './RegistrationRepository';

function getAuthClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE;

  if (!credentials && !keyFile) {
    throw new Error('Provide GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEYFILE in env');
  }

  return new google.auth.GoogleAuth({
    credentials: credentials ? JSON.parse(credentials) : undefined,
    keyFilename: keyFile || undefined,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export class GoogleSheetsRepository implements RegistrationRepository {
  private sheets: any;
  private sheetId: string;

  constructor() {
    const auth = getAuthClient();
    this.sheets = google.sheets({ version: 'v4', auth });
    this.sheetId = process.env.GOOGLE_SHEETS_ID ?? '1ikVXcPU9U7Sga7_1IqSIwV2s1wtQ8aB6Dh2MiH3Gedw';
    if (!this.sheetId) throw new Error('Missing GOOGLE_SHEETS_ID env var');
  }

  async findByEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'A:D',
    });
    const rows = res.data.values ?? [];
    for (const row of rows) {
      const rowEmail = (row[3] || '').toString().trim().toLowerCase();
      if (rowEmail === normalized) return true;
    }
    return false;
  }

  async save(registrationData: RegistrationData): Promise<void> {
    const values = registrationData.residents.map((r) => [new Date().toISOString(), registrationData.houseNumber, r.name, r.email]);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: 'A:D',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  }
}
