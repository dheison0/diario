/**
 * Searches for an option object within an array of options that matches
 * a given string pattern, ignoring case.
 *
 * @param {string} like - The string pattern to match against the names of the options.
 * @param {Array<{name: string}>} options - An array of option objects, each containing a name property.
 * @returns {Object|undefined} The first option object that matches the pattern, or undefined if no match is found.
 */
export const findOption = (like, options) =>
  options.find((i) => i.name.toLowerCase().match(like.toLowerCase()));

/**
 * Prints the selected options to the console.
 *
 * @param {{city: {name: string}, entity: {name: string}, edition: {name: string}}} options - An object containing the selected options.
 * @returns {void}
 */
export const showOptions = (options) => {
  console.log("=".repeat(50));
  console.log("Informações selecionadas:");
  console.log(`  Cidade: "${options.city.name}"`);
  console.log(`  Entidade: "${options.entity.name}"`);
  console.log(`  Edição: "${options.edition.name}"`);
  console.log("=".repeat(50));
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
