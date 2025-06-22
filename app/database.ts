import storage from "node-persist"
import { DB_PATH } from "./config"
import { DiarioDocument, SelectOption } from "./types"

export const init = async () => await storage.init({ dir: DB_PATH })

export const setLastUsedEdition = async (city: SelectOption, edition: SelectOption) =>
  await storage.setItem(`@lue:${city.value}`, edition)

export const getLastUsedEdition = async (city: SelectOption): Promise<SelectOption | undefined> =>
  await storage.getItem(`@lue:${city.value}`)

export const addCity = async (city: SelectOption) =>
  await storage.setItem(`@cities:${city.value}:name`, city.name)

export const getCity = async (cityId: string): Promise<SelectOption | undefined> => {
  const name = await storage.getItem(`@cities:${cityId}:name`)
  if (!name) {
    return undefined
  }
  return { value: cityId, name }
}

export const addDoc = async (city: SelectOption, doc: DiarioDocument) =>
  await storage.setItem(`@docs:${city.value}:${doc.id}`, doc)

export const getDoc = async (city: SelectOption, docId: string): Promise<DiarioDocument | undefined> =>
  await storage.getItem(`@docs:${city.value}:${docId}`)

export const getAllDocs = async (city: SelectOption): Promise<DiarioDocument[]> =>
  await storage.valuesWithKeyMatch(`@docs:${city.value}`)

export const getAllCities = async (): Promise<SelectOption[]> => {
  const cities: SelectOption[] = []
  await storage.forEach(i => { cities.push({ name: i.value, value: i.key }) })
  return cities
}
