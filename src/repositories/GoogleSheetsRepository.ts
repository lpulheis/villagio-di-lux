import { google } from 'googleapis';
import type { RegistrationData } from '../types/registration.js';
import type { RegistrationRepository } from './RegistrationRepository.js';

function getAuthClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE;

  console.log('Google Sheets Auth:', {
    hasJsonCredentials: !!credentials,
    hasKeyFile: !!keyFile,
  });

  if (!credentials && !keyFile) {
    throw new Error(
      'Provide GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEYFILE in env'
    );
  }

  let parsedCredentials;

  if (credentials) {
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (error) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_JSON is not a valid JSON'
      );
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

    this.sheetId =
      process.env.GOOGLE_SHEETS_ID ??
      '1ikVXcPU9U7Sga7_1IqSIwV2s1wtQ8aB6Dh2MiH3Gedw';

    if (!this.sheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    console.log('Google Sheets ID carregado:', this.sheetId);
  }

  async findByEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();

    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'A:D',
    });

    const rows = res.data.values ?? [];

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

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: 'A:D',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });
  }
}
