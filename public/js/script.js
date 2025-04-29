// --- Keep Auth Imports, Add getIdToken ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, getIdToken } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
// --- Remove Firestore Imports ---
// import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";


const firebaseConfig = { apiKey: "AIzaSyCjnP5ilEeUqkW_hpBqsJrUcldlVoBjf4k",
  authDomain: "mytodolist-fa068.firebaseapp.com",
  projectId: "mytodolist-fa068",
  storageBucket: "mytodolist-fa068.firebasestorage.app",
  messagingSenderId: "1037050677970",
  appId: "1:1037050677970:web:1270451c9d9f1024abfb0b",
  measurementId: "G-E4N3XBX79H" // Optional
};

// --- Initialize Firebase App & Auth ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// --- API Configuration ---
const API_BASE_URL = '/api'; // Assumes hosting rewrite is configured

// --- DOM Elements (Keep) ---
const input = document.getElementById("input_task");
const inputDate = document.getElementById("input_date");
const listContainer = document.getElementById("list_container");
const addTaskButton = document.getElementById("add_task_button");
// Add other selectors if needed (e.g., filter buttons, date inputs)
const fromDateInput = document.querySelector('.from_date input');
const toDateInput = document.querySelector('.to_date input');
const searchButton = document.querySelector('.search_button');
const resetButton = document.querySelector('.reset_button');
const logoutButton = document.getElementById("logout_button");


// --- State Variables ---
let currentUserId = null; // Still useful for frontend context if needed
let currentFilter = "all"; // Track the currently active filter ('all', 'upcoming', etc.)
let eventListenersInitialized = false; // Flag to track if event listeners are already set up

// --- Helper: Get Firebase Auth ID Token ---
async function getAuthToken() {
    if (!auth.currentUser) {
        console.warn("User not logged in. Cannot get token.");
        // Optional: Redirect to login or show error
        // window.location.href = 'login.html'; // Might cause loops if called incorrectly
        return null;
    }
    try {
        // forceRefresh = true can be useful if tokens expire quickly during testing
        const token = await getIdToken(auth.currentUser, /* forceRefresh */ false);
        return token;
    } catch (error) {
        console.error("Error getting auth token:", error);
        // Handle specific errors, like token expiration
        if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
             console.warn("Token expired or invalid, attempting sign out and redirect.");
             await signOut(auth).catch(e => console.error("Sign out error during token refresh failure:", e));
             window.location.href = 'login.html'; // Force re-login
        }
        return null;
    }
}

// --- API Fetch Wrapper ---
async function fetchAPI(endpoint, options = {}) {
    const token = await getAuthToken();
    if (!token) {
        console.error("API call cancelled: No auth token available.");
        // Potentially notify user or redirect, but avoid loops
        if (!window.location.pathname.endsWith('login.html')) {
             // Avoid redirect loop if already on login page
             // window.location.href = 'login.html';
        }
        return null; // Indicate failure due to missing token
    }

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        // Only set Content-Type if body exists and is likely JSON
        ...(options.body && typeof options.body !== 'string' && { 'Content-Type': 'application/json' }),
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers, // Allow overriding headers
        },
    };

    // Stringify body if it's an object and method is not GET/HEAD
    if (options.body && typeof options.body === 'object' && !['GET', 'HEAD'].includes(options.method?.toUpperCase())) {
         config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Check for non-OK status codes first
        if (!response.ok) {
            let errorBody = "An error occurred."; // Default error
            try {
                 // Try to parse error message from backend response (plain text or JSON)
                 const textResponse = await response.text();
                 try {
                      const jsonResponse = JSON.parse(textResponse);
                      errorBody = jsonResponse.message || jsonResponse.error || textResponse; // Look for common error fields
                 } catch (e) {
                      errorBody = textResponse || `HTTP error! Status: ${response.status}`; // Use plain text if not JSON
                 }
            } catch (e) {
                 errorBody = `HTTP error! Status: ${response.status}`; // Fallback if reading body fails
            }

            console.error(`API Error ${response.status}: ${errorBody}`);
            $.notify(`Error: ${errorBody}`, { className: "error", position: "top center" });

            if (response.status === 401 || response.status === 403) {
                // Unauthorized or Forbidden - Token might be invalid/expired, or permissions issue
                console.warn("Received 401/403, likely token issue. Redirecting to login.");
                 await signOut(auth).catch(e => console.error("Sign out error on 401/403:", e));
                 if (!window.location.pathname.endsWith('login.html')) {
                     window.location.href = 'login.html';
                 }
            }
            return null; // Indicate failure
        }

        // Handle successful responses
        if (response.status === 204) { // No Content (e.g., successful DELETE)
            return { success: true, status: 204 }; // Indicate success
        }

        // Try to parse JSON for other successful responses (200, 201)
        try {
            const data = await response.json();
            return data; // Return the parsed JSON data
        } catch (jsonError) {
             // If response was OK but not JSON (unexpected but possible)
             console.warn("API response was OK but not valid JSON:", response.status);
             // You might want to return success or handle differently based on status code
             return { success: true, status: response.status }; // Indicate success, but no JSON body
        }

    } catch (error) {
        console.error("Network or fetch error:", error);
        $.notify("Network error. Please check your connection and try again.", { className: "error", position: "top center" });
        return null; // Indicate failure
    }
}


