import { MIN_RESULTS_PER_PAGE, NETWORK_TIMEOUT, WEBSITE_URL } from './config.js'

export class Diario {
    /**
     * Initializes a new instance of the Diario class.
     *
     * @param {object} browser - An instance of the browser to be used for page navigation and interactions.
     */
    constructor(browser) {
        this.browser = browser
        this.iframeSelector = 'iframe[id="nmsc_iframe_ConPublicacaoGeral"]:not([src=""])'
    }

    /**
     * Opens a new page and navigates to the website for the Diario dos
     * Municipios.
     *
     * @throws {Error} If the Diario was already opened.
     *
     * @returns {Promise<void>}
     */
    async open() {
        if (this.page !== undefined) {
            throw "Diario already opened"
        }
        this.page = await this.browser.newPage()
        await this.page.goto(WEBSITE_URL)
        await this.page.waitForSelector("#SC_data_cond", { state: "hidden" })
    }

    async _extractOptions(query) {
        return await this.page.evaluate(
            q => Array.from(
                document.querySelectorAll(q),
                i => ({ name: i.innerText, value: i.value })
            ).filter(i => i.name.trim() !== ''),
            query + ' > option'
        )
    }

    /**
     * Retrieves the available options for editions, entities, and cities
     * from the webpage.
     *
     * @returns {Promise<Object>} An object containing arrays of options for
     *                           editions, entities, and cities.
     */
    async getOptions() {
        return {
            'editions': await this._extractOptions('#SC_numedicao'),
            'entities': await this._extractOptions('#SC_nomeentidade'),
            'cities': await this._extractOptions('#SC_nomemunicipio'),
        }
    }

    /**
     * Fills the form on the webpage with the given options.
     * 
     * @param {{edition: {value: string}, city: {value: string}, entity: {value: string}}} options - The options to be filled in the form.
     * 
     * @returns {Promise<void>}
     */
    async fillForm({ edition, city, entity }) {
        await this.page.selectOption('select[name="numedicao"]', edition.value)
        await this.page.selectOption('select[name="nomeentidade"]', entity.value)
        await this.page.selectOption('select[name="nomemunicipio"]', city.value)
    }

    async waitPage() {
        try {
            await this.page.waitForLoadState('networkidle', { timeout: NETWORK_TIMEOUT })
        } catch (e) { }
    }


    async getResults() {
        // Carrega os primeiros resultados
        await this.page.click('a#sc_b_pesq_bot')
        await this.page.waitForSelector(this.iframeSelector, { state: "visible" })
        await this.waitPage()

        const loadSearchResults = (iframeSelector) => {
            const rows = document.querySelector(iframeSelector)
                .contentDocument
                .querySelectorAll("tr.scGridFieldEven, tr.scGridFieldOdd")
            return Array.from(rows, i => {
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

        const result = {}
        while (true) {
            const newResults = await this.page.evaluate(loadSearchResults, this.iframeSelector)
            newResults.forEach(i => { result[i.id] = i })
            if (newResults.length < MIN_RESULTS_PER_PAGE) {
                break
            }
            // FIXME: Essa função ainda retorna false as vezes mesmo já estando na
            //        última página de resultados.
            // Essa função vai tentar indicar se já chegou ao fim da busca
            const stop = await this.page.evaluate(
                (i) => {
                    const f = document.querySelector(i).contentDocument
                    if (f.querySelector('img#id_img_forward_bot').src.includes('off')) {
                        return true
                    }
                    f.querySelector('a#forward_bot').click()
                    return false
                },
                this.iframeSelector
            )
            if (stop) {
                break
            }
            await this.waitPage()
        }
        return Object.values(result)
    }

    /**
     * Reloads the current page.
     * 
     * @returns {Promise<void>}
     */
    async reload() {
        await this.page.reload()
    }

    /**
     * Closes the current page if it is open.
     *
     * @returns {Promise<void>}
     */
    async close() {
        if (this.page === undefined) return
        await this.page.close()
        this.page = undefined
    }
}