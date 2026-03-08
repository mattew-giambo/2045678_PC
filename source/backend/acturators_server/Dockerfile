FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y libmariadb-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./src ./src
COPY ./requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

ENV PYHONPATH="/app/src"

EXPOSE 8000

CMD ["python", "src/main.py"]