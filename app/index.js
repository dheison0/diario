import playwright from 'playwright'
import { WEBSITE_URL } from './config.js'

async function extractOptions(page, query) {
    const result = await page.evaluate(
        (q) => {
            const elements = Array.from(document.querySelectorAll(q))
            return elements.map(i => ({ name: i.innerText.trim(), value: i.value }))
        },
        query
    )
    return result
}

async function setValue(page, selector, value) {
    await page.evaluate(({ selector, value }) => {
        document.querySelector(selector).value = value
    }, { selector, value })
}

const findOption = (nameLike, options) => options.find(i => i.name.toLowerCase().match(nameLike.toLowerCase()))

async function main() {
    // Inicializa a base das pesquisas
    console.log("Abrindo navegador...")
    const browser = await playwright.chromium.launch()
    console.log("Acessando site...")
    const page = await browser.newPage()
    await page.goto(WEBSITE_URL)
    console.log("Esperando seletor da data aparecer...")
    await page.waitForSelector("#SC_data_cond", { state: "hidden" })

    // Obtem as informações básicas para pesquisa
    const editions = await extractOptions(page, '#SC_numedicao > option')
    const entities = await extractOptions(page, '#SC_nomeentidade > option')
    const cities = await extractOptions(page, '#SC_nomemunicipio > option')

    // Escolhe o local que deseja obter as informações
    const city = findOption("Jurema", cities)
    const entity = findOption("Prefeitura", entities)
    const edition = editions[1]

    console.log(city)
    console.log(entity)
    console.log(edition)

    console.log("Selecionando dados a serem procurados...")
    await setValue(page, 'select[name="numedicao"]', edition.value)
    await setValue(page, 'select[name="nomeentidade"]', entity.value)
    await setValue(page, 'select[name="nomemunicipio"]', city.value)

    await page.click('#sc_b_pesq_bot')

    // TODO: Sem resultados por aqui
    console.log("Esperando por resultados...")
    await page.waitForSelector('a[id="sc_AgruparPDFs_top"]')
    console.log("fim")
    await browser.close()
}

main()