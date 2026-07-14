import { SignJWT, importPKCS8 } from "jose";

/**
 * Mendapatkan Access Token dari Google API menggunakan Service Account
 */
async function getAccessToken(env) {
  const privateKey = env.GOOGLE_PRIVATE_KEY;
  const clientEmail = env.GOOGLE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("Missing Google Service Account credentials in environment.");
  }

  // Parse private key
  const alg = "RS256";
  // The private key from env might have escaped newlines if passed through CLI/UI, ensure it's formatted
  const formattedKey = privateKey.replace(/\\n/g, "\n");
  
  const key = await importPKCS8(formattedKey, alg);

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  })
    .setProtectedHeader({ alg, typ: "JWT" })
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Google Access Token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Base class untuk Google Sheets Helper
 */
export class GoogleSheetsHelper {
  constructor(env) {
    this.env = env;
    this.sheetId = env.GOOGLE_SHEET_ID;
  }

  async getHeaders() {
    const token = await getAccessToken(this.env);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Membaca data dari sheet
   * @param {string} range Nama Sheet atau Range (contoh: 'Guru!A1:D100' atau 'Guru')
   */
  async readData(range) {
    try {
      const headers = await this.getHeaders();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(range)}`;
      
      const response = await fetch(url, { method: "GET", headers });
      
      if (!response.ok) {
        throw new Error(`Error reading from Google Sheets: ${await response.text()}`);
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error("[GoogleSheetsHelper] readData Error:", error.message);
      throw error;
    }
  }

  /**
   * Menambahkan baris data (Append)
   * @param {string} range Nama Sheet atau Range (contoh: 'Rekap!A:D')
   * @param {Array<Array<any>>} values Data 2 dimensi (contoh: [['Hadir', 'Senin', ...]])
   */
  async appendData(range, values) {
    try {
      const headers = await this.getHeaders();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ values }),
      });
      
      if (!response.ok) {
        throw new Error(`Error appending to Google Sheets: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[GoogleSheetsHelper] appendData Error:", error.message);
      throw error;
    }
  }

  /**
   * Memperbarui data pada range tertentu (Update)
   * @param {string} range Range spesifik (contoh: 'Rekap!D2:D2')
   * @param {Array<Array<any>>} values Data 2 dimensi (contoh: [['HADIR']])
   */
  async updateData(range, values) {
    try {
      const headers = await this.getHeaders();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ values }),
      });
      
      if (!response.ok) {
        throw new Error(`Error updating Google Sheets: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[GoogleSheetsHelper] updateData Error:", error.message);
      throw error;
    }
  }

  /**
   * Menghapus baris data (Clear)
   * Perhatian: Ini hanya menghapus isi cell, bukan struktur baris. 
   * Untuk menghapus struktur baris, harus menggunakan batchUpdate (bukan values API).
   */
  async clearData(range) {
    try {
      const headers = await this.getHeaders();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(range)}:clear`;
      
      const response = await fetch(url, {
        method: "POST",
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Error clearing Google Sheets: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[GoogleSheetsHelper] clearData Error:", error.message);
      throw error;
    }
  }

  /**
   * Membuat sheet baru jika belum ada
   * @param {string} title Nama sheet baru
   */
  async createSheet(title) {
    try {
      const headers = await this.getHeaders();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}:batchUpdate`;
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title,
                },
              },
            },
          ],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error creating sheet: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[GoogleSheetsHelper] createSheet Error:", error.message);
      throw error;
    }
  }

  /**
   * Mengambil daftar sheet dalam spreadsheet
   */
  async getSheetsList() {
    try {
      const headers = await this.getHeaders();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}?fields=sheets.properties`;
      
      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok) {
        throw new Error(`Error fetching spreadsheet metadata: ${await response.text()}`);
      }

      const data = await response.json();
      return data.sheets || [];
    } catch (error) {
      console.error("[GoogleSheetsHelper] getSheetsList Error:", error.message);
      throw error;
    }
  }
}
