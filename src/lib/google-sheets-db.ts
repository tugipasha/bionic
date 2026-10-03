import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let activeSpreadsheetId: string | null = null;

// Auth State Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      activeSpreadsheetId = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with Sheets Scopes
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Google access token alınamadı.");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  activeSpreadsheetId = null;
};

// =========================================================================
// GOOGLE SHEETS DATABASE REPOSITORY
// =========================================================================

const DB_SPREADSHEET_TITLE = "BionicText_Veritabani";

/**
 * Finds or creates the dedicated BionicText Google Spreadsheet in the user's Google Drive.
 */
export async function getOrCreateDatabaseSpreadsheet(): Promise<string> {
  if (activeSpreadsheetId) return activeSpreadsheetId;
  const token = await getAccessToken();
  if (!token) throw new Error("Google Sheets erişim izni bulunamadı. Lütfen giriş yapın.");

  try {
    // 1. Search for existing spreadsheet in user's Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        DB_SPREADSHEET_TITLE,
      )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id, name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      activeSpreadsheetId = searchData.files[0].id;
      return activeSpreadsheetId as string;
    }

    // 2. Create new spreadsheet with initialized tables
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: DB_SPREADSHEET_TITLE },
        sheets: [
          {
            properties: { title: "OkumaGecmisi" },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Tarih / Saat" } },
                      { userEnteredValue: { stringValue: "Kaynak Dil" } },
                      { userEnteredValue: { stringValue: "Hedef Dil" } },
                      { userEnteredValue: { stringValue: "Kelime Sayısı" } },
                      { userEnteredValue: { stringValue: "Biyonik Format" } },
                      { userEnteredValue: { stringValue: "Çeviri Metni" } },
                    ],
                  },
                ],
              },
            ],
          },
          {
            properties: { title: "HizTestleri" },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Tarih / Saat" } },
                      { userEnteredValue: { stringValue: "Metin Başlığı" } },
                      { userEnteredValue: { stringValue: "Okuma Modu" } },
                      { userEnteredValue: { stringValue: "WPM (Dakikadaki Kelime)" } },
                      { userEnteredValue: { stringValue: "Doğruluk Oranı (%)" } },
                      { userEnteredValue: { stringValue: "Süre (Saniye)" } },
                    ],
                  },
                ],
              },
            ],
          },
          {
            properties: { title: "AI_Sohbetler" },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Tarih / Saat" } },
                      { userEnteredValue: { stringValue: "Kullanıcı Sorusu" } },
                      { userEnteredValue: { stringValue: "AI Yanıtı (Özet)" } },
                      { userEnteredValue: { stringValue: "Model" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const createData = await createRes.json();
    if (!createData.spreadsheetId) {
      throw new Error("Google E-Tablo oluşturulamadı.");
    }

    activeSpreadsheetId = createData.spreadsheetId;
    return activeSpreadsheetId as string;
  } catch (err) {
    console.error("Google Sheets DB Init Error:", err);
    throw err;
  }
}

/**
 * Appends a record to a specific sheet in Google Sheets
 */
export async function appendToSheet(sheetName: string, rowValues: (string | number | boolean)[]) {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const spreadsheetId = await getOrCreateDatabaseSpreadsheet();
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [rowValues],
        }),
      },
    );

    return res.ok;
  } catch (err) {
    console.error(`Google Sheets ${sheetName} append error:`, err);
    return false;
  }
}

/**
 * Save Reading Translation to Google Sheets
 */
export async function saveReadingToSheets(record: {
  sourceLang: string;
  targetLang: string;
  wordCount: number;
  isBionic: boolean;
  textSnippet: string;
}) {
  const timestamp = new Date().toLocaleString("tr-TR");
  return appendToSheet("OkumaGecmisi", [
    timestamp,
    record.sourceLang,
    record.targetLang,
    record.wordCount,
    record.isBionic ? "Evet" : "Hayır",
    record.textSnippet.slice(0, 250),
  ]);
}

/**
 * Save Reading Speed Test Result to Google Sheets
 */
export async function saveSpeedTestToSheets(record: {
  title: string;
  mode: string;
  wpm: number;
  accuracy: number;
  durationSeconds: number;
}) {
  const timestamp = new Date().toLocaleString("tr-TR");
  return appendToSheet("HizTestleri", [
    timestamp,
    record.title,
    record.mode,
    record.wpm,
    `${record.accuracy}%`,
    record.durationSeconds,
  ]);
}

/**
 * Save AI Chat to Google Sheets
 */
export async function saveAIChatToSheets(record: {
  prompt: string;
  response: string;
  model: string;
}) {
  const timestamp = new Date().toLocaleString("tr-TR");
  return appendToSheet("AI_Sohbetler", [
    timestamp,
    record.prompt,
    record.response.slice(0, 300),
    record.model,
  ]);
}

/**
 * Returns user-accessible Google Sheets URL
 */
export function getSheetsUrl(spreadsheetId?: string) {
  const id = spreadsheetId || activeSpreadsheetId;
  return id
    ? `https://docs.google.com/spreadsheets/d/${id}/edit`
    : "https://docs.google.com/spreadsheets";
}
