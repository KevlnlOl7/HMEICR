FROM python:3.11-slim

WORKDIR /app

# 1. Copy only requirements first
COPY requirements.txt .

# 2. Install dependencies (cached if requirements.txt unchanged)
RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# 3. Copy the rest of the app
COPY . .

RUN chmod -R a+r /app

CMD ["python", "server.py"]
