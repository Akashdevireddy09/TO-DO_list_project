// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Initialize Firebase Admin SDK
// No credentials needed when running in the Firebase environment
admin.initializeApp();

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Middleware for parsing JSON bodies (if you send JSON in requests)
app.use(express.json());

// Simple test route
app.get("/hello", (req, res) => {
    res.status(200).send("Hello from the To-Do API!");
});


const todoRouter = require("./routes/todoRoutes");
const authenticate = require("./middleware/authenticate"); // Auth middleware

// Apply authentication middleware ONLY to todo routes
// console.log(`Request path reaching index.js before /todos mount: ${req.path}`);
app.use("/todos", authenticate, todoRouter);


// Expose Express API as a single Cloud Function: 'api'
// All routes defined on 'app' will be available under /api URL prefix
// e.g., your-project-id.cloudfunctions.net/api/todos
exports.api = functions.https.onRequest(app);

// You can add other specific functions here if needed later
// e.g., exports.scheduledCleanup = functions.pubsub.schedule(...)