// --- Authentication Check ---
onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed, user:", user ? user.uid : "logged out");
    if (!user) {
        // Redirect to login if not authenticated
        console.log("User not logged in, redirecting...");
        currentUserId = null;
        eventListenersInitialized = false; // Reset listener flag on logout
        window.tasksAlreadyLoaded = false; // Reset load flag
        listContainer.innerHTML = ""; // Clear task list
        document.body.style.display = "none"; // Hide content
        // Redirect only if not already on login page
        if (!window.location.pathname.endsWith('login.html')) {
             window.location.href = 'login.html';
        }
    } else {
        currentUserId = user.uid; // Set user ID (mostly for context now)
        console.log("User is logged in:", currentUserId);
        document.body.style.display = "block"; // Show content

        // Initialize event listeners ONCE after login
        if (!eventListenersInitialized) {
            setupEventListeners();
            eventListenersInitialized = true;
        }

        // Load tasks for the current filter on login/page refresh
        await displayTasks(currentFilter);
    }
});

// --- Event Listener Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Input field setup ---
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    if(inputDate) {
        inputDate.setAttribute('min', formattedDate);
        inputDate.setAttribute('required', 'true');
        inputDate.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                addTask(); // Call refactored addTask
            }
        });
    } else {
        console.warn("Date input field not found");
    }

    if(input) {
        input.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                addTask(); // Call refactored addTask
            }
        });
    } else {
         console.warn("Task text input field not found");
    }

    if(addTaskButton) {
        addTaskButton.addEventListener("click", addTask); // Call refactored addTask
    } else {
         console.warn("Add task button not found");
    }

    // --- Logout Button ---
     if(logoutButton) {
        logoutButton.addEventListener("click", () => {
            signOut(auth).then(() => {
                console.log("User signed out");
                // onAuthStateChanged will handle redirect
            }).catch((error) => {
                console.error("Sign out error", error);
                $.notify("Error signing out.", { className: "error", position: "top center" });
            });
        });
     } else {
          console.warn("Logout button not found");
     }


    // --- Filter Button Listeners ---
    const filterButtons = document.querySelectorAll(".tab-btn");
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            // Remove previous listeners if setupEventListeners is called multiple times (defensive)
            button.replaceWith(button.cloneNode(true)); // Clone to remove old listeners
        });
        // Re-select buttons after cloning
        document.querySelectorAll(".tab-btn").forEach(button => {
             button.addEventListener('click', function() {
                 document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove('active'));
                 this.classList.add('active');
                 const filterType = this.dataset.filter;
                 console.log("Filter button clicked:", filterType);
                 displayTasks(filterType); // Call refactored displayTasks
             });
        });
         // Set initial active button state based on currentFilter
         updateFilterButtonStates();
    } else {
        console.warn("No filter buttons with class 'tab-btn' were found.");
    }

    // --- Date Range Filter Functionality ---
     if(searchButton && resetButton && fromDateInput && toDateInput) {
         searchButton.addEventListener('click', () => {
             const fromDate = fromDateInput.value;
             const toDate = toDateInput.value;
             if (fromDate && toDate) {
                 filterTasksByDateRange(fromDate, toDate); // Call refactored date range filter
             } else {
                 $.notify("Please select both start and end dates", { className: "warn", position: "top center" });
             }
         });

         resetButton.addEventListener('click', () => {
             fromDateInput.value = '';
             toDateInput.value = '';
             displayTasks(currentFilter); // Reset to current filter view
             $.notify("Date filter reset", { className: "info", position: "top center" });
         });
     } else {
          console.warn("Date range filter elements not found.");
     }
}

