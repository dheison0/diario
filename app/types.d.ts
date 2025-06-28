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
  edition: SelectOption | null
  city: SelectOption | null
  entity: SelectOption | null
  date: string
  category: string
  description: string
  url: string // URL de download do PDF
  sent: boolean
}