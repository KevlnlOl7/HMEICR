
// State
let currentUser = null;

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

    if (receipts.length === 0) {
        list.innerHTML = '<p>No receipts found.</p>';
        return;
    }

    receipts.forEach(r => {
        const div = document.createElement('div');
        div.className = 'receipt-item';
        div.innerHTML = `
            <div>
                <strong>${r.title}</strong>
                <br>
                <small>${new Date(r.receipt_date).toLocaleDateString()}</small>
            </div>
            <span class="badge">${r.currency}</span>
        `;
        list.appendChild(div);
    });
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

// Modal Logic
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


// Init
showView('login');
