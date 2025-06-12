# Diario

Bot do telegram criado especialmente para enviar todos os documentos que são inseridos no Diario Dos Municipios de qualquer cidade do Brasil para um chat especifico do Telegram.

# Configuração

## Variáveis de ambiente

As variáveis podem ser definidas em um arquivo `.env`

- `DB_PATH` Local onde os dados serão salvos;
- `BOT_TOKEN` Token do bot no Telegram(use o [@BotFather](https://t.me/BotFather) para criar um);
- `CHAT_ID` Identificador do chat que você deseja receber os documentos(seu ou de algum canal/grupo, use o [@GetIDcnBot](https://t.me/GetIDcnBot))


## Executar localmente

Instale as dependências do projeto e as do PlayWright:

```bash
npm install
npx playwright \
    install \
    --with-deps \
    --only-shell `# Opcional, apenas caso não queria usar a interface gráfica`
    chromium
```

Compile e coloque o projeto para rodar:

```bash
npm run build
node app.bundle.js
# Ou
npm run start
```

## Executar com o Docker

Clone o repositório e construia o container:

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
