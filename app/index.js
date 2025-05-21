import playwright from 'playwright'
import { Diario } from './diario.js'
import { findOption, showOptions } from './utils.js'
import { init as initDB, getLastUsedEdition, setLastUsedEdition, addDoc } from './database.js'

async function main() {
    // Inicializa a base das pesquisas
    const browser = await playwright.chromium.launch({ headless: true })
    await initDB()
    const jurema = new Diario(browser)
    await jurema.open()
    const options = await jurema.getOptions()

    const selectedOptions = {
        city: findOption("Jurema", options.cities),
        entity: findOption("Prefeitura", options.entities)
    }

    await updater(jurema, selectedOptions)

    await jurema.close()
    await browser.close()
}

const updater = async (diario, formOptions) => {
    await diario.reload()

    let { editions } = await diario.getOptions()
    editions = editions.slice(0, 10) // limita as edições ate 10
    editions.reverse() // Ordena do mais velho para o mais novo

    const lastUsedEdition = await getLastUsedEdition(formOptions.city)
    const lastUsedEditionIdx = editions.findIndex((i) => i.value == lastUsedEdition?.value)
    if (lastUsedEditionIdx !== -1) {
        editions = editions.slice(lastUsedEditionIdx + 1)
    }

    for (const edition of editions) {
        showOptions({ edition, ...formOptions })
        await diario.fillForm({ edition, ...formOptions })
        const results = await diario.getResults()
        setLastUsedEdition(formOptions.city, edition)
        for(const doc of results) {
            await addDoc(formOptions.city, doc)
        }
    }
}

main()