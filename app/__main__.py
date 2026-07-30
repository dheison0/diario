import logging
from time import sleep, time

from app import DATABASE_PATH, UPDATE_INTERVAL, sender, updater
from app.database import Database

DB = Database(DATABASE_PATH)


while True:
    start = time()
    try:
        updater.update(DB)
    except Exception as e:
        logging.warning("An exception occurred while updating cities.", e)
    try:
        sender.send(DB)
    except Exception as e:
        logging.warning("An exception occurred while sending updates.", e)
    sleep(max(UPDATE_INTERVAL - (time() - start), 1))
