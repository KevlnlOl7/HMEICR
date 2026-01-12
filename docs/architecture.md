# System Architecture

HMEICR follows a client-server architecture containerized with Docker.

```mermaid
graph TD
    Client[Vanilla JS Frontend] -->|HTTP/REST| Flask[Flask Backend]
    Flask -->|Reads/Writes| MongoDB[(MongoDB Database)]
    Flask -->|Authenticates| EInvoiceAPI[External E-Invoice API]

    subgraph Docker Network
        Flask
        MongoDB
        ClientContainer[Client Container (Vite/Proxy)]
    end

    ClientContainer -->|Proxy /api| Flask
```

## Components

1.  **Frontend (Client)**
    *   **Tech Stack**: HTML5, Vanilla JavaScript, CSS3.
    *   **Hosting**: Served via Vite development server (Development) or Nginx (Production).
    *   **Role**: Handles user interaction, renders receipts, manages state (login/logout).

2.  **Backend (Server)**
    *   **Tech Stack**: Python, Flask.
    *   **Role**:
        *   API Provider (`/api/*`).
        *   Authentication (Flask-Login, Werkzeug Security).
        *   Business Logic (Receipt management, E-Invoice bridging).

3.  **Database**
    *   **Tech Stack**: MongoDB.
    *   **Role**: Persists User data, Receipts, and E-Invoice credentials.

4.  **External Service**
    *   **Ministry of Finance E-Invoice Platform**: Accessed via `EInvoiceAuthenticator` module to fetch real-world invoice data.
