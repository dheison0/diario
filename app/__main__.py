from time import sleep, time

from app import DATABASE_PATH, UPDATE_INTERVAL, sender, updater
from app.database import Database

DB = Database(DATABASE_PATH)


while True:
    start = time()
    updater.update(DB)
    sender.send(DB)
    sleep(max(UPDATE_INTERVAL - (time() - start), 0))
