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
    return this.db[key]
  }

  /** Insere um item no banco de dados */
  async setItem(key: string, value: any): Promise<void> {
    this.db[key] = value
    await this.flush()
  }

  /** Remove um item do banco de dados */
  async removeItem(key: string): Promise<void> {
    delete this.db[key]
    await this.flush()
  }
}

let storage: Storage

export const init = async () => {
  storage = new Storage(DB_PATH)
  await storage.load()
}

export const setLastUsedEdition = async (city: SelectOption, edition: SelectOption) =>
  await storage.setItem(`@lue:${city.value}`, edition)

export const getLastUsedEdition = (city: SelectOption): SelectOption | undefined =>
  storage.getItem(`@lue:${city.value}`)

export const addDoc = async (city: SelectOption, doc: DiarioDocument) =>
  await storage.setItem(`@docs:${city.value}:${doc.id}`, doc)

export const getDoc = (city: SelectOption, docId: string): DiarioDocument | undefined =>
  storage.getItem(`@docs:${city.value}:${docId}`)
