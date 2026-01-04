from flask import Flask, request, redirect, url_for, render_template, flash, jsonify, send_from_directory
import os
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from pymongo import MongoClient
from passlib.context import CryptContext
from os import getenv
from api.AuthorizedModules import EInvoiceAuthenticator
from bson import ObjectId
from crypto import encrypt_password, decrypt_password
from datetime import datetime
import dotenv

app = Flask(__name__)
dotenv.load_dotenv()
app.secret_key = getenv("secret_key")

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
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

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
@app.route("/register", methods=["POST"])
def register():
    email = request.form["email"]
    password = request.form["password"]

    if users.find_one({"email": email}):
        return jsonify({"success": False, "message": "User already exists"}), 400

    users.insert_one({
        "email": email,
        "password": hash_password(password)
    })

    return jsonify({"success": True, "message": "Registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    email = request.form["email"]
    password = request.form["password"]

    user = users.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    login_user(User(user))
    return jsonify({"success": True, "message": "Login successful"}), 200

@app.route("/dashboard")
@login_required
def dashboard():
    return "You are logged in 🎉"

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))

# ---------- User  ----------
@app.route("/einvoice_login/create", methods=["POST"])
@login_required
def create_einvoice_login():
    einvoice_login.insert_one({
        "owner_id": ObjectId(current_user.id),
        "einvoice_username": request.form["einvoice_username"],
        "einvoice_password": encrypt_password(
            request.form["einvoice_password"]
        )
    })
    return jsonify({"success": True, "message": "E-Invoice credentials saved"}), 201

@app.route("/einvoice_login/edit", methods=["POST"])
@login_required
def edit_einvoice_login(receipt_id):
    einvoice_login.update_one(
        {
            "_id": ObjectId(receipt_id),
            "owner_id": ObjectId(current_user.id)
        },
        {
            "$set": {
                "einvoice_username": request.form["einvoice_username"],
                 "einvoice_password": encrypt_password(
                     request.form["einvoice_password"]
                     )
            }
        }
    )
    return redirect(url_for("dashboard"))

@app.route("/receipt/create", methods=["POST"])
@login_required
def create_note():
    receipt.insert_one({
        "owner_id": ObjectId(current_user.id),
        "title": request.form["title"],
        "currency": request.form["currency"],
        "receipt_date": datetime.strptime(
            request.form["receipt_date"], "%Y-%m-%d"
        )
    })
    return jsonify({"success": True, "message": "Receipt created"}), 201

@app.route("/receipt")
@login_required
def list_receipt():
    user_receipt = list(receipt.find({
        "owner_id": ObjectId(current_user.id)
    }))
    for r in user_receipt:
        r["_id"] = str(r["_id"])
        r["owner_id"] = str(r["owner_id"])
    
    return jsonify(user_receipt), 200

@app.route("/receipt/<receipt_id>/edit", methods=["POST"])
@login_required
def edit_note(receipt_id):
    receipt.update_one(
        {
            "_id": ObjectId(receipt_id),
            "owner_id": ObjectId(current_user.id)
        },
        {
            "$set": {
                "title": request.form["title"],
                "currency": request.form["currency"],
                "receipt_date": datetime.strptime(
                    request.form["receipt_date"], "%Y-%m-%d"
                )
            }
        }
    )
    return redirect(url_for("list_receipt"))

@app.route("/receipt/<receipt_id>/delete", methods=["POST"])
@login_required
def delete_note(receipt_id):
    receipt.delete_one({
        "_id": ObjectId(receipt_id),
        "owner_id": ObjectId(current_user.id)
    })
    return redirect(url_for("list_receipt"))

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

# ------ User API -------
def get_user_api(user_id):
    """Return a per-user EInvoiceAuthenticator instance."""
    doc = einvoice_login.find_one({"owner_id": ObjectId(user_id)})
    if not doc:
        return None  # or raise exception

    username = doc["einvoice_username"]
    password = decrypt_password(doc["einvoice_password"])

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
    app.run(debug=True)
