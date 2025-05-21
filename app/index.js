import playwright from 'playwright'
import { Diario } from './diario.js'
import { findOption, showOptions } from './utils.js'

async function main() {
    // Inicializa a base das pesquisas
    const browser = await playwright.chromium.launch({ headless: true })
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
    editions = editions.slice(10, 15)

    for (const edition of editions) {
        // if (edition.value === formOptions.edition.value) {
        //     break
        // }
        showOptions({ edition, ...formOptions })
        await diario.fillForm({ edition, ...formOptions })
        const results = await diario.getResults()
        console.log(results)
    }
}

main()