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

MINUTE = 60

UPDATE_INTERVAL = int(getenv("UPDATE_INTERVAL", 30)) * MINUTE
SESSION_INTERVAL = int(getenv("SESSION_INTERVAL", 1)) * MINUTE
DATABASE_PATH = getenv("DATABASE_PATH", ":memory:")
CITIES = getenv("CITIES", "Sao Raimundo Nonato|Floriano").split("|")
ENTITIES = getenv("ENTITIES", "Prefeitura|Camara").split("|")
BASE_URL = "https://www.diarioficialdosmunicipios.org/consulta/ConPublicacaoGeral/ConPublicacaoGeral.php"

logging.basicConfig(
    level=logging.DEBUG if getenv("DEBUG") else logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%d-%m-%Y - %H:%M:%S",
)
warnings.simplefilter("ignore", InsecureRequestWarning)
