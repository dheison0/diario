from time import sleep

from app import CITIES, ENTITIES, SESSION_INTERVAL
from app.database import Database
from app.scrapper import Diario, SearchFormData


def update(db: Database):
    diario = Diario()
    edition = diario.getNewestEdition()
    for cityName in CITIES:
        city = diario.findCity(cityName)
        for entityName in ENTITIES:
            entity = diario.findEntity(entityName)
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
