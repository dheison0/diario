from dataclasses import dataclass, field
from typing import Literal

import requests
from bs4 import BeautifulSoup, Tag

from app import BASE_URL


@dataclass
class QueryItem:
    name: str
    value: str


@dataclass
class SearchFormData:
    city: QueryItem
    entity: QueryItem
    edition: QueryItem


@dataclass
class AvailableQueries:
    cities: list[QueryItem]
    entities: list[QueryItem]
    editions: list[QueryItem]


@dataclass
class Document:
    id: str
    edition: str
    date: str
    city: str
    entity: str
    category: str
    description: str
    url: str
    was_sent: bool = field(default=False)


class Diario:
    session: requests.Session
    authForm: dict[str, str]
    availableQueries: AvailableQueries
    defaultFormData = {
        "nmgp_opcao": "busca",
        "nomeentidade_cond": "eq",
        "nomemunicipio_cond": "eq",
        "codigo_cond": "eq",
        "nomedoc_cond": "qp",
        "numedicao_cond": "qp",
        "NM_operador": "and",
        "bprocessa": "pesq",
        "form_condicao": 3,
        "data_cond": "bw",
    }

    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False
        self.session.headers["Referer"] = BASE_URL
        self._initialLoad()

    def _getSelectOptions(self, soup: Tag, name: str) -> list[QueryItem]:
        return [
            QueryItem(option.text.strip(), option.get("value"))
            for option in soup.select(f"select[name='{name}'] option")
            if option.text.strip()
        ]

    def _initialLoad(self):
        response = self.session.get(BASE_URL)
        soup = BeautifulSoup(response.text, "lxml")
        self.authForm = {}
        self.authForm["script_case_init"] = soup.select_one(
            "input[name='script_case_init']"
        ).get("value")
        self.authForm["script_case_session"] = soup.select_one(
            "input[name='script_case_session']"
        ).get("value")
        self.availableQueries = AvailableQueries(
            cities=self._getSelectOptions(soup, "nomemunicipio"),
            entities=self._getSelectOptions(soup, "nomeentidade"),
            editions=self._getSelectOptions(soup, "numedicao"),
        )

    def _searchForQuery(
        self, where: Literal["cities", "entities", "editions"], what: str
    ) -> QueryItem | None:
        return (
            list(
                filter(
                    lambda i: what.lower() in i.name.lower(),
                    getattr(self.availableQueries, where),
                )
            )
            or [None]
        )[0]

    def findCity(self, title: str) -> QueryItem | None:
        return self._searchForQuery("cities", title)

    def findEntity(self, title: str) -> QueryItem | None:
        return self._searchForQuery("entities", title)

    def findEdition(self, title: str) -> QueryItem | None:
        return self._searchForQuery("editions", title)

    def getNewestEdition(self) -> QueryItem:
        return self.availableQueries.editions[0]

    def sendQuery(self, form: SearchFormData):
        response = self.session.post(
            BASE_URL,
            data={
                "nomeentidade": form.entity.value,
                "nomemunicipio": form.city.value,
                "numedicao": form.edition.value,
                **self.authForm,
                **self.defaultFormData,
            },
        )
        if response.status_code != 200:
            raise Exception("returned status code != 200")

    def _parse_document(self, row: Tag) -> Document:
        table_data = row.select("td")
        get_text = lambda idx: table_data[idx].text.strip()
        return Document(
            id=get_text(9),
            edition=get_text(1),
            date=get_text(3),
            city=get_text(4),
            entity=get_text(5),
            category=get_text(6),
            description=get_text(7),
            url=table_data[8].find("a").get("href").split("'")[1].strip(),
        )

    def loadResults(self, offset: int = 0):
        if offset == 0:
            response = self.session.get(
                url=BASE_URL, params={**self.authForm, "nmgp_opcao": "pesq"}
            )
            html = response.text
        else:
            response = self.session.post(
                url=BASE_URL,
                data={
                    **self.authForm,
                    "nmgp_opcao": "ajax_navigate",
                    "opc": "rec",
                    "parm": offset + 1,
                },
            )
            html = list(
                filter(
                    lambda i: i["field"] == "sc_grid_body", response.json()["setValue"]
                )
            )[0]["value"]
        open("page.html", "w").write(html)
        soup = BeautifulSoup(html, "lxml")
        try:
            table_rows = soup.select_one(".scGridTabela").select("tr")
        except:
            return []
        return [self._parse_document(row) for row in table_rows[1:]]
