// // functions/routes/todoRoutes.js
// const express = require("express");
// const admin = require("firebase-admin");
// const Joi = require('joi'); // Using Joi for validation (optional but good)

// const router = express.Router();
// const db = admin.firestore();

// // Helper function to get user's todos collection reference
// const getTodosCollection = (userId) => {
//     return db.collection('users').doc(userId).collection('todos');
// };

// // --- Validation Schemas (using Joi) ---
// const taskSchema = Joi.object({
//     text: Joi.string().trim().min(1).required(),
//     date: Joi.date().iso().required() // Expecting 'YYYY-MM-DD'
//         .min('now') // Ensure date is not in the past (basic check)
//         .messages({ // Custom error messages
//             'date.base': `"date" should be a valid date in YYYY-MM-DD format`,
//             'date.format': `"date" must be in YYYY-MM-DD format`,
//             'date.min': `"date" cannot be in the past`
//         }),
//     // completed and archived are handled by specific endpoints or internally
// });

// const updateTaskSchema = Joi.object({
//      text: Joi.string().trim().min(1), // Optional for update
//      date: Joi.date().iso().min('now') // Optional for update
//         .messages({
//             'date.base': `"date" should be a valid date in YYYY-MM-DD format`,
//             'date.format': `"date" must be in YYYY-MM-DD format`,
//             'date.min': `"date" cannot be in the past`
//         }),
// }).min(1); // At least one field must be provided for update

// // --- Routes ---

// // GET /todos - Fetch tasks with optional filtering
// router.get("/", async (req, res) => {
//     console.log(`TODO ROUTER: Handling GET / relative path for user: ${req.user?.uid}`);
//     const userId = req.user.uid; // Attached by authenticate middleware
    
//     try {
//         // Ensure userId was actually attached by middleware (defensive check)
//         if (!userId) {
//             console.error("User ID not found in request after authentication.");
//             return res.status(401).send("Unauthorized: User ID missing.");
//         }

//         const todosCollection = getTodosCollection(userId);
        
//         // Start building the query with base condition - no archived tasks
//         let query = todosCollection.where('archived', '==', false);
        
//         // Apply filters based on query parameters
//         const { filter, fromDate, toDate } = req.query;
        
//         // Handle date range filtering
//         if (fromDate && toDate) {
//             // Validate date format
//             if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
//                 return res.status(400).send("Invalid date format. Use YYYY-MM-DD");
//             }
            
//             // Note: Firebase doesn't support multiple range operators on different fields
//             // So we'll do this filtering after getting results if we have other conditions
            
//             // If we're only filtering by date range without other complex conditions:
//             if (!filter || filter === 'all') {
//                 query = query.where('date', '>=', fromDate).where('date', '<=', toDate);
//             }
//         }
        
//         // Apply specific task status filters
//         const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
//         // Build queries based on filter
//         switch (filter) {
//             case 'upcoming':
//                 query = query.where('completed', '==', false).where('date', '>=', today);
//                 break;
//             case 'overdue':
//                 query = query.where('completed', '==', false).where('date', '<', today);
//                 break;
//             case 'completed':
//                 query = query.where('completed', '==', true);
//                 break;
//             // 'all' case - no additional filters needed beyond non-archived
//         }
        
//         // Add ordering
//         query = query.orderBy('date', 'asc');
        
//         // Execute the query
//         const snapshot = await query.get();
        
//         // Handle Firestore query limitations with post-processing if needed
//         let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
//         // If we couldn't apply date filtering earlier because of query limitations,
//         // do it here with JavaScript filtering
//         if (fromDate && toDate && (filter && filter !== 'all')) {
//             tasks = tasks.filter(task => {
//                 const taskDate = task.date;
//                 return taskDate >= fromDate && taskDate <= toDate;
//             });
//         }
        
//         res.status(200).json(tasks);
//     } catch (error) {
//         console.error(`Error fetching tasks for user ${userId}:`, error);
//         res.status(500).send("Error fetching tasks.");
//     }
// });

