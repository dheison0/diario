import logging
from textwrap import dedent
from time import sleep

import requests
from google import genai

from app import GEMINI_API_KEY, GEMINI_BASE_MODEL, GEMINI_SMALL_MODEL
from app.scrapper import Document

AI_MODEL_INTERVAL = 15

BASE_PROMPT = """
Você é um extrator de dados automatizado. Sua função é retornar APENAS os dados solicitados, sem preâmbulos, saudações ou conversas.

INSTRUÇÕES DE EXECUÇÃO:
  1. Localize a seção da {doc.entity} de {doc.city} com ID {doc.id};
  2. Dentro dela, encontre a "{doc.description}";
  3. Identifique: (PROMPT)
  4. Ao final, explique em poucas palavras e de forma simples o que é "{doc.description}".

REGRAS RÍGIDAS DE RESPOSTA:
  - Responda APENAS com base no conteúdo do documento.
  - NÃO INVENTE INFORMAÇÕES.
  - PROIBIÇÃO DE INTRODUÇÕES: É ESTRITAMENTE PROIBIDO iniciar a resposta com frases como "De acordo com...", "Com base no...", "Segundo o documento...", "Conforme informado...", "A resposta é..." ou qualquer tipo de saudação. 
  - COMECE DIRETAMENTE: O primeiro caractere da sua resposta já deve ser a informação solicitada.
  - TRATAMENTO DE INFORMAÇÕES AUSENTES:
    - Se não encontrar uma informação solicitada, mas existirem respostas para as outras perguntas, omita a pergunta sem resposta e responda as demais.
    - Se nenhuma informação solicitada for encontrada, gere apenas um resumo breve da seção identificada acima.

REGRAS DE FORMATAÇÃO (LEIA COM ATENÇÃO):
  - PERMITIDAS EXCLUSIVAMENTE AS SEGUINTES TAGS: <b>, <i>, <u>, <a>, <blockquote>.
  - PROIBIDO O USO DE <br> OU <br/>: Para quebrar linhas ou criar parágrafos, use APENAS quebras de linha normais (Enter / \n). Nunca insira a tag <br>.
  - PROIBIDA QUALQUER OUTRA TAG HTML (ex: <p>, <div>, <span>, <h1>, etc.).
"""


def create_ai_prompt(*args: str | list[str]):
    prompt = ""
    for arg in args:
        if isinstance(arg, list):
            prompt += "".join([f"\n      - {i}" for i in arg])
        else:
            prompt += f"\n    - {arg}"
    return BASE_PROMPT.replace("(PROMPT)", prompt)


AI_MODEL_PROMPT_RELATIONS: dict[str, tuple[str, str]] = {}
AI_MODEL_PROMPT_RELATIONS["portaria"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt(
        "Quem foi contratado?",
        "Qual cargo ira ocupar?",
        "Qual órgão contratou?",
    ),
)
AI_MODEL_PROMPT_RELATIONS["licitacao"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt(
        "Caso seja uma contratação:",
        [
            "Qual o objetivo da licitação?",
            "Quem foi o órgão municipal contratante?",
            "Qual empresa foi contratada?",
            "Qual o valor do contrato?",
            "Qual o tempo de vigência?",
        ],
        "Caso seja um termo de revogação:",
        [
            "De qual licitação estamos falando?",
            "Quais os motivos para a revogação?",
        ],
    ),
)
AI_MODEL_PROMPT_RELATIONS["decreto"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt("O que foi decretado?"),
)
AI_MODEL_PROMPT_RELATIONS["lei"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt("O que a lei define?"),
)
AI_MODEL_PROMPT_RELATIONS["edital"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt(
        "Qual o objetivo do edital?",
        "No caso de ser para:",
        [
            "Concurso: Quais são os cargos e carga horária?",
            "Seletivo: Quais são os cargos, carga horária e quanto tempo dura o contrato?",
            "Licitação: Qual o objetivo da licitação?",
            "Chamamento: Quem foi chamado?",
            "Outro: Descreva brevemente sobre o que ele trata.",
        ],
    ),
)
AI_MODEL_PROMPT_RELATIONS["contrato"] = (
    GEMINI_SMALL_MODEL,
    create_ai_prompt(
        "Quem foi contratado?",
        "Quem contratou?",
        "Quais os valores envolvidos?",
        "Qual o tempo de vigência do contrato?",
    ),
)
AI_MODEL_PROMPT_RELATIONS["*"] = (
    GEMINI_BASE_MODEL,
    create_ai_prompt(
        "O que há de mais importante nesse documento?",
        "Quais os valores envolvidos?",
        "Quem são as partes envolvidas(órgãos municipais, empresas ou pessoas)?",
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
        dedent(f"""
            <b>{shf(doc.category)} - {shf(doc.entity)} - {shf(doc.city)}</b>

            <blockquote>{shf(doc.description)}</blockquote>
            
            <b>ID:</b> <i>{shf(doc.id)}</i>
            <b>Edição:</b> <i>{shf(doc.edition)}</i>
            <b>Date:</b> <i>{shf(doc.date)}</i>

            <a href="{doc.url}">Fazer download ↗</a>
            """),
        0,
    )


def create_ai_summary(doc: Document, retry: int = 0) -> tuple[str, int]:
    pdf_response = requests.get(doc.url)
    if pdf_response.status_code != 200:
        logging.warning(f"Failed to fetch PDF, status code: {pdf_response.status_code}")
        return create_basic_summary(doc)

    category = doc.category.strip().lower()
    model, summarization_prompt = AI_MODEL_PROMPT_RELATIONS[
        category if category in AI_MODEL_PROMPT_RELATIONS else "*"
    ]
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
        if retry < 2:
            retry += 1
            logging.info(
                f"Waiting {AI_MODEL_INTERVAL} seconds before retrying ({retry})..."
            )
            sleep(AI_MODEL_INTERVAL)
            return create_ai_summary(doc, retry)
        else:
            logging.info("Retry failed, falling back to basic summary.")
            return create_basic_summary(doc)
    ai_text = str(ai_summary.text).strip()
    ai_text = ai_text.replace("<br>", "\n").replace("<br/>", "\n")
    summary_text = "\n".join(
        [
            f"<b>{shf(doc.category)} - {shf(doc.entity)} - {shf(doc.city)}</b>",
            f"<blockquote>{shf(doc.description)}</blockquote>\n",
            "Resumo:",
            ai_text,
            f'\n<a href="{doc.url}">PDF completo ↗</a>',
        ]
    )
    return summary_text.strip(), AI_MODEL_INTERVAL
