import playwright from 'playwright'
import { WEBSITE_URL } from './config.js'

const extractOptions = async (page, query) => {
    const result = await page.evaluate(
        (q) => {
            const elements = Array.from(document.querySelectorAll(q))
            return elements.map(i => ({ name: i.innerText.trim(), value: i.value }))
        },
        query
    )
    return result
}

async function main() {
    console.log("Abrindo navegador...")
    const browser = await playwright.chromium.launch()
    console.log("Acessando site...")
    const page = await browser.newPage()
    await page.goto(WEBSITE_URL)
    console.log("Esperando seletor da data aparecer...")
    await page.waitForSelector("#SC_data_cond", { state: "hidden" })
    
    const editions = await extractOptions(page, '#SC_numedicao > option')
    const entities = await extractOptions(page, '#SC_nomeentidade > option')
    const cities = await extractOptions(page, '#SC_nomemunicipio > option')

    console.log(editions)
    console.log(entities)
    console.log(cities)

    console.log("fim")
    await browser.close()
}

main()