// // GET /todos/archived - Fetch only archived tasks for the logged-in user (Optional)
// router.get("/archived", async (req, res) => {
//      const userId = req.user.uid;
//      try {
//          const todosCollection = getTodosCollection(userId);
//          const snapshot = await todosCollection
//                                  .where('archived', '==', true)
//                                  .orderBy('date', 'asc')
//                                  .get();

//          if (snapshot.empty) {
//              return res.status(200).json([]);
//          }
//          const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//          res.status(200).json(tasks);
//      } catch (error) {
//          console.error("Error fetching archived tasks:", error);
//          res.status(500).send("Error fetching archived tasks.");
//      }
//  });

// // POST /todos - Add a new task
// router.post("/", async (req, res) => {
//     const userId = req.user.uid;
//     try {
//         // Validate request body
//         const { error, value } = taskSchema.validate(req.body);
//         if (error) {
//             // Provide detailed validation error
//             return res.status(400).send(`Validation Error: ${error.details[0].message}`);
//         }

//         const { text, date } = value; // Use validated values

//         const todosCollection = getTodosCollection(userId);
//         const newTask = {
//             text: text,
//             date: date, // Store as 'YYYY-MM-DD' string
//             completed: false,
//             archived: false,
//             createdAt: admin.firestore.FieldValue.serverTimestamp() // Use server timestamp
//         };
//         const docRef = await todosCollection.add(newTask);
//         res.status(201).json({ id: docRef.id, ...newTask }); // Send back created task
//     } catch (error) {
//         console.error("Error adding task:", error);
//         res.status(500).send("Error adding task.");
//     }
// });

// // PUT /todos/:id - Update task text and/or date
// router.put("/:id", async (req, res) => {
//     const userId = req.user.uid;
//     const taskId = req.params.id;
//     try {
//          // Validate request body
//          const { error, value } = updateTaskSchema.validate(req.body);
//          if (error) {
//              return res.status(400).send(`Validation Error: ${error.details[0].message}`);
//          }

//         const taskRef = getTodosCollection(userId).doc(taskId);
//         const doc = await taskRef.get();

//         if (!doc.exists) {
//             return res.status(404).send("Task not found.");
//         }
//          if (doc.data().archived) {
//             return res.status(403).send("Cannot modify an archived task.");
//         }

//         await taskRef.update(value); // Update with validated fields
//         res.status(200).json({ id: taskId, ...value }); // Send back updated fields
//     } catch (error) {
//         console.error(`Error updating task ${taskId}:`, error);
//         res.status(500).send("Error updating task.");
//     }
// });

//  // PATCH /todos/:id/complete - Toggle task completion status
//  router.patch("/:id/complete", async (req, res) => {
//      const userId = req.user.uid;
//      const taskId = req.params.id;
//      try {
//          const taskRef = getTodosCollection(userId).doc(taskId);
//          const doc = await taskRef.get();

//          if (!doc.exists) {
//              return res.status(404).send("Task not found.");
//          }

//          const currentData = doc.data();
//           if (currentData.archived) {
//              return res.status(403).send("Cannot modify an archived task.");
//          }

//          const newStatus = !currentData.completed;
//          await taskRef.update({ completed: newStatus });
//          res.status(200).json({ id: taskId, completed: newStatus });
//      } catch (error) {
//          console.error(`Error toggling completion for task ${taskId}:`, error);
//          res.status(500).send("Error updating task status.");
//      }
//  });

//  // PATCH /todos/:id/archive - Archive a COMPLETED task
//  router.patch("/:id/archive", async (req, res) => {
//      const userId = req.user.uid;
//      const taskId = req.params.id;
//      try {
//          const taskRef = getTodosCollection(userId).doc(taskId);
//          const doc = await taskRef.get();

//          if (!doc.exists) {
//              return res.status(404).send("Task not found.");
//          }

