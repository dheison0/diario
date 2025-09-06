FROM python:3.13-alpine
WORKDIR /src
VOLUME [ "/database" ]
ENV DATABASE_PATH="/database/diario.db"
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-m", "app"]