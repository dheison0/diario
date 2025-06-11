import { FormOptions, SelectOption } from "./types";

/** Procure pela opção desejada em um array de opções */
export const findOption = (like: string, options: SelectOption[]) =>
  options.find((i) => i.name.toLowerCase().match(like.toLowerCase()));

/** Mostra as opções selecionadas do formulário na tela */
export const showOptions = (options: FormOptions) => {
  console.log("=".repeat(50));
  console.log("Informações selecionadas:");
  console.log(`  Cidade: "${options.city.name}"`);
  console.log(`  Entidade: "${options.entity.name}"`);
  console.log(`  Edição: "${options.edition.name}"`);
  console.log("=".repeat(50));
};

/** Aguarda por um intervalo de tempo */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
