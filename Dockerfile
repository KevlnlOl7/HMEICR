# Stage 1: Build the React Frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Flask Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies if needed (none strictly for pure python/flask here)
# RUN apt-get update && apt-get install -y ...

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

# Copy built frontend from Stage 1
COPY --from=build /app/dist ./client/dist

# Expose the Flask port
EXPOSE 5000

# Environment variables (can be overridden)
ENV FLASK_APP=server.py
ENV FLASK_ENV=production

CMD ["python", "server.py"]
