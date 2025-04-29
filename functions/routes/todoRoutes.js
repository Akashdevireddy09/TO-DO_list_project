// functions/routes/todoRoutes.js
const express = require("express");
const admin = require("firebase-admin");
const Joi = require('joi'); // Using Joi for validation (optional but good)

const router = express.Router();
const db = admin.firestore();

// Helper function to get user's todos collection reference
const getTodosCollection = (userId) => {
    return db.collection('users').doc(userId).collection('todos');
};

// --- Validation Schemas (using Joi) ---
const taskSchema = Joi.object({
    text: Joi.string().trim().min(1).required(),
    date: Joi.date().iso().required() // Expecting 'YYYY-MM-DD'
        .min('now') // Ensure date is not in the past (basic check)
        .messages({ // Custom error messages
            'date.base': `"date" should be a valid date in YYYY-MM-DD format`,
            'date.format': `"date" must be in YYYY-MM-DD format`,
            'date.min': `"date" cannot be in the past`
        }),
    // completed and archived are handled by specific endpoints or internally
});

const updateTaskSchema = Joi.object({
     text: Joi.string().trim().min(1), // Optional for update
     date: Joi.date().iso().min('now') // Optional for update
        .messages({
            'date.base': `"date" should be a valid date in YYYY-MM-DD format`,
            'date.format': `"date" must be in YYYY-MM-DD format`,
            'date.min': `"date" cannot be in the past`
        }),
}).min(1); // At least one field must be provided for update

// --- Routes ---

// GET /todos - Fetch tasks with optional filtering
router.get("/", async (req, res) => {
    console.log(`TODO ROUTER: Handling GET / relative path for user: ${req.user?.uid}`);
    const userId = req.user.uid; // Attached by authenticate middleware
    
    try {
        // Ensure userId was actually attached by middleware (defensive check)
        if (!userId) {
            console.error("User ID not found in request after authentication.");
            return res.status(401).send("Unauthorized: User ID missing.");
        }

        const todosCollection = getTodosCollection(userId);
        
        // Start building the query with base condition - no archived tasks
        let query = todosCollection.where('archived', '==', false);
        
        // Apply filters based on query parameters
        const { filter, fromDate, toDate } = req.query;
        
        // Handle date range filtering
        if (fromDate && toDate) {
            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
                return res.status(400).send("Invalid date format. Use YYYY-MM-DD");
            }
            
            // Note: Firebase doesn't support multiple range operators on different fields
            // So we'll do this filtering after getting results if we have other conditions
            
            // If we're only filtering by date range without other complex conditions:
            if (!filter || filter === 'all') {
                query = query.where('date', '>=', fromDate).where('date', '<=', toDate);
            }
        }
        
        // Apply specific task status filters
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Build queries based on filter
        switch (filter) {
            case 'upcoming':
                query = query.where('completed', '==', false).where('date', '>=', today);
                break;
            case 'overdue':
                query = query.where('completed', '==', false).where('date', '<', today);
                break;
            case 'completed':
                query = query.where('completed', '==', true);
                break;
            // 'all' case - no additional filters needed beyond non-archived
        }
        
        // Add ordering
        query = query.orderBy('date', 'asc');
        
        // Execute the query
        const snapshot = await query.get();
        
        // Handle Firestore query limitations with post-processing if needed
        let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If we couldn't apply date filtering earlier because of query limitations,
        // do it here with JavaScript filtering
        if (fromDate && toDate && (filter && filter !== 'all')) {
            tasks = tasks.filter(task => {
                const taskDate = task.date;
                return taskDate >= fromDate && taskDate <= toDate;
            });
        }
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error(`Error fetching tasks for user ${userId}:`, error);
        res.status(500).send("Error fetching tasks.");
    }
});

// GET /todos/archived - Fetch only archived tasks for the logged-in user (Optional)
router.get("/archived", async (req, res) => {
     const userId = req.user.uid;
     try {
         const todosCollection = getTodosCollection(userId);
         const snapshot = await todosCollection
                                 .where('archived', '==', true)
                                 .orderBy('date', 'asc')
                                 .get();

         if (snapshot.empty) {
             return res.status(200).json([]);
         }
         const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         res.status(200).json(tasks);
     } catch (error) {
         console.error("Error fetching archived tasks:", error);
         res.status(500).send("Error fetching archived tasks.");
     }
 });

