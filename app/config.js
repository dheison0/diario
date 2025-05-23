import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const MINUTE = 60 * 1000;

export const UPDATE_INTERVAL = 10 * MINUTE;
export const WEBSITE_URL =
  "https://www.diarioficialdosmunicipios.org/consulta/ConPublicacaoGeral/ConPublicacaoGeral.php";
export const NETWORK_TIMEOUT = 2500;
export const MIN_RESULTS_PER_PAGE = 10; // O website define que retorna 10 items por vez
export const DB_PATH = process.env.DB_PATH || "./bot-db";
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const CHAT_ID = process.env.CHAT_ID;
