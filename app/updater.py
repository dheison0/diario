import logging
from time import sleep

from app import CITIES, ENTITIES, SESSION_INTERVAL
from app.database import Database
from app.scrapper import Diario, SearchFormData


def update(db: Database):
    diario = Diario()
    edition = diario.getNewestEdition()
    for cityName in CITIES:
        city = diario.findCity(cityName)
        if city is None:
            logging.warning(f"City '{cityName}' not found!")
            continue
        for entityName in ENTITIES:
            entity = diario.findEntity(entityName)
            if entity is None:
                logging.warning(f"Entity '{entityName}' not found!")
                continue
            logging.info(f"Updating {entity.name} of {city.name}...")
            diario.sendQuery(SearchFormData(city, entity, edition))
            offset = 0
            while results := diario.loadResults(offset):
                [db.insertDocument(doc) for doc in results]
                if len(results) < 10:
                    break
                offset += len(results)
                sleep(2)
            sleep(5)
        sleep(SESSION_INTERVAL)
