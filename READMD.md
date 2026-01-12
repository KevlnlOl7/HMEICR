# HMEICR Project Setup Guide

This guide explains how to set up the backend (Flask + MongoDB) and the frontend (React).

## Prerequisites
- Python 3.11+
- Node.js & npm
- Docker & Docker Compose (optional, for easy backend setup)

---

## 1. Backend Setup

You can run the backend using **Docker** (recommended) or **Manually**.

### Configuration (.env)
First, generate the necessary environment variables.

1. Create a `.env` file in the root directory.
2. Generate a connection key and secret key:
   ```bash
   # Install cryptography if you haven't
   python -m pip install cryptography
   
   # Generate a Fernet key
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
3. Add the keys to your `.env` file:
   ```env
   # .env
   EINVOICE_SECRET_KEY=paste_your_generated_key_here
   MONGO_APP_PASSWORD=password123
   secret_key=your_flask_secret_key
   ```

### Option A: Run with Docker (Recommended)
This will set up both the Flask server and the MongoDB database automatically.

```bash
docker-compose up --build
```
The server will be available at `http://localhost:8080`.

### Option B: Run Manually

1. **Start MongoDB**: Ensure you have a MongoDB instance running locally on port `27017`.
   
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Server**:
   ```bash
   python server.py
   ```
The server will run on `http://localhost:5000` (default Flask port).

---

## 2. Frontend Setup (React)

The `client` directory is reserved for the frontend application. Here is how to set up a React app using Vite.

### Initialize React App
If the `client` folder is empty, initialize it:

```bash
cd client
npm create vite@latest . -- --template react
npm install
```

### Install Common Dependencies
You might need these packages for a standard dashboard app:

```bash
npm install axios react-router-dom
# Optional: Install TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Run the Frontend
Start the development server:

```bash
npm run dev
```
The frontend will typically run on `http://localhost:5173`.

### Connecting to Backend
Ensure your React app's API calls point to the backend URL (e.g., `http://localhost:8080` if using Docker, or `http://localhost:5000` manually). You may need to configure a proxy in `vite.config.js` to avoid CORS issues during development:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // or http://localhost:5000
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // ... rest of config
})
```
