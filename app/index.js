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
  const jurema = new Diario(browser);
  await jurema.open();
  const options = await jurema.getOptions();

  const selectedOptions = {
    city: findOption("Jurema", options.cities),
    entity: findOption("Prefeitura", options.entities),
  };

  await updater(jurema, selectedOptions);
  setInterval(() => updater(jurema, selectedOptions), UPDATE_INTERVAL);
}

const updater = async (diario, formOptions) => {
  console.log("Atualizando...");
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
      if (await getDoc(doc.id)) continue;
      console.log("Enviando documento com id=" + doc.id + "...");
      await addDoc(formOptions.city, doc);
      await sendDoc(formOptions.city, doc);
      await delay(1500);
    }
  }
};

main();
