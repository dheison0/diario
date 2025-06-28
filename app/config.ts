import { config as dotenvConfig } from "dotenv"

dotenvConfig()

export const SECOND = 1000
export const MINUTE = 60 * SECOND

/** Obtém um valor de uma variável de ambiente */
function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue
  if (!value) {
    throw new Error(`${name} not defined!`)
  }
  return value
}

/* Configurações do website */
export const WEBSITE_URL =
  "https://www.diarioficialdosmunicipios.org/consulta/ConPublicacaoGeral/ConPublicacaoGeral.php"
export const UPDATE_INTERVAL = 15 * MINUTE
export const NETWORK_TIMEOUT = 2.5 * SECOND
export const MIN_RESULTS_PER_PAGE = 10 // Por padrão o site retorna 10 resultados por pagina
export const CITIES = getEnv("CITIES", "Picos|Corrente").split("|")
export const ENTITIES = getEnv("ENTITIES", "Prefeitura|Camara").split("|")

/* Configurações do bot */
export const DB_PATH = getEnv("DB_PATH", "./bot-db")
export const BOT_TOKEN = getEnv("BOT_TOKEN")
export const CHAT_ID = getEnv("CHAT_ID")
