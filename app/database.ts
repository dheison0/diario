import { Stats } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { DB_PATH } from "./config"
import { DiarioDocument, SelectOption } from "./types"

class Storage {
  private file: string
  private db: { [key: string]: any }

  constructor(dir: string) {
    this.file = path.join(dir, "db.json")
    this.db = {}
  }

  async load(): Promise<void> {
    let data: string
    try {
      data = await fs.readFile(this.file, "utf-8")
    } catch (err: Error | any) {
      if (err.code !== "ENOENT") throw err
      data = "{}"
    }
    this.db = JSON.parse(data)
  }

  async flush(): Promise<void> {
    let stat: Stats
    try {
      stat = await fs.stat(this.file)
    } catch (err: Error | any) {
      if (err.code !== "ENOENT") throw err
      await fs.mkdir(path.dirname(this.file), { recursive: true })
      await fs.writeFile(this.file, "{}")
      stat = await fs.stat(this.file)
    }
    if (!stat.isFile()) {
      throw new Error(`${this.file} is not a file`)
    }
    const data = JSON.stringify(this.db)
    await fs.writeFile(this.file, data)
  }

  /** Obtém um item do banco de dados */
  getItem<T>(key: string): T {
    return structuredClone(this.db[key])
  }

  /** Insere um item no banco de dados */
  async setItem(key: string, value: any): Promise<void> {
    this.db[key] = structuredClone(value)
    await this.flush()
  }

  /** Remove um item do banco de dados */
  async removeItem(key: string): Promise<void> {
    delete this.db[key]
    await this.flush()
  }

  /** Encontra chaves que iniciem com um prefixo */
  findKeysByPrefix(prefix: string): string[] {
    return Object.keys(this.db).filter((key) => key.startsWith(prefix))
  }
}

let storage: Storage

export const init = async () => {
  storage = new Storage(DB_PATH)
  await storage.load()
}

/** Define a última edição usada para uma cidade */
export const setLastUsedEdition = async (city: SelectOption, entity: SelectOption, edition: SelectOption) =>
  await storage.setItem(`@lue:${city.value}:${entity.value}`, edition)

/** Obtém a última edição usada por uma cidade */
export const getLastUsedEdition = (city: SelectOption, entity: SelectOption): SelectOption | undefined =>
  storage.getItem(`@lue:${city.value}:${entity.value}`)

/** Adiciona ou atualiza um documento */
export const setDocument = async (document: DiarioDocument) =>
  await storage.setItem(`@docs:${document.id}`, document)

/** Obtém um documento */
export const getDocument = (docId: string): DiarioDocument | undefined =>
  storage.getItem(`@docs:${docId}`)

/** Remove um documento */
export const removeDocument = async (docId: string) => await storage.removeItem(`@docs:${docId}`)

/** Obtém todos os documentos */
export const getAllDocuments = (): DiarioDocument[] =>
  storage.findKeysByPrefix(`@docs`).map((i) => storage.getItem(i)!)