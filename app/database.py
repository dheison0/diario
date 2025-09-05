import logging
import sqlite3

from app.scrapper import Document

db_structure = """
CREATE TABLE IF NOT EXISTS documents(
    id TEXT UNIQUE PRIMARY KEY,
    edition TEXT,
    date TEXT,
    city TEXT,
    entity TEXT,
    category TEXT,
    description TEXT,
    url TEXT,
    was_sent BOOLEAN DEFAULT FALSE
);
"""


class Database:
    db: sqlite3.Connection

    def __init__(self, db_path: str):
        self.db = sqlite3.connect(db_path)
        logging.debug("Creating basic database structure if it doesn't exists...")
        self._exec(db_structure)

    def _exec(self, query: str, *args: list[any]) -> list[any]:
        logging.debug("Creating cursor and running query...")
        cursor = self.db.cursor()
        cursor.execute(query, args)
        result = cursor.fetchall()
        logging.debug("Saving any updated information...")
        self.db.commit()
        cursor.close()
        logging.debug("All done!")
        return result

    def insertDocument(self, doc: Document):
        logging.debug(f"Inserting new document with id={doc.id}...")
        try:
            self._exec(
                """
                INSERT INTO documents(id, edition, date, city, entity, category,
                                    description, url, was_sent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                doc.id,
                doc.edition,
                doc.date,
                doc.city,
                doc.entity,
                doc.category,
                doc.description,
                doc.url,
                doc.was_sent,
            )
        except sqlite3.IntegrityError:
            logging.warning(f"Document id={doc.id} already stored!")

    def getDocument(self, id: str) -> Document | None:
        logging.debug(f"Getting document with id={id}...")
        result = self._exec(
            "SELECT (id, edition, date, city, entity, category, description, url, was_sent) FROM documents WHERE id=?;",
            id,
        )
        return None if len(result) == 0 else Document(*result[0])

    def getDocumentsNotSent(self) -> list[Document]:
        logging.debug("Searching for documents that aren't sent at this time...")
        return [
            Document(*doc)
            for doc in self._exec(
                """SELECT id, edition, date, city, entity, category, description, url, was_sent
                FROM documents WHERE was_sent=false;"""
            )
        ]

    def setDocumentAsSent(self, id: str):
        logging.debug(f"Updating sent status of document.id={id} to true...")
        self._exec("UPDATE documents SET was_sent=true WHERE id=?;", id)
