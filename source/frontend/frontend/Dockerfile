FROM python:3.11-slim

WORKDIR /app

# Copia requirements e installa dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice
COPY . .

# Esponi la porta
EXPOSE 8005

# Avvia il server
CMD ["python", "main.py"]
