import storage from 'node-persist'
import { DB_PATH } from './config.js'

export const init = async () => await storage.init({ dir: DB_PATH })

export const setLastUsedEdition = async (city, edition) => await storage.setItem(`@lue:${city.value}`, edition)
export const getLastUsedEdition = async (city) => await storage.getItem(`@lue:${city.value}`)

export const addCity = async (city) => await storage.setItem(`@cities:${city.value}:name`, city.name)
export const getCity = async (cityId) => ({ value: cityId, name: await storage.getItem(`@cities:${cityId}:name`) })

export const addDoc = async (city, doc) => await storage.setItem(`@docs:${city.value}:${doc.id}`, doc)
export const getDoc = async (city, docId) => await storage.getItem(`@docs:${city.value}:${docId}`)

export const getAllDocs = async (city) => await storage.valuesWithKeyMatch(`@docs:${city.value}`)
export const getAllCities = async () => {
    const cities = []
    await storage.forEach(async (i) => cities.push({ name: i.value, value: i.key }))
    return cities
}