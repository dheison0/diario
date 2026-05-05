import logging
from textwrap import dedent
from time import sleep

import requests

from app import (
    BOT_TOKEN,
    CHAT_ID,
    GEMINI_API_KEY,
    GEMINI_BASE_MODEL,
    GEMINI_SMALL_MODEL,
    TOPIC_RELATIONS,
)
from app.database import Database
from app.scrapper import Document
from google import genai

BASE_PROMPT = """
Siga exatamente estes passos:
  1. Localize a seção da {doc.entity} de {doc.city} com ID {doc.id}
  2. Dentro dela, encontre a "{doc.description}"
  3. Identifique:
     - PROMPT

Regras de resposta:
  - Responda apenas com base no conteúdo do documento
  - Se não encontrar a informação desejada, diga explicitamente que não encontrou
  - Não invente informações
  - Seja breve e direto ao ponto, sem rodeios

Formatação obrigatória:
  - Use apenas as seguintes tags HTML: <b>, <i>, <u>, <a>, <blockquote>
  - Não use markdown
"""

create_ai_prompt = lambda *args: BASE_PROMPT.replace(
    "PROMPT", "\n     - ".join(args)
).strip()

AI_MODEL_PROMPT_RELATIONS = {}
AI_MODEL_PROMPT_RELATIONS["portaria"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt(
        "Quem foi contratado.",
        "Qual cargo ira ocupar.",
        "Qual orgão contratou.",
    ),
)
AI_MODEL_PROMPT_RELATIONS["licitacao"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt(
        "Qual o objetivo da licitação.",
        "Quem foi o licitante.",
        "Qual empresa foi a vencedora(se houver).",
        "Qual o valor do contrato(se houver).",
    ),
)
AI_MODEL_PROMPT_RELATIONS["*"] = (
    GEMINI_BASE_MODEL,
    create_ai_prompt(
        "O que há de mais importante nesse documento?",
        "Quais os valores envolvidos(se houver)?",
        "Quem são as partes envolvidas(não precisa mencionar a prefeitura, apenas orgãos dela)(se houver)?",
    ),
)


def shf(text: str) -> str:
    """shf make Safe HTML Text"""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text


def create_basic_summary(doc: Document) -> tuple[str, int]:
    return (
        dedent(
            f"""
            <b>{shf(doc.category)} - {shf(doc.entity)} - {shf(doc.city)}</b>

            <blockquote>{shf(doc.description)}</blockquote>
            
            <b>ID:</b> <i>{shf(doc.id)}</i>
            <b>Edição:</b> <i>{shf(doc.edition)}</i>
            <b>Date:</b> <i>{shf(doc.date)}</i>

            <a href="{doc.url}">Fazer download ↗</a>
            """
        ),
        0,
    )


def create_ai_summary(doc: Document, retry: bool = True) -> tuple[str, int]:
    pdf_response = requests.get(doc.url)
    if pdf_response.status_code != 200:
        logging.warning(f"Failed to fetch PDF, status code: {pdf_response.status_code}")
        return create_basic_summary(doc)
    category = doc.category.strip().lower()
    model, summarization_prompt = AI_MODEL_PROMPT_RELATIONS.get(
        category if category in AI_MODEL_PROMPT_RELATIONS else "*"
    )
    summarization_prompt_formatted = summarization_prompt.format(doc=doc)
    ai_client = genai.Client(api_key=GEMINI_API_KEY)
    try:
        ai_summary = ai_client.models.generate_content(
            model=model,
            contents=[
                genai.types.Part.from_bytes(
                    data=pdf_response.content, mime_type="application/pdf"
                ),
                summarization_prompt_formatted,
            ],
        )
    except Exception as e:
        logging.error(f"Error generating AI summary: {e}")
        if retry:
            logging.info("Waiting 15 seconds before retrying...")
            sleep(15)
            return create_ai_summary(doc, retry=False)
        else:
            logging.info("Retry failed, falling back to basic summary.")
            return create_basic_summary(doc)
    summary_text = (
        f"<b>{shf(doc.category)} - {shf(doc.entity)} - {shf(doc.city)}</b>\n\n"
        + f"<blockquote>{shf(doc.description)}</blockquote>\n\n"
        + f"Resumo:\n{ai_summary.text.strip()}\n\n"
        + f'<a href="{doc.url}">Fazer download ↗</a>'
    )
    return summary_text, 20


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
        summary, wait_time = (
            create_ai_summary(doc) if GEMINI_API_KEY else create_basic_summary(doc)
        )
        if telegram_send(doc, summary):
            db.setDocumentAsSent(doc.id)
        sleep(wait_time or 2)
