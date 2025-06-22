import TelegramBot from "node-telegram-bot-api"
import { BOT_TOKEN, CHAT_ID } from "./config"
import { DiarioDocument, SelectOption } from "./types"

const bot = new TelegramBot(BOT_TOKEN, { polling: false })

/** Envia um documento para o Telegram */
export const sendDoc = async (city: SelectOption, doc: DiarioDocument) => {
  const message = `
${doc.category} - ${city.name}
>${doc.document}

ID: \`${doc.id}\`
Edição: \`${doc.edition} | ${doc.date}\`

[Download externo ↗](${doc.file})`
    .replaceAll("-", "\\-")
    .replaceAll("|", "\\|")
  await bot.sendDocument(CHAT_ID, doc.file, {
    caption: message.trim(),
    parse_mode: "MarkdownV2",
  })
}
