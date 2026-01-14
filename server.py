from flask import Flask, request, redirect, url_for, render_template, flash, jsonify, send_from_directory
import os
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from os import getenv
from api.AuthorizedModules import EInvoiceAuthenticator
from bson import ObjectId
# TEMPORARILY DISABLED - Crypto module causing issues
# from crypto import encrypt_password, decrypt_password
from datetime import datetime
import dotenv
from utils.validators import (
    validate_email, 
    validate_password_strength, 
    validate_amount,
    validate_date_format,
    validate_currency,
    sanitize_string
)
from utils.security_logger import (
    log_security_event,
    log_auth_attempt,
    log_session_event,
    log_rate_limit_exceeded,
    get_client_ip
)

app = Flask(__name__)
dotenv.load_dotenv()
app.secret_key = getenv("secret_key")

# ---------- Security Configuration ----------
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman

# Rate Limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# CSRF Protection - TEMPORARILY DISABLED for testing
# csrf = CSRFProtect(app)
# TODO: Enable CSRF and update frontend to include tokens

# Security Headers (disabled HTTPS enforcement for development)
Talisman(app, 
    force_https=False,  # Set to True in production with HTTPS
    content_security_policy=None  # Can be configured for stricter CSP
)

# Session Security
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour

# Serve React App
@app.route("/", defaults={'path': ''})
@app.route("/<path:path>")
def serve(path):
    static_folder = os.path.join(os.getcwd(), 'client/dist')
    if path != "" and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    return send_from_directory(static_folder, 'index.html')


# ---------- MongoDB ----------
mongo_uri = getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client["myapp"]
users = db["users"]
einvoice_login = db["einvoice_login"]
receipt = db["receipt"]

# ---------- Password Hashing ----------

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return check_password_hash(hashed, password)

# ---------- Flask-Login ----------
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data["_id"])
        self.email = user_data["email"]

@login_manager.user_loader
def load_user(user_id):
    user = users.find_one({"_id": ObjectId(user_id)})
    return User(user) if user else None

# ---------- Routes ----------
@app.route("/api/register", methods=["POST"])
@limiter.limit("3 per minute")  # Strict limit for registration
def register():
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    
    # Validate email
    is_valid, error_msg = validate_email(email)
    if not is_valid:
        return jsonify({"success": False, "message": error_msg}), 400
    
    # Validate password strength
    is_valid, error_msg = validate_password_strength(password)
    if not is_valid:
        return jsonify({"success": False, "message": error_msg}), 400
    
    # Sanitize email
    email = sanitize_string(email, max_length=254)

    if users.find_one({"email": email}):
        log_security_event('registration_failed', user=email, status='failure',
                          details={'reason': 'user_already_exists'})
        return jsonify({"success": False, "message": "User already exists"}), 400

    users.insert_one({
        "email": email,
        "password": hash_password(password)
    })
    
    log_security_event('registration_success', user=email, status='success')

    return jsonify({"success": True, "message": "Registered successfully"}), 201

@app.route("/api/login", methods=["POST"])
@limiter.limit("5 per minute")  # Prevent brute-force attacks
def login():
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    
    # Log login attempt
    log_security_event('login_attempt', user=email, status='in_progress')
    
    # Sanitize email input
    email = sanitize_string(email, max_length=254)

    user = users.find_one({"email": email})
    if not user:
        log_security_event('login_failed', user=email, status='failure', 
                          details={'reason': 'user_not_found'})
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    
    is_valid = verify_password(password, user["password"])
    
    if not is_valid:
        log_security_event('login_failed', user=email, status='failure',
                          details={'reason': 'invalid_password'})
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    login_user(User(user))
    log_session_event('login', user=email)
    
    return jsonify({"success": True, "message": "Login successful"}), 200

@app.route("/api/dashboard")
@login_required
def dashboard():
    return jsonify({"success": True, "message": "You are logged in 🎉"}), 200

@app.route("/api/logout")
@login_required
def logout():
    user_email = current_user.email if current_user.is_authenticated else 'unknown'
    logout_user()
    log_session_event('logout', user=user_email)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

