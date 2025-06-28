import playwright from "playwright"
import { sender } from "./bot"
import { CITIES, ENTITIES, MINUTE, SECOND, UPDATE_INTERVAL } from "./config"
import {
  getDocument,
  getLastUsedEdition,
  init as initDB,
  setDocument,
  setLastUsedEdition
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
  console.info("Iniciando navegador...")
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
  const diario = new Diario(browser)
  await diario.load()
  console.info("Navegador iniciado e pre-carregado.")

  await initDB()

  console.info("Configurando cidades...")
  const cities = await setupCities(diario)
  console.info("Iniciando atualizações...")
  setInterval(sender, 2 * MINUTE)

  while (true) {
    for (const cityOptions of cities.values()) {
      try {
        await updater(diario, cityOptions)
      } catch (err) {
        console.error(`Erro na atualização de ${cityOptions.city.name}`, err)
        await delay(10 * SECOND)
      }
    }
    console.info("Esperando para próxima rodada de atualizações...")
    await delay(UPDATE_INTERVAL)
    await diario.reload()
  }
}

/** Carrega as opções de cada cidade */
async function setupCities(diario: Diario): Promise<Map<string, FormOptions>> {
  const availableOptions = await diario.getOptions()
  const cities = new Map<string, FormOptions>()
  for (const cityName of CITIES) {
    for (const entityName of ENTITIES) {
      cities.set(`${cityName}|${entityName}`, {
        edition: { name: '', value: '' },
        city: findOption(cityName, availableOptions.cities)!,
        entity: findOption(entityName, availableOptions.entities)!,
      })
    }
  }
  return cities
}

/** Atualiza uma cidade */
async function updater(diario: Diario, formOptions: FormOptions) {
  console.info(`Atualizando ${formOptions.entity.name} de ${formOptions.city.name}...`)
  const editions = await getUpdateEditions(diario, formOptions)
  for (const edition of editions) {
    console.info(`Buscando ações na edição ${edition.name}...`)
    await diario.fillForm({ ...formOptions, edition })
    const results = await diario.getResults()
    let modified = false
    for (const doc of results) {
      if (getDocument(doc.id)) continue
      console.info(`Salvando documento id=${doc.id}...`)
      await setDocument({
        ...doc, edition,
        city: formOptions.city,
        entity: formOptions.entity
      })
      modified = true
    }
    if (modified) {
      await setLastUsedEdition(formOptions.city, formOptions.entity, edition)
    }
    console.log("Esperando um pouco para a próxima edição...")
    await delay(1 * MINUTE)
  }
  console.info(`Fim da atualização de ${formOptions.city.name}.`)
}

/** Obtém as edições que devem ser atualizadas */
async function getUpdateEditions(diario: Diario, formOptions: FormOptions) {
  let { editions } = await diario.getOptions()
  editions = editions.slice(0, 10) // limita as edições ate 10
  editions.reverse() // Ordena do mais velho para o mais novo
  const lastUsedEdition = getLastUsedEdition(formOptions.city, formOptions.entity)
  const lastUsedEditionIdx = editions.findIndex(
    (i) => i.value == lastUsedEdition?.value
  )
  if (lastUsedEditionIdx !== -1) {
    editions = editions.slice(lastUsedEditionIdx)
  }
  return editions
}

main()
