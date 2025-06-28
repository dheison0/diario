import TelegramBot from "node-telegram-bot-api"
import { delay } from "."
import { BOT_TOKEN, CHAT_ID, SECOND } from "./config"
import { getAllDocuments, getLastUsedEdition, removeDocument, setDocument } from "./database"
import { DiarioDocument } from "./types"

const bot = new TelegramBot(BOT_TOKEN, { polling: false })

const htmlScape = (text: string): string => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

/** Envia um documento para o Telegram */
export const sendDoc = async (doc: DiarioDocument) => {
  const message = `
<b>${htmlScape(doc.category)} - ${htmlScape(doc.entity!.name)} - ${htmlScape(doc.city!.name)}</b>

<blockquote><i>${htmlScape(doc.description)}</i></blockquote>

<i>${htmlScape(doc.edition!.name)}</i>
<b>ID:</b> <code>${htmlScape(doc.id)}</code>
<b>Data do documento:</b> ${htmlScape(doc.date)}

<a href="${doc.url}">Fazer download ↗</a>`
  await bot.sendMessage(CHAT_ID, message.trim(), { parse_mode: "HTML" })
}

/**
 * Envia todos os documentos para o Telegram. Se o documento ja foi enviado
 * e a ultima edição usada pela cidade for diferente da edição do documento,
 * remove o documento. Se a ultima edição for a mesma, marca o documento como
 * enviado e o atualiza no banco de dados.
 */
export const sender = async () => {
  const docs = getAllDocuments()
  for (const doc of docs) {
    const lastUsedEditionForCity = getLastUsedEdition(doc.city!, doc.entity!)
    if (doc.sent) {
      if (lastUsedEditionForCity?.value != doc.edition?.value) {
        console.info(`Removendo documento id=${doc.id}...`)
        await removeDocument(doc.id)
      }
      continue
    }

    try {
      console.info(`Enviando documento id=${doc.id}...`)
      await sendDoc(doc)
    } catch (err: Error | any) {
      console.error("Falha ao enviar documento!", doc, err)
      await delay(10 * SECOND)
      continue
    }

    if (lastUsedEditionForCity?.value != doc.edition?.value) {
      await removeDocument(doc.id)
    } else {
      doc.sent = true
      await setDocument(doc) // Atualiza o documento como enviado
    }

    // Pequeno atraso para não ser bloqueado por SPAM
    await delay(2 * SECOND)
  }
}