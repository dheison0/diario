import TelegramBot from "node-telegram-bot-api";
import { BOT_TOKEN, CHAT_ID } from "./config.js";

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

export const sendDoc = async (city, doc) => {
  const message = `
${doc.category} - ${city.name}
>${doc.document}

ID: \`${doc.id}\`
Edição: \`${doc.edition} | ${doc.date}\`

[Download externo ↗](${doc.file})`
    .replaceAll("-", "\\-")
    .replaceAll("|", "\\|");
  await bot.sendDocument(CHAT_ID, doc.file, {
    caption: message.trim(),
    parse_mode: "MarkdownV2",
  });
};
