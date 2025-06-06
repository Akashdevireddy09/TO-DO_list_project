// // functions/index.js
// const functions = require("firebase-functions");
// const admin = require("firebase-admin");
// const express = require("express");
// const cors = require("cors");

// // Initialize Firebase Admin SDK
// // No credentials needed when running in the Firebase environment
// admin.initializeApp();

// const app = express();

// // Automatically allow cross-origin requests
// app.use(cors({ origin: true }));

// // Middleware for parsing JSON bodies (if you send JSON in requests)
// app.use(express.json());

// // Simple test route
// app.get("/hello", (req, res) => {
//     res.status(200).send("Hello from the To-Do API!");
// });


// const todoRouter = require("./routes/todoRoutes");
// const authenticate = require("./middleware/authenticate"); // Auth middleware

// // Apply authentication middleware ONLY to todo routes
// // console.log(`Request path reaching index.js before /todos mount: ${req.path}`);
// app.use("/todos", authenticate, todoRouter);


// // Expose Express API as a single Cloud Function: 'api'
// // All routes defined on 'app' will be available under /api URL prefix
// // e.g., your-project-id.cloudfunctions.net/api/todos
// exports.api = functions.https.onRequest(app);

// // You can add other specific functions here if needed later
// // e.g., exports.scheduledCleanup = functions.pubsub.schedule(...)

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK FIRST
admin.initializeApp();

// THEN require other modules that use admin services
const todoRoutes = require('./routes/todoRoutes');

exports.api = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Handle URL-based API calls (for direct browser access)
      if (req.method === 'GET' && req.query.action) {
        return await todoRoutes.handleUrlBasedAPI(req, res);
      }

      // Handle regular API calls with authentication
      const path = req.path.replace('/api', '');
      const method = req.method;

      // Authentication check for regular API calls
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const userId = decodedToken.uid;

      // Route handling
      if (path === '/todos' && method === 'GET') {
        return await todoRoutes.getTodos(req, res, userId);
      } else if (path === '/todos' && method === 'POST') {
        return await todoRoutes.createTodo(req, res, userId);
      } else if (path.startsWith('/todos/') && method === 'PUT') {
        const todoId = path.split('/')[2];
        return await todoRoutes.updateTodo(req, res, userId, todoId);
      } else if (path.startsWith('/todos/') && path.endsWith('/complete') && method === 'PATCH') {
        const todoId = path.split('/')[2];
        return await todoRoutes.toggleComplete(req, res, userId, todoId);
      } else if (path.startsWith('/todos/') && method === 'DELETE') {
        const todoId = path.split('/')[2];
        return await todoRoutes.deleteTodo(req, res, userId, todoId);
      }

      res.status(404).json({ error: 'Not found' });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});