//          const currentData = doc.data();
//          if (!currentData.completed) {
//               return res.status(400).send("Only completed tasks can be archived.");
//          }
//          if (currentData.archived) {
//              return res.status(400).send("Task is already archived."); // Or just 200 OK
//          }

//          await taskRef.update({ archived: true });
//          res.status(200).json({ id: taskId, archived: true });
//      } catch (error) {
//          console.error(`Error archiving task ${taskId}:`, error);
//          res.status(500).send("Error archiving task.");
//      }
//  });

// // DELETE /todos/:id - Permanently delete a task (use with caution!)
// router.delete("/:id", async (req, res) => {
//     const userId = req.user.uid;
//     const taskId = req.params.id;
//     try {
//         const taskRef = getTodosCollection(userId).doc(taskId);
//         const doc = await taskRef.get();

//         if (!doc.exists) {
//             return res.status(404).send("Task not found.");
//         }

//         await taskRef.delete();
//         res.status(200).send(`Task ${taskId} deleted successfully.`); // Or 204 No Content
//     } catch (error) {
//         console.error(`Error deleting task ${taskId}:`, error);
//         res.status(500).send("Error deleting task.");
//     }
// });

// module.exports = router;


const admin = require('firebase-admin');
const db = admin.firestore();

// Helper function to get the user's specific todos subcollection
const getUserTodosCollection = (userId) => {
  return db.collection('users').doc(userId).collection('todos');
};

// --- formatDateField remains the same ---
const formatDateField = (dateValue) => {
  if (!dateValue) {
    return null;
  }
  let processedDate = dateValue;
  if (dateValue && typeof dateValue.toDate === 'function') {
    processedDate = dateValue.toDate();
  }
  try {
    const d = new Date(processedDate);
    if (isNaN(d.getTime())) {
      console.warn("Backend: formatDateField received an invalid date value:", dateValue);
      return null;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Backend: Error processing date in formatDateField:", dateValue, e);
    return null;
  }
};

// --- toISOStringForTimestampOrNull remains the same ---
const toISOStringForTimestampOrNull = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string' || timestamp === null) {
        return timestamp;
    }
    return null;
};


