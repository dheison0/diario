import logging
from time import sleep

from app import CITIES, ENTITIES, SESSION_INTERVAL
from app.database import Database
from app.scrapper import Diario, QueryItem, SearchFormData


def update_city(diario: Diario, db: Database, edition: QueryItem, city: QueryItem):
    for entityName in list(ENTITIES):
        entity = diario.findEntity(entityName)
        if entity is None:
            ENTITIES.remove(entityName)
            logging.warning(f"Entity '{entityName}' not found! Removed from list.")
            continue

        logging.info(f"Updating {entity.name} of {city.name}...")
        diario.sendQuery(SearchFormData(city, entity, edition))
        results = {}
        while response := diario.loadResults(len(results)):
            # Sometimes server sends the same response as if it was with offset=0 even it being bigger than 10
            if response[0].id in results:
                break
            results.update({i.id: i for i in response})
            # Server always sends a maximum amount of items equals 10, if it response is less -> there's no more items
            if len(response) < 10:
                break
            sleep(2)
        [db.insertDocument(doc) for doc in results.values()]
        sleep(5)


def update(db: Database):
    diario = Diario()
    edition = diario.getNewestEdition()
    for cityName in list(CITIES):
        city = diario.findCity(cityName)
        if city is None:
            CITIES.remove(cityName)
            logging.warning(f"City '{cityName}' not found! Removed from list.")
            continue
        update_city(diario, db, edition, city)
        sleep(SESSION_INTERVAL)
