import logging
from time import sleep

import requests

from app import BOT_TOKEN, CHAT_ID, GEMINI_API_KEY, TOPIC_RELATIONS
from app.database import Database
from app.scrapper import Document
from app.summarizer import create_ai_summary, create_basic_summary


def telegram_send(doc: Document, summary: str) -> bool:
    topic_id = TOPIC_RELATIONS.get(doc.category.strip().lower())
    response = requests.get(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        params={
            "chat_id": CHAT_ID,
            "text": summary,
            "parse_mode": "HTML",
            "message_thread_id": topic_id,
        },
    )
    if 300 > response.status_code >= 200:
        return True
    logging.error(
        f"Failed to send message for document ID {doc.id}, status code: {response.status_code}, response: {response.text}"
    )
    return False


def send(db: Database):
    docs = db.getDocumentsNotSent()
    for doc in docs:
        if GEMINI_API_KEY:
            try:
                summary, wait_time = create_ai_summary(doc)
            except Exception as e:
                logging.warning(
                    "Failed to create AI summary, falling back to basic summary.", e
                )
                summary, wait_time = create_basic_summary(doc)
        else:
            summary, wait_time = create_basic_summary(doc)

        if telegram_send(doc, summary):
            db.setDocumentAsSent(doc.id)
        sleep(wait_time or 2)
