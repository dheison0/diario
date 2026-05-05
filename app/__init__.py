import logging
import warnings
from os import getenv

from dotenv import load_dotenv
from urllib3.exceptions import InsecureRequestWarning

load_dotenv()

BOT_TOKEN = getenv("BOT_TOKEN")
if BOT_TOKEN is None:
    raise ValueError("BOT_TOKEN not set!")
CHAT_ID = getenv("CHAT_ID")
if CHAT_ID is None:
    raise ValueError("CHAT_ID not set!")
GEMINI_API_KEY = getenv("GEMINI_API_KEY")
if GEMINI_API_KEY is None:
    logging.warning("GEMINI_API_KEY not set! AI summaries will be disabled.")

TOPIC_RELATIONS_SCHEMA = getenv("TOPIC_RELATIONS")
TOPIC_RELATIONS = {}
if TOPIC_RELATIONS_SCHEMA is not None:
    for relations in TOPIC_RELATIONS_SCHEMA.split(","):
        topic, topic_id = [i.strip() for i in relations.split(":")]
        TOPIC_RELATIONS[topic] = topic_id

MINUTE = 60

UPDATE_INTERVAL = int(getenv("UPDATE_INTERVAL", 30)) * MINUTE
SESSION_INTERVAL = int(getenv("SESSION_INTERVAL", 1)) * MINUTE
DATABASE_PATH = getenv("DATABASE_PATH", ":memory:")
CITIES = getenv("CITIES", "Sao Raimundo Nonato|Floriano").split("|")
ENTITIES = getenv("ENTITIES", "Prefeitura|Camara").split("|")
BASE_URL = "https://www.diarioficialdosmunicipios.org/consulta/ConPublicacaoGeral/ConPublicacaoGeral.php"
GEMINI_BASE_MODEL = getenv("GEMINI_BASE_MODEL", "gemini-2.5-flash")
GEMINI_SMALL_MODEL = getenv("GEMINI_SMALL_MODEL", "gemini-3.1-flash-lite-preview")

logging.basicConfig(
    level=logging.DEBUG if getenv("DEBUG") else logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%d-%m-%Y - %H:%M:%S",
)
warnings.simplefilter("ignore", InsecureRequestWarning)
