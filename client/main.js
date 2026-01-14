// Import validation functions
import { validateEmail, validatePassword, showValidationError, clearAllValidationErrors } from './validators.js';

// Import XSS protection utilities
import { setTextSafely, sanitizeCurrency, sanitizeAmount } from './xss-protection.js';

// State
let currentUser = null;
let csrfToken = null;

// Fetch CSRF token on page load
async function fetchCSRFToken() {
    try {
        const res = await fetch('/api/csrf-token');
        if (res.ok) {
            const data = await res.json();
            csrfToken = data.csrf_token;
        }
    } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
    }
}

// Initialize CSRF token
fetchCSRFToken();

// Theme Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleBtn.textContent = '☀️ Light';
    } else {
        body.classList.remove('dark-mode');
        themeToggleBtn.textContent = '🌙 Dark';
    }
}

function toggleTheme() {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '☀️ Light';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = '🌙 Dark';
    }
}

themeToggleBtn.addEventListener('click', toggleTheme);

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    register: document.getElementById('register-view'),
    dashboard: document.getElementById('dashboard-view')
};
const navbar = document.getElementById('navbar');
const userEmailSpan = document.getElementById('user-email');

// Navigation
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');

    if (viewName === 'dashboard') {
        navbar.classList.remove('hidden');
    } else {
        navbar.classList.add('hidden');
    }
}

// Auth Functions
async function login(email, password) {
    // Clear previous validation errors
    clearAllValidationErrors();

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        const emailInput = document.querySelector('#login-view input[type="email"]');
        if (emailInput) showValidationError(emailInput, emailValidation.message);
        return;
    }

    // Basic password check (not empty)
    if (!password || password.trim() === '') {
        const passwordInput = document.querySelector('#login-view input[type="password"]');
        if (passwordInput) showValidationError(passwordInput, 'Password is required');
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('email', email);
        formData.append('password', password);

        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            currentUser = { email };
            userEmailSpan.textContent = email;
            clearAllValidationErrors();
            showView('dashboard');
            loadReceipts();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
}

async function register(email, password) {
    // Clear previous validation errors
    clearAllValidationErrors();

    // Vali date email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        const emailInput = document.querySelector('#register-view input[type="email"]');
        if (emailInput) showValidationError(emailInput, emailValidation.message);
        return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        const passwordInput = document.querySelector('#register-view input[type="password"]');
        if (passwordInput) showValidationError(passwordInput, passwordValidation.message);
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('email', email);
        formData.append('password', password);

        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            clearAllValidationErrors();
            alert('Registration successful! Please login.');
            showView('login');
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout');
    } catch (err) {
        // Silently handle logout errors
    } finally {
        // Clear sensitive data from memory
        currentUser = null;

        // Clear all form fields that might contain sensitive data
        document.querySelectorAll('input[type="password"]').forEach(input => {
            input.value = '';
        });
        document.querySelectorAll('input[type="email"]').forEach(input => {
            input.value = '';
        });

        // Clear any validation errors
        clearAllValidationErrors();

        // Redirect to login
        showView('login');
    }
}

// Receipt Functions
async function loadReceipts() {
    try {
        const res = await fetch('/api/receipt');
        if (res.ok) {
            const receipts = await res.json();
            renderReceipts(receipts);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderReceipts(receipts) {
    const list = document.getElementById('receipt-list');
    // Clear existing content safely
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }

    calculateMonthlyTotal(receipts);

    if (!receipts || receipts.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No receipts found.';
        list.appendChild(emptyMsg);
        return;
    }

    receipts.forEach(r => {
        const div = document.createElement('div');
        div.className = 'receipt-item';
        div.dataset.id = r._id; // Store ID for potential future use

        const leftDiv = document.createElement('div');
        const titleStrong = document.createElement('strong');
        titleStrong.textContent = r.title;
        leftDiv.appendChild(titleStrong);
        leftDiv.appendChild(document.createElement('br'));
        const dateSmall = document.createElement('small');
        dateSmall.textContent = new Date(r.receipt_date).toLocaleDateString();
        leftDiv.appendChild(dateSmall);

        const rightDiv = document.createElement('div');
        rightDiv.style.textAlign = 'right';
        const amountSpan = document.createElement('span');
        amountSpan.className = 'amount';
        amountSpan.textContent = (r.amount ? parseFloat(r.amount).toFixed(2) : '0.00');
        const currencySpan = document.createElement('span');
        currencySpan.className = 'badge';
        // Sanitize currency to only allow uppercase letters
        currencySpan.textContent = (r.currency || 'TWD').replace(/[^A-Z]/g, '');

        rightDiv.appendChild(amountSpan);
        rightDiv.appendChild(currencySpan);

        div.appendChild(leftDiv);
        div.appendChild(rightDiv);

        div.addEventListener('click', () => openEditModal(r));
        list.appendChild(div);
    });
}

function calculateMonthlyTotal(receipts) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const total = receipts.reduce((acc, r) => {
        const rDate = new Date(r.receipt_date);
        if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
            return acc + (parseFloat(r.amount) || 0);
        }
        return acc;
    }, 0);

    const totalEl = document.getElementById('total-month-amount');
    if (totalEl) {
        totalEl.textContent = total.toFixed(2);
    }
}