// --- URL-based API handler (for direct browser access) ---
exports.handleUrlBasedAPI = async (req, res) => {
  const { action, user, status, text, date, id, from, to } = req.query; // 'user' here is the userId

  if (!user) { // 'user' is the userId from the query parameter
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    switch (action) {
      case 'get':
        return await getTasksUrlBased(req, res, user, status, from, to);
      case 'add':
        if (!text || !date) {
          return res.status(400).json({ error: 'Text and date required for add action' });
        }
        return await addTaskUrlBased(req, res, user, text, date);
      case 'delete':
        if (!id) {
          return res.status(400).json({ error: 'Task ID required for delete action' });
        }
        return await deleteTaskUrlBased(req, res, user, id);
      case 'edit':
        if (!id || !text || !date) {
          return res.status(400).json({ error: 'Task ID, text, and date required for edit action' });
        }
        return await editTaskUrlBased(req, res, user, id, text, date);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('URL-based API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Authenticated API functions ---

exports.getTodos = async (req, res, userId) => { // userId is from authenticated token
  const { status, from, to } = req.query;
  console.log('getTodos (subcollection) called with params:', { userId, status, from, to });

  try {
    let query = getUserTodosCollection(userId); // Get the subcollection for this user

    // The .where('userId', '==', userId) is no longer needed as we are in the user's subcollection

    if (from && to) {
      console.log('Applying date range filter:', { from, to });
      query = query.where('date', '>=', from)
                   .where('date', '<=', to)
                   .orderBy('date', 'asc');
    } else if (status && status !== 'all') {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      console.log('Applying status filter:', status, 'Today:', todayString);

      switch (status) {
        case 'upcoming':
          query = query.where('completed', '==', false)
                       .where('date', '>=', todayString)
                       .orderBy('date', 'asc');
          break;
        case 'overdue':
          query = query.where('completed', '==', false)
                       .where('date', '<', todayString)
                       .orderBy('date', 'asc');
          break;
        case 'completed':
          query = query.where('completed', '==', true)
                       .orderBy('date', 'asc');
          break;
      }
    } else {
      console.log('No specific filter, getting all tasks for user');
      query = query.orderBy('date', 'asc');
    }

    const snapshot = await query.get();
    let tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const cleanTasks = tasks.map(task => ({
      id: task.id,
      text: task.text || '',
      date: formatDateField(task.date),
      completed: task.completed || false,
      createdAt: toISOStringForTimestampOrNull(task.createdAt),
      updatedAt: toISOStringForTimestampOrNull(task.updatedAt),
      archived: task.archived || false // Ensure archived is part of the model
    }));

    res.status(200).json(cleanTasks);
  } catch (error) {
    console.error('Error in getTodos (subcollection):', error);
    if (error.message && error.message.includes('indexes?create_composite=')) {
        console.error("Firestore indexing error for subcollection query. Please create the required composite index for the 'todos' subcollection.");
    }
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

exports.createTodo = async (req, res, userId) => { // userId is from authenticated token
  const { text, date } = req.body;
  console.log('createTodo (subcollection) called:', { userId, text, date });

  if (!text || !date) return res.status(400).json({ error: 'Text and date are required' });
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });

  try {
    const todoData = {
      text: text.trim(),
      date,
      completed: false,
      // userId field is no longer needed here, it's part of the path
      archived: false, 
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await getUserTodosCollection(userId).add(todoData);
    
    const createdTask = {
      id: docRef.id,
      text: text.trim(),
      date,
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
    res.status(201).json(createdTask);
  } catch (error) {
    console.error('Error creating todo (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateTodo = async (req, res, userId, todoId) => { // userId is from authenticated token
  const { text, date } = req.body;
  console.log('updateTodo (subcollection) called:', { userId, todoId, text, date });

  if (!text || !date) return res.status(400).json({ error: 'Text and date are required' });
  
  try {
    const todoRef = getUserTodosCollection(userId).doc(todoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists) {
      return res.status(404).json({ error: 'Todo not found in user subcollection' });
    }
    // Access control is implicit because we used the authenticated userId to build todoRef path
    // The check for todoDoc.data().userId !== userId is no longer needed (and userId field is removed)

    const updateData = {
      text: text.trim(),
      date,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await todoRef.update(updateData);
    const updatedTask = {
      id: todoId,
      ...todoDoc.data(), // Spread original data (like createdAt, completed)
      text: text.trim(),
      date,
      updatedAt: new Date().toISOString()
    };
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating todo (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.toggleComplete = async (req, res, userId, todoId) => { // userId is from authenticated token
  console.log('toggleComplete (subcollection) called:', { userId, todoId });

  try {
    const todoRef = getUserTodosCollection(userId).doc(todoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists) {
      return res.status(404).json({ error: 'Todo not found in user subcollection' });
    }
    
    const currentData = todoDoc.data();
    const newCompletedStatus = !currentData.completed;
    const updateData = {
      completed: newCompletedStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await todoRef.update(updateData);
    const updatedTask = {
      id: todoId,
      ...currentData,
      completed: newCompletedStatus,
      updatedAt: new Date().toISOString()
    };
    res.json(updatedTask);
  } catch (error) {
    console.error('Error toggling complete (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteTodo = async (req, res, userId, todoId) => { // userId is from authenticated token
  console.log('deleteTodo (subcollection) called:', { userId, todoId });

  try {
    const todoRef = getUserTodosCollection(userId).doc(todoId);
    const todoDoc = await todoRef.get(); // Check if it exists before deleting

    if (!todoDoc.exists) {
      return res.status(404).json({ error: 'Todo not found in user subcollection' });
    }

    await todoRef.delete();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting todo (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// --- URL-based API helper functions (Modified for subcollections) ---

async function getTasksUrlBased(req, res, userParamId, statusParam = 'all', from = null, to = null) {
  // userParamId is the userId from the URL query
  console.log('getTasksUrlBased (subcollection) called:', { userParamId, statusParam, from, to });

  try {
    let query = getUserTodosCollection(userParamId); // Path uses userParamId

    if (from && to) {
      query = query.where('date', '>=', from)
                   .where('date', '<=', to)
                   .orderBy('date', 'asc');
    } else if (statusParam && statusParam !== 'all') {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      switch (statusParam) {
        case 'completed':
          query = query.where('completed', '==', true).orderBy('date', 'asc');
          break;
        case 'due':
        case 'overdue':
          query = query.where('completed', '==', false)
                       .where('date', '<', todayString)
                       .orderBy('date', 'asc');
          break;
        case 'upcoming':
          query = query.where('completed', '==', false)
                       .where('date', '>=', todayString)
                       .orderBy('date', 'asc');
          break;
      }
    } else {
      query = query.orderBy('date', 'asc');
    }

    const snapshot = await query.get();
    let tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const cleanTasks = tasks.map(task => ({
      id: task.id,
      text: task.text || '',
      date: formatDateField(task.date),
      completed: task.completed || false,
      createdAt: toISOStringForTimestampOrNull(task.createdAt),
      updatedAt: toISOStringForTimestampOrNull(task.updatedAt),
      archived: task.archived || false
    }));
    
    // For URL-based, it's better to return the full object as previously
    res.status(200).json({
        success: true,
        action: 'get',
        user: userParamId, // Use the ID from the URL param
        status: statusParam,
        ...(from && { from }),
        ...(to && { to }),
        count: cleanTasks.length,
        tasks: cleanTasks
    });

  } catch (error) {
    console.error('Error in getTasksUrlBased (subcollection):', error);
    // You might get index errors here too for the 'todos' subcollection queries
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addTaskUrlBased(req, res, userParamId, text, date) {
  // userParamId is the userId from the URL query
  console.log('addTaskUrlBased (subcollection) called:', { userParamId, text, date });
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });

  try {
    const todoData = {
      text: text.trim(),
      date,
      completed: false,
      archived: false,
      // userId field removed
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await getUserTodosCollection(userParamId).add(todoData);
    const createdTask = {
      id: docRef.id,
      text: text.trim(), date, completed: false, archived: false,
      createdAt: new Date().toISOString(), updatedAt: null
    };
    res.status(201).json({
        success: true,
        action: 'add',
        user: userParamId,
        taskId: docRef.id,
        task: createdTask
    });
  } catch (error) {
    console.error('Error in addTaskUrlBased (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function editTaskUrlBased(req, res, userParamId, todoId, text, date) {
  // userParamId is the userId from the URL query
  console.log('editTaskUrlBased (subcollection) called:', { userParamId, todoId, text, date });

  try {
    const todoRef = getUserTodosCollection(userParamId).doc(todoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    // Access control implicitly handled by constructing path with userParamId.
    // The todoDoc.data().userId !== userParamId check is removed.

    const updateData = {
      text: text.trim(),
      date,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await todoRef.update(updateData);
    const updatedTask = {
      id: todoId, ...todoDoc.data(),
      text: text.trim(), date,
      updatedAt: new Date().toISOString()
    };
    res.json({
        success: true,
        action: 'edit',
        user: userParamId,
        taskId: todoId,
        updatedTask: updatedTask
    });
  } catch (error) {
    console.error('Error in editTaskUrlBased (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteTaskUrlBased(req, res, userParamId, todoId) {
  // userParamId is the userId from the URL query
  console.log('deleteTaskUrlBased (subcollection) called:', { userParamId, todoId });

  try {
    const todoRef = getUserTodosCollection(userParamId).doc(todoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    // Access control implicitly handled.

    await todoRef.delete();
    res.status(200).json({ // Changed from 204 to return a JSON confirmation
        success: true,
        action: 'delete',
        user: userParamId,
        taskId: todoId
    });
  } catch (error) {
    console.error('Error in deleteTaskUrlBased (subcollection):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}