// Add this function to your script.js
function updateFilterButtonStates() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === currentFilter) {
            btn.classList.add('active');
        }
    });
}

// --- Add Task (API Call) ---
async function addTask() {
    const taskText = input.value.trim();
    const taskDate = inputDate.value; // Should be 'YYYY-MM-DD'

    // --- Keep frontend validation for immediate feedback ---
    if (taskText === "") {
        $.notify("Task cannot be empty!", { className: "error", position: "top center" });
        return;
    }
    if (!taskDate) {
        $.notify("Please select a due date for your task!", { className: "error", position: "top center" });
        return;
    }
    // Basic past date check (backend validation is definitive)
    const selectedDate = new Date(taskDate + "T00:00:00"); // Ensure time part doesn't affect comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
        $.notify("Due date cannot be in the past!", { className: "error", position: "top center" });
        return;
    }
    // --- End frontend validation ---

    const newTaskData = {
        text: taskText,
        date: taskDate, // Send as 'YYYY-MM-DD' string
    };

    $.notify("Adding task...", { className: "info", position: "top center", autoHideDelay: 1500 });
    const addedTask = await fetchAPI('/todos', {
        method: 'POST',
        body: newTaskData // fetchAPI stringifies
    });

    if (addedTask && addedTask.id) {
        input.value = "";
        inputDate.value = "";
        await displayTasks(currentFilter); // Refresh list with current filter
        $.notify("Task added successfully!", { className: "success", position: "top center" });
    } else {
        // Error/validation failure message handled by fetchAPI or backend response
        console.error("Failed to add task via API.");
    }
}

// --- Display Tasks Function ---
async function displayTasks(filterType = 'all') {
    console.log(`Displaying tasks with filter: ${filterType}`);
    currentFilter = filterType; // Update current filter state
    
    // Update UI to reflect the current filter
    updateFilterButtonStates();
    
    // Build query parameters for API request
    let endpoint = '/todos';
    const queryParams = [];
    
    if (filterType && filterType !== 'all') {
        queryParams.push(`filter=${filterType}`);
    }
    
    // Append query parameters if any exist
    if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
    }
    
    try {
        $.notify("Loading tasks...", { className: "info", position: "top center", autoHideDelay: 1000 });
        const tasks = await fetchAPI(endpoint, { method: 'GET' });
        
        if (!tasks) {
            // fetchAPI returns null on error, which it already handles with notifications
            listContainer.innerHTML = '<p class="no-tasks">Could not load tasks. Please try again.</p>';
            return;
        }
        
        if (tasks.length === 0) {
            listContainer.innerHTML = '<p class="no-tasks">No tasks found for the selected filter.</p>';
            return;
        }
        
        // Clear and rebuild task list
        listContainer.innerHTML = '';
        
        // Sort tasks if needed (backend might already sort them)
        tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Create task elements
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            listContainer.appendChild(taskElement);
        });
        
    } catch (error) {
        console.error("Error displaying tasks:", error);
        $.notify("Error loading tasks. Please try again.", { className: "error", position: "top center" });
        listContainer.innerHTML = '<p class="no-tasks">Error loading tasks.</p>';
    }
}

// Create task DOM element helper function
function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskItem.setAttribute('data-id', task.id);
    
    // Format date for display
    const taskDate = new Date(task.date + 'T00:00:00');
    const formattedDate = taskDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
    
    // Determine if task is overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = !task.completed && taskDate < today;
    
    taskItem.innerHTML = `
        <div class="task-content">
            <div class="task-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
            </div>
            <div class="task-text ${isOverdue ? 'overdue' : ''}">
                <span>${task.text}</span>
                <div class="task-date">${formattedDate}</div>
            </div>
        </div>
        <div class="task-actions">
            ${!task.completed ? `<button class="edit-btn">Edit</button>` : ''}
            ${task.completed && !task.archived ? `<button class="archive-btn">Archive</button>` : ''}
            <button class="delete-btn">Delete</button>
        </div>
    `;
    
    // Add event listeners to task actions
    const checkbox = taskItem.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
    
    if (!task.completed) {
        const editBtn = taskItem.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => editTask(task));
    }
    
    if (task.completed && !task.archived) {
        const archiveBtn = taskItem.querySelector('.archive-btn');
        archiveBtn.addEventListener('click', () => archiveTask(task.id));
    }
    
    const deleteBtn = taskItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return taskItem;
}