# ---------- E-Invoice  ----------
@app.route("/api/einvoice_login/create", methods=["POST"])
@login_required
def create_einvoice_login():
    username = request.form.get("einvoice_username", "").strip()
    password = request.form.get("einvoice_password", "").strip()
    
    # Sanitize inputs
    username = sanitize_string(username, max_length=100)
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400
    
    einvoice_login.insert_one({
        "owner_id": ObjectId(current_user.id),
        "einvoice_username": username,
        "einvoice_password": password  # TEMPORARILY storing plain text - crypto disabled
    })
    return jsonify({"success": True, "message": "E-Invoice credentials saved"}), 201

@app.route("/api/einvoice_login/<einvoice_id>/edit", methods=["POST"])
@login_required
def edit_einvoice_login(einvoice_id):
    username = request.form.get("einvoice_username", "").strip()
    password = request.form.get("einvoice_password", "").strip()
    
    # Sanitize inputs
    username = sanitize_string(username, max_length=100)
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400
    
    result = einvoice_login.update_one(
        {
            "_id": ObjectId(einvoice_id),
            "owner_id": ObjectId(current_user.id)
        },
        {
            "$set": {
                "einvoice_username": username,
                "einvoice_password": password  # TEMPORARILY storing plain text - crypto disabled
            }
        }
    )
    
    if result.modified_count > 0:
        return jsonify({"success": True, "message": "E-Invoice credentials updated"}), 200
    else:
        return jsonify({"success": False, "message": "Credentials not found"}), 404

