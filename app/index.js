import playwright from 'playwright'
import { MIN_RESULTS_PER_PAGE, WEBSITE_URL } from './config.js'

const iframeSelector = 'iframe[id="nmsc_iframe_ConPublicacaoGeral"]:not([src=""])'

const extractOptions = async (page, query) => await page.evaluate(
    q => Array.from(document.querySelectorAll(q)).map(i => ({ name: i.innerText.trim(), value: i.value })),
    query
)

const findOption = (nameLike, options) => options.find(i => i.name.toLowerCase().match(nameLike.toLowerCase()))

function loadSearchResults(iframeSelector) {
    const rows = document.querySelector(iframeSelector).contentDocument.querySelectorAll("tr.scGridFieldEven, tr.scGridFieldOdd")
    return Array.from(rows).map(i => {
        const cells = i.querySelectorAll("td")
        return {
            "id": cells[cells.length - 1].innerText.trim(),
            'edition': cells[1].innerText.trim(),
            'date': cells[3].innerText.trim(),
            'category': cells[6].innerText.trim(),
            'document': cells[7].innerText.trim(),
            'file': cells[8].querySelector('a').href.split("'")[1].trim()
        }
    })
}

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
    const edition = findOption("5317", editions)

    console.log("=".repeat(50))
    console.log("Informações selecionadas:")
    console.log(`  Cidade: "${city.name}"`)
    console.log(`  Entidade: "${entity.name}"`)
    console.log(`  Edição: "${edition.name}" (${edition.value})`)
    console.log("=".repeat(50))

    console.log("Selecionando dados a serem procurados...")
    await page.selectOption('select[name="numedicao"]', edition.value)
    await page.selectOption('select[name="nomeentidade"]', entity.value)
    await page.selectOption('select[name="nomemunicipio"]', city.value)

    console.log("Esperando por resultados...")
    await page.click('a#sc_b_pesq_bot')
    await page.waitForSelector(iframeSelector, { state: "visible" })
    await page.waitForLoadState('networkidle')
    console.log("Resultados obtidos!")

    console.log("Carregando dados...")
    const result = {}
    while (true) {
        const newResults = await page.evaluate(loadSearchResults, iframeSelector)
        newResults.forEach(i => { result[i.id] = i })
        if (newResults.length < MIN_RESULTS_PER_PAGE) {
            break
        }
        // FIXME: Essa função ainda retorna false as vezes mesmo já estando na última página de reultados
        const stop = await page.evaluate( // Essa função vai tentar indicar se já chegou ao fim da busca
            (i) => {
                const iframe = () => document.querySelector(i).contentDocument
                const buttonDisabled = iframe().querySelector('img#id_img_forward_bot').src.includes('off')
                if (buttonDisabled) {
                    return true
                }
                iframe().querySelector('a#forward_bot').click()
                return false
            },
            iframeSelector
        )
        if (stop) {
            break
        }
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(250)
    }

    console.log(result)
    console.log("Fim")
    await browser.close()
}

main()