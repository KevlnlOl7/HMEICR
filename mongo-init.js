// ===============================
// MongoDB init script (ENV based)
// ===============================

// Read environment variables
const DB_NAME = process.env.MONGO_APP_DB || "myapp";
const APP_USER = process.env.MONGO_APP_USER || "myapp_user";
const APP_PWD = process.env.MONGO_APP_PASSWORD;

if (!APP_PWD) {
    throw new Error("MONGO_APP_PASSWORD is not set");
}

// Switch to target DB
db = db.getSiblingDB(DB_NAME);

// -------------------------------
// Create collections
// -------------------------------
db.createCollection("users");
db.createCollection("notes");

// -------------------------------
// Indexes
// -------------------------------
db.users.createIndex(
    { email: 1 },
    { unique: true }
);

db.notes.createIndex(
    { owner_id: 1 }
);

// -------------------------------
// Create app user (least privilege)
// -------------------------------
db.createUser({
    user: APP_USER,
    pwd: APP_PWD,
    roles: [
        {
            role: "readWrite",
            db: DB_NAME
        }
    ]
});

print(`✔ MongoDB initialized for DB: ${DB_NAME}`);
print(`✔ App user created: ${APP_USER}`);
