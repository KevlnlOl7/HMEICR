
// State
let currentUser = null;

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
    try {
        const formData = new URLSearchParams();
        formData.append('email', email);
        formData.append('password', password);

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            currentUser = { email };
            userEmailSpan.textContent = email;
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
    try {
        const formData = new URLSearchParams();
        formData.append('email', email);
        formData.append('password', password);

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
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
    await fetch('/api/logout');
    currentUser = null;
    showView('login');
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
    list.innerHTML = '';

    calculateMonthlyTotal(receipts);

    if (receipts.length === 0) {
        list.innerHTML = '<p>No receipts found.</p>';
        return;
    }

    receipts.forEach(r => {
        const div = document.createElement('div');
        div.className = 'receipt-item';
        div.onclick = () => openEditModal(r);

        const leftDiv = document.createElement('div');

        const titleStrong = document.createElement('strong');
        titleStrong.textContent = r.title; // Safe: textContent escapes HTML

        const br = document.createElement('br');

        const dateSmall = document.createElement('small');
        dateSmall.textContent = new Date(r.receipt_date).toLocaleDateString();

        leftDiv.appendChild(titleStrong);
        leftDiv.appendChild(br);
        leftDiv.appendChild(dateSmall);

        const rightDiv = document.createElement('div');
        rightDiv.style.textAlign = 'right';

        const amountSpan = document.createElement('span');
        amountSpan.className = 'amount';
        amountSpan.textContent = r.amount ? r.amount.toFixed(2) : '0.00';

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'badge';
        badgeSpan.textContent = r.currency;

        rightDiv.appendChild(amountSpan);
        rightDiv.appendChild(badgeSpan);

        div.appendChild(leftDiv);
        div.appendChild(rightDiv);
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

        console.log("DEBUG: Sending receipt payload", payload.toString());

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
