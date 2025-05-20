import playwright from 'playwright'
import { Diario } from './diario.js'
import { findOption, showOptions } from './utils.js'

async function main() {
    // Inicializa a base das pesquisas
    const browser = await playwright.chromium.launch()
    const jurema = new Diario(browser)
    await jurema.open()
    const options = await jurema.getOptions()

    const selectedOptions = {
        city: findOption("Jurema", options.cities),
        entity: findOption("Prefeitura", options.entities),
        edition: findOption("5317", options.editions),
    }

    showOptions(selectedOptions)

    await jurema.fillForm(selectedOptions)
    const results = await jurema.getResults()
    console.log(results)

    await jurema.close()
    await browser.close()
}

main()