async function addReceipt(formData) {
    try {
        const params = new URLSearchParams(formData); // This handles the FormData object directly if passed, or we construct it.
        // Actually, let's construct it manually to be safe or pass plain object
        const payload = new URLSearchParams();
        for (const pair of formData.entries()) {
            payload.append(pair[0], pair[1]);
        }

        // Do not log sensitive payload data in production
        // console.log("DEBUG: Sending receipt payload", payload.toString());

        const res = await fetch('/api/receipt/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload
        });

        if (res.ok) {
            document.getElementById('add-receipt-modal').classList.add('hidden');
            document.getElementById('add-receipt-form').reset();
            loadReceipts();
        } else {
            const data = await res.json();
            alert('Error: ' + data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to add receipt');
    }
}

// Edit Receipt Logic
const editModal = document.getElementById('edit-receipt-modal');
const editForm = document.getElementById('edit-receipt-form');

function openEditModal(receipt) {
    editForm.querySelector('[name="receipt_id"]').value = receipt._id;
    editForm.querySelector('[name="title"]').value = receipt.title;
    editForm.querySelector('[name="amount"]').value = receipt.amount;
    editForm.querySelector('[name="currency"]').value = receipt.currency;

    // Format date specifically for input type="date" (YYYY-MM-DD)
    const dateObj = new Date(receipt.receipt_date);
    const dateStr = dateObj.toISOString().split('T')[0];
    editForm.querySelector('[name="receipt_date"]').value = dateStr;

    editModal.classList.remove('hidden');
}

async function updateReceipt(formData) {
    try {
        const id = formData.get('receipt_id');
        const payload = new URLSearchParams();
        for (const pair of formData.entries()) {
            payload.append(pair[0], pair[1]);
        }

        // We use the existing server endpoint which is a POST to /receipt/<id>/edit
        // Note: The server currently redirects to list_receipt. Since we are checking res.ok, 
        // fetch follows redirects by default, so we should get the list back or just OK.
        // Actually, server does `redirect(url_for("list_receipt"))`. Fetch will follow it and return the JSON list!
        // So we can just setReceipts directly if we wanted, or just call loadReceipts.

        const res = await fetch(`/api/receipt/${id}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload
        });

        if (res.ok) {
            editModal.classList.add('hidden');
            loadReceipts();
        } else {
            alert('Update failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error updating receipt');
    }
}


// Event Listeners
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    login(fd.get('email'), fd.get('password'));
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    register(fd.get('email'), fd.get('password'));
});

document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    showView('register');
});

document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    showView('login');
});

document.getElementById('logout-btn').addEventListener('click', logout);

// Add Modal Logic
const modal = document.getElementById('add-receipt-modal');
document.getElementById('show-add-receipt-modal').addEventListener('click', () => {
    modal.classList.remove('hidden');
});
document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
});

document.getElementById('add-receipt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    addReceipt(fd);
});

// Edit Modal Logic
document.getElementById('close-edit-modal-btn').addEventListener('click', () => {
    editModal.classList.add('hidden');
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    updateReceipt(fd);
});

async function deleteReceipt() {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    const id = editForm.querySelector('[name="receipt_id"]').value;
    try {
        const res = await fetch(`/api/receipt/${id}/delete`, {
            method: 'POST'
        });

        if (res.ok) {
            editModal.classList.add('hidden');
            loadReceipts();
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting receipt');
    }
}

document.getElementById('delete-receipt-btn').addEventListener('click', deleteReceipt);


// Init
loadTheme();
showView('login');
