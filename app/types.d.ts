export type SelectOption = {
  name: string
  value: string
}

export type AvailableOptions = {
  editions: SelectOption[]
  entities: SelectOption[]
  cities: SelectOption[]
}

export type FormOptions = {
  edition: SelectOption
  entity: SelectOption
  city: SelectOption
}

export type DiarioDocument = {
  id: string
  edition: string
  date: string
  category: string
  document: string
  file: string // URL de download do PDF
}