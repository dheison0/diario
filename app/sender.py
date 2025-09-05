from textwrap import dedent
from time import sleep

import requests

from app import BOT_TOKEN, CHAT_ID
from app.database import Database
from app.scrapper import Document


def shf(text: str) -> str:
    """shf make Safe HTML Text"""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text


def telegram_send(doc: Document):
    message = dedent(
        f"""
        <b>{shf(doc.category)} - {shf(doc.entity)} - {shf(doc.city)}</b>

        <blockquote>{shf(doc.description)}</blockquote>
        
        <b>ID:</b> <i>{shf(doc.id)}</i>
        <b>Edição:</b> <i>{shf(doc.edition)}</i>
        <b>Date:</b> <i>{shf(doc.date)}</i>

        <a href="{doc.url}">Fazer download ↗</a>
        """
    )
    response = requests.get(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        params={"chat_id": CHAT_ID, "text": message, "parse_mode": "HTML"},
    )
    return 300 > response.status_code >= 200


def send(db: Database):
    docs = db.getDocumentsNotSent()
    for doc in docs:
        if telegram_send(doc):
            db.setDocumentAsSent(doc.id)
        sleep(1.5)