// Function for date range filtering
async function filterTasksByDateRange(fromDate, toDate) {
    console.log(`Filtering tasks by date range: ${fromDate} to ${toDate}`);
    
    // Build query parameters
    let endpoint = '/todos';
    const queryParams = [];
    
    if (currentFilter && currentFilter !== 'all') {
        queryParams.push(`filter=${currentFilter}`);
    }
    
    queryParams.push(`fromDate=${fromDate}`);
    queryParams.push(`toDate=${toDate}`);
    
    endpoint += `?${queryParams.join('&')}`;
    
    try {
        $.notify("Loading filtered tasks...", { className: "info", position: "top center", autoHideDelay: 1000 });
        const tasks = await fetchAPI(endpoint, { method: 'GET' });
        
        if (!tasks) {
            listContainer.innerHTML = '<p class="no-tasks">Could not load tasks. Please try again.</p>';
            return;
        }
        
        if (tasks.length === 0) {
            listContainer.innerHTML = '<p class="no-tasks">No tasks found for the selected date range.</p>';
            return;
        }
        
        // Clear and rebuild task list
        listContainer.innerHTML = '';
        
        // Create task elements
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            listContainer.appendChild(taskElement);
        });
        
    } catch (error) {
        console.error("Error filtering tasks by date:", error);
        $.notify("Error loading filtered tasks.", { className: "error", position: "top center" });
    }
}

// Toggle task completion status
async function toggleTaskComplete(taskId) {
    try {
        const result = await fetchAPI(`/todos/${taskId}/complete`, {
            method: 'PATCH'
        });
        
        if (result) {
            await displayTasks(currentFilter); // Refresh list
            $.notify("Task status updated", { className: "success", position: "top center" });
        }
    } catch (error) {
        console.error("Error toggling task completion:", error);
        $.notify("Failed to update task status", { className: "error", position: "top center" });
    }
}

// Edit task handler (prepare for editing)
function editTask(task) {
    // This could open a modal/form or inline editing
    // Simple implementation - prompt for new values
    const newText = prompt("Update task text:", task.text);
    if (newText === null) return; // User cancelled
    
    const newDate = prompt("Update due date (YYYY-MM-DD):", task.date);
    if (newDate === null) return; // User cancelled
    
    // Validate date format
    if (newDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        $.notify("Invalid date format. Use YYYY-MM-DD", { className: "error", position: "top center" });
        return;
    }
    
    // Call API to update task
    updateTask(task.id, { 
        text: newText || task.text,
        date: newDate || task.date
    });
}

// Update task API call
async function updateTask(taskId, updates) {
    try {
        const result = await fetchAPI(`/todos/${taskId}`, {
            method: 'PUT',
            body: updates
        });
        
        if (result) {
            await displayTasks(currentFilter); // Refresh list
            $.notify("Task updated successfully", { className: "success", position: "top center" });
        }
    } catch (error) {
        console.error("Error updating task:", error);
        $.notify("Failed to update task", { className: "error", position: "top center" });
    }
}

// Archive task
async function archiveTask(taskId) {
    try {
        const result = await fetchAPI(`/todos/${taskId}/archive`, {
            method: 'PATCH'
        });
        
        if (result) {
            await displayTasks(currentFilter); // Refresh list
            $.notify("Task archived", { className: "success", position: "top center" });
        }
    } catch (error) {
        console.error("Error archiving task:", error);
        $.notify("Failed to archive task", { className: "error", position: "top center" });
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }
    
    try {
        const result = await fetchAPI(`/todos/${taskId}`, {
            method: 'DELETE'
        });
        
        if (result) {
            await displayTasks(currentFilter); // Refresh list
            $.notify("Task deleted", { className: "success", position: "top center" });
        }
    } catch (error) {
        console.error("Error deleting task:", error);
        $.notify("Failed to delete task", { className: "error", position: "top center" });
    }
}