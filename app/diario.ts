import { Browser, Page } from "playwright"
import {
  MIN_RESULTS_PER_PAGE,
  NETWORK_TIMEOUT,
  WEBSITE_URL,
} from "./config"
import { AvailableOptions, DiarioDocument, FormOptions, SelectOption } from "./types"

const AlreadyOpened = new Error("Website já está aberto!")

/**
 * Classe responsável pelo controle total da página do Diário dos Municipios
 * onde se encontra informações sobre o que os politicos "estão fazendo" em
 * determinada cidade do Brasil.
 */
export class Diario {
  private browser: Browser
  private page: Page | null = null
  private iframeSelector = 'iframe[id="nmsc_iframe_ConPublicacaoGeral"]:not([src=""])'

  /**
   * Inicializa uma nova aba com o controle do website Diario Dos Municipios
  */
  constructor(browser: Browser) {
    this.browser = browser
  }

  /**
   * Carrega a página do diário para que ele possa ser utilizado
   */
  async load() {
    if (this.page !== null) {
      throw AlreadyOpened
    }
    this.page = await this.browser.newPage()
    await this.page.goto(WEBSITE_URL)
    await this.page.waitForSelector("#SC_data_cond", { state: "hidden" })
  }

  async _extractOptions(query: string): Promise<SelectOption[]> {
    return await this.page!.evaluate(
      (q) =>
        Array.from(
          document.querySelectorAll<HTMLOptionElement>(q),
          (i) => ({ name: i.innerText, value: i.value, })
        ).filter((i) => i.name.trim() !== ""),
      query + " > option"
    )
  }

  /**
   * Obter a lista de edições, entidades e cidades disponiveis para pesquisa
   */
  async getOptions(): Promise<AvailableOptions> {
    return {
      editions: await this._extractOptions("#SC_numedicao"),
      entities: await this._extractOptions("#SC_nomeentidade"),
      cities: await this._extractOptions("#SC_nomemunicipio"),
    }
  }

  /**
   * Preenche o formulário de pesquisa das informações
   */
  async fillForm({ edition, city, entity }: FormOptions) {
    const [editionInput, entityInput, cityInput] = await Promise.all([
      this.page!.$('select[name="numedicao"]'),
      this.page!.$('select[name="nomeentidade"]'),
      this.page!.$('select[name="nomemunicipio"]')
    ])
    await editionInput!.selectOption({ value: edition.value })
    await entityInput!.selectOption({ value: entity.value })
    await cityInput!.selectOption({ value: city.value })
  }

  /**
   * Aguarda por a página parar de puxar dados da internet ou ate estourar o tempo limite
  */
  async waitPage() {
    try {
      await this.page!.waitForLoadState("networkidle", {
        timeout: NETWORK_TIMEOUT,
      })
    } catch { }
  }

  /**
   * Obtem os resultados da pesquisa conforme o que foi preenchido no `Diario.fillForm`
  */
  async getResults() {
    // Carrega os primeiros resultados
    await this.page!.click("a#sc_b_pesq_bot")
    await this.page!.waitForSelector(this.iframeSelector, { state: "visible" })
    await this.waitPage()

    const loadSearchResults = (iframeSelector: string): DiarioDocument[] => {
      const rows = document
        .querySelector<HTMLIFrameElement>(iframeSelector)!
        .contentDocument!.querySelectorAll(
          "tr.scGridFieldEven, tr.scGridFieldOdd"
        )
      return Array.from(rows, (i) => {
        const cells = i.querySelectorAll("td")
        return {
          id: cells[cells.length - 1].innerText.trim(),
          edition: cells[1].innerText.trim(),
          date: cells[3].innerText.trim(),
          category: cells[6].innerText.trim(),
          document: cells[7].innerText.trim(),
          file: cells[8].querySelector("a")!.href.split("'")[1].trim(),
        }
      })
    }

    const result = new Map<string, DiarioDocument>()
    while (true) {
      const newResults = await this.page!.evaluate(
        loadSearchResults,
        this.iframeSelector
      )
      newResults.forEach((i) => result.set(i.id, i))
      if (newResults.length < MIN_RESULTS_PER_PAGE) {
        break
      }
      // FIXME: Essa função ainda retorna false as vezes mesmo já estando na
      //        última página de resultados.
      // Essa função vai tentar indicar se já chegou ao fim da busca
      const stop = await this.page!.evaluate((i) => {
        const iframe = document.querySelector<HTMLIFrameElement>(i)!.contentDocument!
        if (iframe.querySelector<HTMLImageElement>("img#id_img_forward_bot")!.src.includes("off")) {
          return true
        }
        iframe.querySelector<HTMLAnchorElement>("a#forward_bot")!.click()
        return false
      }, this.iframeSelector)
      if (stop) {
        break
      }
      await this.waitPage()
    }
    return result.values()
  }

  /**
   * Recarrega a página para obter novas opções
   */
  async reload() {
    await this.page!.reload()
    await this.page!.waitForLoadState("networkidle")
  }

  /**
   * Fecha a aba do navegador
   */
  async close() {
    if (this.page === null) return
    await this.page!.close()
    this.page = null
  }
}
