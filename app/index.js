import playwright from "playwright";
import { Diario } from "./diario.js";
import { delay, findOption } from "./utils.js";
import {
  init as initDB,
  getLastUsedEdition,
  setLastUsedEdition,
  addDoc,
  getDoc,
} from "./database.js";
import { sendDoc } from "./bot.js";
import { UPDATE_INTERVAL } from "./config.js";

async function main() {
  // Inicializa a base das pesquisas
  const browser = await playwright.chromium.launch({ headless: true });
  await initDB();

  const cities = { Jurema: {}, "Anisio de Abreu": {}, Caracol: {} };

  for (const cityName in cities) {
    console.log(`Iniciando configuração de ${cityName}...`);
    const diario = new Diario(browser);
    await diario.open();
    const options = await diario.getOptions();
    const selectedOptions = {
      city: findOption(cityName, options.cities),
      entity: findOption("Prefeitura", options.entities),
    };
    cities[cityName] = { diario, options: selectedOptions };
  }

  while (true) {
    for (const city of Object.values(cities)) {
      try {
        await updater(city.diario, city.options);
      } catch (err) {
        console.log(`Erro na atualização de ${city.options.city.name}`);
        console.error(err);
      }
    }
    console.log("Esperando para próxima rodada de atualizações...")
    await delay(UPDATE_INTERVAL);
  }
}

const updater = async (diario, formOptions) => {
  console.log(`Atualizando ${formOptions.city.name}...`);
  await diario.reload();

  let { editions } = await diario.getOptions();
  editions = editions.slice(0, 10); // limita as edições ate 10
  editions.reverse(); // Ordena do mais velho para o mais novo

  const lastUsedEdition = await getLastUsedEdition(formOptions.city);
  const lastUsedEditionIdx = editions.findIndex(
    (i) => i.value == lastUsedEdition?.value
  );
  if (lastUsedEditionIdx !== -1) {
    editions = editions.slice(lastUsedEditionIdx);
  }

  for (const edition of editions) {
    console.log("Buscando ações...");
    await diario.fillForm({ edition, ...formOptions });
    const results = await diario.getResults();
    setLastUsedEdition(formOptions.city, edition);
    for (const doc of results) {
      if (await getDoc(formOptions.city, doc.id)) continue;
      console.log(`Enviando documento com id=${doc.id}...`);
      await addDoc(formOptions.city, doc);
      try {
        await sendDoc(formOptions.city, doc);
      } catch (err) {
        console.log("Envio atrasado para mais tarde...");
        setTimeout(
          () => sendDoc(formOptions.city, doc),
          err.response.body.parameters.retry_after * 1200
        );
      }
      await delay(1500);
    }
  }
  console.log("Fim da atualização de "+formOptions.city.name+".")
};

main();