@app.route("/api/receipt/create", methods=["POST"])
@login_required
def create_note():
    try:
        # Get and validate inputs
        title = request.form.get("title", "").strip()
        currency = request.form.get("currency", "").strip()
        amount_str = request.form.get("amount", "0")
        receipt_date = request.form.get("receipt_date", "").strip()
        
        # Validate amount
        is_valid, error_msg = validate_amount(amount_str)
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Validate currency
        is_valid, error_msg = validate_currency(currency)
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Validate date format
        is_valid, error_msg = validate_date_format(receipt_date)
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Sanitize title
        title = sanitize_string(title, max_length=200)
        if not title:
            return jsonify({"success": False, "message": "Title is required"}), 400
        
        amount = float(amount_str)
        
        receipt.insert_one({
            "owner_id": ObjectId(current_user.id),
            "title": title,
            "currency": currency.upper(),
            "amount": amount,
            "receipt_date": datetime.strptime(receipt_date, "%Y-%m-%d")
        })
        
        return jsonify({"success": True, "message": "Receipt created"}), 201
    except ValueError as e:
        return jsonify({"success": False, "message": "Invalid date format"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": "An error occurred"}), 500

@app.route("/api/receipt")
@login_required
def list_receipt():
    user_receipt = list(receipt.find({
        "owner_id": ObjectId(current_user.id)
    }))
    for r in user_receipt:
        r["_id"] = str(r["_id"])
        r["owner_id"] = str(r["owner_id"])
        if "amount" not in r:
            r["amount"] = 0
    
    return jsonify(user_receipt), 200

@app.route("/api/receipt/<receipt_id>/edit", methods=["POST"])
@login_required
def edit_note(receipt_id):
    try:
        # Get and validate inputs
        title = request.form.get("title", "").strip()
        currency = request.form.get("currency", "").strip()
        amount_str = request.form.get("amount", "0")
        receipt_date = request.form.get("receipt_date", "").strip()
        
        # Validate amount
        is_valid, error_msg = validate_amount(amount_str)
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Validate currency
        is_valid, error_msg = validate_currency(currency)
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Validate date format
        is_valid, error_msg = validate_date_format(receipt_date)
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Sanitize title
        title = sanitize_string(title, max_length=200)
        if not title:
            return jsonify({"success": False, "message": "Title is required"}), 400
        
        amount = float(amount_str)
        
        receipt.update_one(
            {
                "_id": ObjectId(receipt_id),
                "owner_id": ObjectId(current_user.id)
            },
            {
                "$set": {
                    "title": title,
                    "currency": currency.upper(),
                    "amount": amount,
                    "receipt_date": datetime.strptime(receipt_date, "%Y-%m-%d")
                }
            }
        )
        return jsonify({"success": True, "message": "Receipt updated"}), 200
    except ValueError as e:
        return jsonify({"success": False, "message": "Invalid date format"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": "An error occurred"}), 500

@app.route("/api/receipt/<receipt_id>/delete", methods=["POST"])
@login_required
def delete_note(receipt_id):
    result = receipt.delete_one({
        "_id": ObjectId(receipt_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if result.deleted_count > 0:
        return jsonify({"success": True, "message": "Receipt deleted"}), 200
    else:
        return jsonify({"success": False, "message": "Receipt not found"}), 404

@app.route("/einvoice/invoice_list")
@login_required
def invoice_list():
    api = get_user_api(current_user.id)
    if not api:
        return jsonify({"success": False, "message": "No e-invoice credentials found."}), 401

    invoices = api.get_invoice_list()  # example API call
    return Response(
        json_util.dumps(invoices),
        mimetype="application/json"
    )

@app.route("/einvoice/carrier/invoices", methods=["GET"])
@login_required
def carrier_invoice_list():
    api = get_user_api(current_user.id)
    if not api:
        return jsonify({"error": "No e-invoice credentials found"}), 401

    first_day = request.args.get("from")
    last_day = request.args.get("to")
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 50))

    if not first_day or not last_day:
        return jsonify({"error": "from and to dates are required"}), 400

    result = getCarrierInvoice(
        api=api,
        frist_day=first_day,
        last_day=last_day,
        size=size,
        page=page,
    )

    if not result:
        return jsonify({"error": "Failed to fetch invoices"}), 500

    return Response(
        json_util.dumps(result),
        mimetype="application/json"
    )

@app.route("/einvoice/carrier/invoice/detail", methods=["GET"])
@login_required
def carrier_invoice_detail():
    api = get_user_api(current_user.id)
    if not api:
        return jsonify({"error": "No e-invoice credentials found"}), 401

    token = request.args.get("token")
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 20))

    if not token:
        return jsonify({"error": "token is required"}), 400

    data = getCarrierInvoiceDetail(
        api=api,
        token=token,
        page=page,
        size=size,
    )

    if isinstance(data, tuple):
        # handles ("msg", status_code)
        return jsonify({"error": data[0]}), data[1]

    return Response(
        json_util.dumps(data),
        mimetype="application/json"
    )

# ------ Error Handlers -------
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"success": False, "message": "Resource not found"}), 404

@app.errorhandler(429)
def ratelimit_handler(error):
    """Handle rate limit exceeded errors"""
    # Log rate limit violation
    email = request.form.get('email', 'anonymous')
    log_rate_limit_exceeded(user=email)
    
    return jsonify({
        "success": False, 
        "message": "Too many requests. Please try again later."
    }), 429

@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    # Log the error but don't expose details to client
    app.logger.error(f"Internal error: {error}")
    return jsonify({
        "success": False, 
        "message": "An internal error occurred. Please try again later."
    }), 500

# ------ User API -------
def get_user_api(user_id):
    """Return a per-user EInvoiceAuthenticator instance."""
    doc = einvoice_login.find_one({"owner_id": ObjectId(user_id)})
    if not doc:
        return None  # or raise exception

    username = doc["einvoice_username"]
    password = doc["einvoice_password"]  # TEMPORARILY no decryption - crypto disabled

    # Create a new API session for this user
    api = EInvoiceAuthenticator(username=username, password=password)

    # Optionally, wipe password after initialization
    password = None

    return api




def getCarrierInvoice(api, frist_day, last_day, size, page):
    token = api.getSearchCarrierInvoiceListJWT(frist_day, last_day)
    if not token:
        return None

    all_items = []
    while True:
        data = api.searchCarrierInvoice(token, size=size, page=page)
        if 'content' not in data:
            break
        all_items.extend(data['content'])

        if data.get('last', True):  # When it's the last page
            break
        page += 1

    total = sum(int(item['totalAmount']) for item in all_items)
    return {"content": all_items, "total": total}

def getCarrierInvoiceDetail(api, token, page, size):
    if not token:
        return "Token missing", 400

    data = api.getCarrierInvoiceDetail(token,page,size)
    if not data:
        return "No data found for the provided token", 404
    return data

#webserver


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
