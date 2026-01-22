// scripts/get-google-token.cjs
require("dotenv").config({ path: ".env.local" });
const { google } = require("googleapis");
const readline = require("readline");

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  console.error("⚠️ Faltam GOOGLE_CLIENT_ID, CLIENT_SECRET ou REDIRECT_URI no .env.local");
  process.exit(1);
}

// 👇 AGORA COM CALENDAR + GMAIL
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
];

const oAuth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("🔐 Abra este link no browser e faça login:");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nCole aqui o código que o Google devolveu: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log("\n✅ Tokens recebidos:\n", tokens);
    console.log("\n🟢 NOVO REFRESH TOKEN (adicione ao .env.local como GOOGLE_REFRESH_TOKEN):\n", tokens.refresh_token);
  } catch (err) {
    console.error("❌ Erro ao obter tokens:", err);
  } finally {
    rl.close();
  }
});