// POST /todos - Add a new task
router.post("/", async (req, res) => {
    const userId = req.user.uid;
    try {
        // Validate request body
        const { error, value } = taskSchema.validate(req.body);
        if (error) {
            // Provide detailed validation error
            return res.status(400).send(`Validation Error: ${error.details[0].message}`);
        }

        const { text, date } = value; // Use validated values

        const todosCollection = getTodosCollection(userId);
        const newTask = {
            text: text,
            date: date, // Store as 'YYYY-MM-DD' string
            completed: false,
            archived: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp() // Use server timestamp
        };
        const docRef = await todosCollection.add(newTask);
        res.status(201).json({ id: docRef.id, ...newTask }); // Send back created task
    } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).send("Error adding task.");
    }
});

// PUT /todos/:id - Update task text and/or date
router.put("/:id", async (req, res) => {
    const userId = req.user.uid;
    const taskId = req.params.id;
    try {
         // Validate request body
         const { error, value } = updateTaskSchema.validate(req.body);
         if (error) {
             return res.status(400).send(`Validation Error: ${error.details[0].message}`);
         }

        const taskRef = getTodosCollection(userId).doc(taskId);
        const doc = await taskRef.get();

        if (!doc.exists) {
            return res.status(404).send("Task not found.");
        }
         if (doc.data().archived) {
            return res.status(403).send("Cannot modify an archived task.");
        }

        await taskRef.update(value); // Update with validated fields
        res.status(200).json({ id: taskId, ...value }); // Send back updated fields
    } catch (error) {
        console.error(`Error updating task ${taskId}:`, error);
        res.status(500).send("Error updating task.");
    }
});

 // PATCH /todos/:id/complete - Toggle task completion status
 router.patch("/:id/complete", async (req, res) => {
     const userId = req.user.uid;
     const taskId = req.params.id;
     try {
         const taskRef = getTodosCollection(userId).doc(taskId);
         const doc = await taskRef.get();

         if (!doc.exists) {
             return res.status(404).send("Task not found.");
         }

         const currentData = doc.data();
          if (currentData.archived) {
             return res.status(403).send("Cannot modify an archived task.");
         }

         const newStatus = !currentData.completed;
         await taskRef.update({ completed: newStatus });
         res.status(200).json({ id: taskId, completed: newStatus });
     } catch (error) {
         console.error(`Error toggling completion for task ${taskId}:`, error);
         res.status(500).send("Error updating task status.");
     }
 });

 // PATCH /todos/:id/archive - Archive a COMPLETED task
 router.patch("/:id/archive", async (req, res) => {
     const userId = req.user.uid;
     const taskId = req.params.id;
     try {
         const taskRef = getTodosCollection(userId).doc(taskId);
         const doc = await taskRef.get();

         if (!doc.exists) {
             return res.status(404).send("Task not found.");
         }

         const currentData = doc.data();
         if (!currentData.completed) {
              return res.status(400).send("Only completed tasks can be archived.");
         }
         if (currentData.archived) {
             return res.status(400).send("Task is already archived."); // Or just 200 OK
         }

         await taskRef.update({ archived: true });
         res.status(200).json({ id: taskId, archived: true });
     } catch (error) {
         console.error(`Error archiving task ${taskId}:`, error);
         res.status(500).send("Error archiving task.");
     }
 });

// DELETE /todos/:id - Permanently delete a task (use with caution!)
router.delete("/:id", async (req, res) => {
    const userId = req.user.uid;
    const taskId = req.params.id;
    try {
        const taskRef = getTodosCollection(userId).doc(taskId);
        const doc = await taskRef.get();

        if (!doc.exists) {
            return res.status(404).send("Task not found.");
        }

        await taskRef.delete();
        res.status(200).send(`Task ${taskId} deleted successfully.`); // Or 204 No Content
    } catch (error) {
        console.error(`Error deleting task ${taskId}:`, error);
        res.status(500).send("Error deleting task.");
    }
});

module.exports = router;