# Diario Oficial dos Municípios

<center>
  <img width="200" src="https://i.imgur.com/hLrLXkC.png" />
</center>

Bot criado especialmente para enviar os documentos inseridos no Diário Oficial dos Municípios do Piauí para o Telegram e futuramente Instagram!

> O Brasil só vai crescer quando o povo souber onde seu dinheiro está "sendo gasto" e cobrar por isso!

# Configuração

## Variáveis de ambiente

As variáveis podem ser definidas em um arquivo `.env`

- `BOT_TOKEN` Token do bot no Telegram(use o [@BotFather](https://t.me/BotFather) para criar um);
- `CHAT_ID` Identificador do chat que você deseja receber os documentos(seu ou de algum canal/grupo, use o [@GetIDcnBot](https://t.me/GetIDcnBot))
- `TOPIC_RELATIONS` Relacionamento de categorias de documentos com o ID do tópico no grupo
  - Para utiliza-lo, você primeiro indica qual a categoria de documentos, usa dois pontos(`:`) para separar e indica o ID do tópico, para adicionar mais de um tópico basta separa-los por virgula(exemplo: `licitacao:1234,portaria:4321`)
- `CITIES` Cidades onde deve ser buscado as informações(separe por `|`), padrão: Sao Raimundo Nonato e Floriano;
- `ENTITIES` Entidades que você quer ver os documentos(separe por `|`), padrão: prefeitura e camara;
- `DATABASE_PATH` Local onde os dados serão salvos, defina o nome do arquivo, é um [SQLite3](https://sqlite.org), padrão: memória;
- `UPDATE_INTERVAL` Intervalo de atualizações completas em minutos, padrão: 30;
- `SESSION_INTERVAL` Intervalo entre a atualização das cidades em minutos, padrão: 1.


## Executar com o Docker

Clone o repositório e construa o container:

```bash
git clone --depth=1 https://github.com/dheison0/diario
cd diario
docker build -t diario .
```

Coloque o container para executar:

```bash
docker run -d \
    --name diario \
    --env-file=.env \
    --restart unless-stopped \
    diario:latest
```
