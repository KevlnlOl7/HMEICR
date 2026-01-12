# HMEICR API Specification

This document outlines the API endpoints for the HMEICR (Household Expense & E-Invoice Management) system.

## Authentication

### Register User
*   **URL:** `/register`
*   **Method:** `POST`
*   **Content-Type:** `application/x-www-form-urlencoded`
*   **Parameters:**
    *   `email`: User's email address.
    *   `password`: User's password.
*   **Response:**
    *   `201 Created`: `{"success": true, "message": "Registered successfully"}`
    *   `400 Bad Request`: `{"success": false, "message": "User already exists"}`

### Login User
*   **URL:** `/login`
*   **Method:** `POST`
*   **Content-Type:** `application/x-www-form-urlencoded`
*   **Parameters:**
    *   `email`: User's email.
    *   `password`: User's password.
*   **Response:**
    *   `200 OK`: `{"success": true, "message": "Login successful"}`
    *   `401 Unauthorized`: `{"success": false, "message": "Invalid credentials"}`

### Logout
*   **URL:** `/logout`
*   **Method:** `GET`
*   **Response:** Redirects to Login page.

## Receipts

### List Receipts
*   **URL:** `/receipt`
*   **Method:** `GET`
*   **Response:** `200 OK` (JSON Array of receipts)
    *   `_id`: Receipt ID
    *   `title`: Merchant/Title
    *   `amount`: Expense amount
    *   `currency`: Currency code (e.g., USD, TWD)
    *   `receipt_date`: Date string
    *   `owner_id`: User ID

### Create Receipt
*   **URL:** `/receipt/create`
*   **Method:** `POST`
*   **Parameters:**
    *   `title`: Name of receipt/merchant.
    *   `amount`: Expense amount.
    *   `currency`: Currency code.
    *   `receipt_date`: Date (YYYY-MM-DD).
*   **Response:**
    *   `201 Created`: `{"success": true, "message": "Receipt created"}`

### Edit Receipt
*   **URL:** `/receipt/<receipt_id>/edit`
*   **Method:** `POST`
*   **Parameters:**
    *   `title`, `amount`, `currency`, `receipt_date`
*   **Response:** Redirects to receipt list (or returns JSON list if fetch follows redirect).

### Delete Receipt
*   **URL:** `/receipt/<receipt_id>/delete`
*   **Method:** `POST`
*   **Response:** Redirects to receipt list.

## E-Invoice Integration

### Connect E-Invoice Account
*   **URL:** `/einvoice_login/create`
*   **Method:** `POST`
*   **Parameters:**
    *   `einvoice_username`: Mobile barcode/username.
    *   `einvoice_password`: Verification code/password.
*   **Response:**
    *   `201 Created`: `{"success": true, "message": "E-Invoice credentials saved"}`

### Get Carrier Invoices
*   **URL:** `/einvoice/carrier/invoices`
*   **Method:** `GET`
*   **Parameters:**
    *   `from`: Start Date (YYYY/MM/DD)
    *   `to`: End Date (YYYY/MM/DD)
    *   `page`: Page number (default 0)
    *   `size`: Page size (default 50)
*   **Response:** JSON object containing `content` (list of invoices) and `total` amount.
