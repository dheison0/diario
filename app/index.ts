import playwright from "playwright"
import { sendDoc } from "./bot"
import { CITIES, SECOND, UPDATE_INTERVAL } from "./config"
import {
  addDoc,
  getDoc,
  getLastUsedEdition,
  init as initDB,
  setLastUsedEdition,
} from "./database"
import { Diario } from "./diario"
import { FormOptions, SelectOption } from "./types"

/** Procure pela opção desejada em um array de opções */
export const findOption = (like: string, options: SelectOption[]) =>
  options.find((i) => i.name.toLowerCase().match(like.toLowerCase()))

/** Aguarda por um intervalo de tempo */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  // Inicializa a base das pesquisas
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  })
  await initDB()
  const diario = new Diario(browser)
  await diario.load()

  const cities = await setupCities(diario)
  while (true) {
    for (const cityOptions of cities.values()) {
      try {
        await updater(diario, cityOptions)
      } catch (err) {
        console.error(`Erro na atualização de ${cityOptions.city.name}`, err)
      }
    }
    console.info("Esperando para próxima rodada de atualizações...")
    await delay(UPDATE_INTERVAL)
  }
}

/** Carrega as opções de cada cidade */
async function setupCities(diario: Diario): Promise<Map<string, FormOptions>> {
  const availableOptions = await diario.getOptions()
  const cities = new Map<string, FormOptions>()
  for (const cityName of CITIES) {
    const selectedOptions: FormOptions = {
      edition: { name: '', value: '' },
      city: findOption(cityName, availableOptions.cities)!,
      entity: findOption("Prefeitura", availableOptions.entities)!,
    }
    cities.set(cityName, selectedOptions)
  }
  return cities
}

/** Atualiza uma cidade */
async function updater(diario: Diario, formOptions: FormOptions) {
  console.info(`Atualizando ${formOptions.city.name}...`)
  await diario.reload()
  const editions = await getUpdateEditions(diario, formOptions)
  for (const edition of editions) {
    console.info(`Buscando ações na edição ${edition.name}...`)
    await diario.fillForm({ ...formOptions, edition })
    const results = await diario.getResults()
    for (const doc of results) {
      if (getDoc(formOptions.city, doc.id)) continue
      console.info(`Enviando documento com id=${doc.id}...`)
      await addDoc(formOptions.city, doc)
      try {
        await sendDoc(formOptions.city, doc)
      } catch (err: Error | any) {
        let timeout = 10 * SECOND
        if (err?.response) {
          console.warn("Envio atrasado para mais tarde...")
          timeout = err.response.body.parameters.retry_after * SECOND
        } else {
          console.error("Erro desconhecido ao enviar documento", err)
        }
        setTimeout(() => sendDoc(formOptions.city, doc), timeout)
      }
      await setLastUsedEdition(formOptions.city, edition)
      await delay(1.5 * SECOND)
    }
  }
  console.info(`Fim da atualização de ${formOptions.city.name}.`)
}

/** Obtém as edições que devem ser atualizadas */
async function getUpdateEditions(diario: Diario, formOptions: FormOptions) {
  let { editions } = await diario.getOptions()
  editions = editions.slice(0, 10) // limita as edições ate 10
  editions.reverse() // Ordena do mais velho para o mais novo
  const lastUsedEdition = getLastUsedEdition(formOptions.city)
  const lastUsedEditionIdx = editions.findIndex(
    (i) => i.value == lastUsedEdition?.value
  )
  if (lastUsedEditionIdx !== -1) {
    editions = editions.slice(lastUsedEditionIdx)
  }
  return editions
}

main()
