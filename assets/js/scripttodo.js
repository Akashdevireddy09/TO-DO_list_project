// Importing the functions that we need from the SDKs 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,getDoc,query,orderBy } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
 
const firebaseConfig = {
    apiKey: "AIzaSyCjnP5ilEeUqkW_hpBqsJrUcldlVoBjf4k",
    authDomain: "mytodolist-fa068.firebaseapp.com",
    projectId: "mytodolist-fa068",
    storageBucket: "mytodolist-fa068.firebasestorage.app",
    messagingSenderId: "1037050677970",
    appId: "1:1037050677970:web:1270451c9d9f1024abfb0b",
    measurementId: "G-E4N3XBX79H" // Optional
  };


// Initializing our Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


const input = document.getElementById("input_task");
const inputDate = document.getElementById("input_date");
const listContainer = document.getElementById("list_container");
const addTaskButton = document.getElementById("add_task_button");
// Firestore Collection Reference (User-Specific)
let todosCollection;
let currentUserId;
let currentFilter = "all"; // Track the currently active filter ('all', 'upcoming', etc.)
let eventListenersInitialized = false; // Flag to track if event listeners are already set up

// Authentication Check
onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed, user:", user ? user.uid : "logged out");
    if (!user) {
        // Redirect to login if not authenticated
        console.log("User not logged in, redirecting...");
        currentUserId = null;
        todosCollection = null;
        window.location.href = 'login.html';
    } else {
        currentUserId = user.uid;
        console.log("User is logged in:", currentUserId);
        document.body.style.display = "block";
        
        // Check if tasks are already loaded
        if (window.tasksAlreadyLoaded) {
            console.log("Tasks already loaded, preventing duplicate load");
            return;
        }
        
        // Initialize todosCollection only once
        todosCollection = collection(db, 'users', user.uid, 'todos');
        
        // Load tasks and set up event listeners
        await displayTasks(currentFilter);
        if (!eventListenersInitialized) {
            setupEventListeners();
            eventListenersInitialized = true;
        }
        
        window.tasksAlreadyLoaded = true;  // SET FLAG AFTER LOADING ONCE
    }
});


function filterTasks(filter) {
    const tasks = document.querySelectorAll(".task");

    tasks.forEach((task) => {
        if (
            (filter === "completed" && task.classList.contains("completed")) ||
            (filter === "upcoming" && task.classList.contains("upcoming")) ||
            (filter === "overdue" && task.classList.contains("overdue"))
        ) {
            task.style.display = "list-item";
        } else {
            task.style.display = "none";
        }
    });
}

//setting up all event listeners for the application
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Set minimum date for the task input date field to today
    const inputDate = document.getElementById("input_date");
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    inputDate.setAttribute('min', formattedDate);

    inputDate.setAttribute('required', 'true');
    
    
    // Add Task Button
    addTaskButton.addEventListener("click", addTask);

    // Allow adding task with Enter key in the input fields
    input.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent default form submission behavior
            addTask();
        }
    });
    inputDate.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            addTask();
        }
    });

     
     // Add required attribute to input date field
     
     

    // Logout Button - COMBINED version (use this and remove the duplicate)
    const logoutButton = document.getElementById("logout_button");
    logoutButton.addEventListener("click", () => {
        signOut(auth).then(() => {
            // Sign-out successful.
            console.log("User signed out");
            window.location.href = 'login.html';
        }).catch((error) => {
            // An error happened.
            console.error("Sign out error", error);
            $.notify("Error signing out.", { className: "error", position: "top center" });
        });
    });

    // Filter Button Listeners
    const filterButtons = document.querySelectorAll(".tab-btn");
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                
                const filterType = this.dataset.filter; // Get filter from data-filter attribute
                console.log("Filter button clicked:", filterType);
                if (filterType !== currentFilter) {
                    displayTasks(filterType); // Reload tasks with the new filter
                }
                       
            });
        });
    } else {
        console.warn("No filter buttons with class 'tab-btn' were found.");
    }

 

    // Date range filter functionality
    const fromDateInput = document.querySelector('.from_date input');
    const toDateInput = document.querySelector('.to_date input');
    const searchButton = document.querySelector('.search_button');
    const resetButton = document.querySelector('.reset_button');
    
    // Search button click handler
    searchButton.addEventListener('click', () => {
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        
        if (fromDate && toDate) {
            filterTasksByDateRange(fromDate, toDate);
        } else {
            $.notify("Please select both start and end dates", { className: "warn", position: "top center" });
        }
    });
    
    // Reset button click handler
    resetButton.addEventListener('click', () => {
        fromDateInput.value = '';
        toDateInput.value = '';
        displayTasks(currentFilter); // Reset to current filter view
        $.notify("Date filter reset", { className: "info", position: "top center" });
    });
    

}


async function addTask() {
    const taskText = input.value.trim();
    const taskDate = inputDate.value;

    if (taskText === "") {
        $.notify("Task cannot be empty!", { className: "error", position: "top center" });
        return; // Exit if task is empty
    }

    // Validate that date is provided
    if (!taskDate) {
        $.notify("Please select a due date for your task!", { className: "error", position: "top center" });
        return; // Exit if date is empty
    }

    // Check if date is not in the past
    const selectedDate = new Date(taskDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        $.notify("Due date cannot be in the past!", { className: "error", position: "top center" });
        return; // Exit if date is in the past
    }
    
    if (!todosCollection) {
        $.notify("Error: User collection not ready.", { className: "error", position: "top center" });
        return;
    }
    
    if (taskText !== "") {
        try {
            const docRef=await addDoc(todosCollection, {  // Use addDoc() from modular SDK
                text: taskText,
                date: taskDate,
                completed: false, // Initialize completed status
                archived: false, // Initialize archived status
                createdAt: new Date()
            });
            console.log("Document written with ID: ", docRef.id);
            
            input.value = "";
            inputDate.value = "";

            await displayTasks(currentFilter); // Refresh list with the current filter
            $.notify("Task added successfully!", { className: "success", position: "top center" });

        } catch (e) {
            $.notify("Task cannot be empty!", { className: "error", position: "top center" });
            console.error("Error adding document: ", e);

        }
    }
}


/**
 * Fetches tasks from Firestore based on the filter and displays them.
 * @param {string} filterType - 'all', 'upcoming', 'overdue', 'completed'
 */

async function displayTasks(filterType = "all") {
    currentFilter = filterType; // Update global filter state
    if (!todosCollection) {
        console.log("Todos collection not initialized yet.");
        return;
    }
         // Clear previous tasks
        listContainer.innerHTML = "";
    try {
        const user = auth.currentUser;
        if (!user){
            console.error("No authenticated user found");
         return;
        }
            

        const q = query(collection(db, 'users', user.uid, 'todos'), orderBy("date", "asc"));
        const querySnapshot = await getDocs(q);
        // const taskList = document.getElementById("list_container");

        

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let tasksToDisplay = [];

        querySnapshot.forEach((doc) => {
            const task = { id: doc.id, ...doc.data() };
            const isCompleted = task.completed;
            const isArchived = task.archived || false; // Default to false if field missing
            const taskDueDate = task.date ? new Date(task.date) : null;
            
            console.log(`Task: ${task.text}, Completed: ${isCompleted}, Archived: ${isArchived}, Due: ${taskDueDate}`);

            // Filter Logic
            let shouldDisplay = false;
            switch (filterType) {
                case "all":
                    // Show only active (not completed, not archived) tasks
                    if ( !isArchived) shouldDisplay = true;
                    break;
                case "upcoming":
                    // Show active tasks that are due today/future or have no date
                    if (!isCompleted && !isArchived) {
                        if (!taskDueDate) {
                            // No due date, consider as upcoming
                            shouldDisplay = true;
                        } else {
                            // Due date exists, check if it's today or in the future
                            taskDueDate.setHours(23, 59, 59, 999); // End of due day
                            if (taskDueDate >= today) {
                                shouldDisplay = true;
                            }
                        }
                    }
                    break;
                case "overdue":
                     // Show active tasks that are past due
                     if (!isCompleted && !isArchived && taskDueDate) {
                        taskDueDate.setHours(23, 59, 59, 999); // End of due day
                        if (taskDueDate < today) {
                            shouldDisplay = true;
                        }
                    }
                    break;
                case "completed":
                    // Show ALL completed tasks (archived or not)
                    if (isCompleted) shouldDisplay = true;
                    break;
                default: // Default should be 'all'
                    if (!isArchived) shouldDisplay = true;
                    break;
            }

            if (shouldDisplay) {
                tasksToDisplay.push(task);
            }
        });
 

        console.log(`${tasksToDisplay.length} tasks pass the filter and will be displayed.`);

        // Client-side Sorting (more flexible than Firestore multi-field ordering here)
         tasksToDisplay.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : null;
            const dateB = b.date ? new Date(b.date) : null;
            const archivedA = a.archived || false;
            const archivedB = b.archived || false;

            // In 'Completed' view, put non-archived completed first, then sort by date
            if (filterType === 'completed') {
                if (archivedA !== archivedB) {
                    return archivedA ? 1 : -1; // Archived go last
                }
            }
            // For all views (including secondary sort for completed): sort by date
            if (!dateA && !dateB) return 0; // Both no date
            if (!dateA) return 1;          // a has no date, goes after b
            if (!dateB) return -1;         // b has no date, goes after a
            return dateA - dateB;          // Sort by date ascending
         });


        // Append sorted and filtered tasks to the DOM
        tasksToDisplay.forEach(task => appendTask(task));

        // Update visual state of filter buttons
        updateFilterButtonStates();
       
        

    } catch (e) {
        console.error("Error displaying tasks: ", e);
        $.notify("Error loading tasks.", { className: "error", position: "top center" });

    }
}
/**
 * Appends a task to the task list in the DOM
 * @param {Object} task - The task object to append
 */
function appendTask(task) {
    
    // Create list item
    const li = document.createElement("li");
    li.setAttribute("data-id", task.id); // Store task ID
    li.setAttribute("data-date", task.date); // Store task due date for sorting

    // const isArchived = task.archived || false;

    // Create task text
    const taskText = document.createElement("span");
    taskText.textContent = task.text;
    taskText.classList.add("task-text");

    // Add appropriate classes based on task status
    if (task.completed) {
        li.classList.add("checked");
        if (task.archived) {
            li.classList.add("archived"); // Style archived tasks differently if needed
        }
    }else {
        // Check for overdue only if not completed/archived
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (task.date) {
            const taskDueDate = new Date(task.date);
            taskDueDate.setHours(23, 59, 59, 999); // End of the due day
            
            if (taskDueDate < today) {
                li.classList.add("overdue");
            }
        }
    }

    li.appendChild(taskText);

    const detailsContainer = document.createElement('div'); // Container for date and buttons
     detailsContainer.style.display = 'flex';
     detailsContainer.style.alignItems = 'center';
     detailsContainer.style.marginLeft = 'auto'; // Push to the right

     if (task.date) {
        const dueDateSpan = document.createElement("span"); // Changed to span for inline flex layout
        // You could format the date nicer here e.g., using toLocaleDateString()
        dueDateSpan.textContent = `Due: ${task.date}`;
        dueDateSpan.classList.add("due-date");
        detailsContainer.appendChild(dueDateSpan);
    }


  
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container"); // New container for icons
    
    const editBtn = document.createElement("span");
    editBtn.classList.add("edit");
    if (task.archived) {
        editBtn.classList.add("disabled"); // Disable editing for archived tasks
    } else {
        // Only add listener if not archived
        editBtn.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent li click (toggleComplete)
            openEditPopup(task);
        });
    }
    buttonContainer.appendChild(editBtn);
    
    const deleteOrArchiveBtn = document.createElement("span");
    deleteOrArchiveBtn.classList.add("delete");
    
    if (task.completed) {
        // If already completed, button becomes "Archive"
        // deleteOrArchiveBtn.title = "Archive Task";
        deleteOrArchiveBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await archiveTask(task.id);
            $.notify("Task archived.", { className: "info", position: "top center" });
        });
    } else {
        // If not completed, button is "Delete Permanently"
        // deleteOrArchiveBtn.title = "Delete Task Permanently";
        deleteOrArchiveBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            // Optional: Add confirmation dialog
             if (confirm("Are you sure you want to permanently delete this task?")) {
                 await deleteTaskPermanently(task.id);
                 $.notify("Task deleted permanently.", { className: "info", position: "top center" });
             }
        });
    }
    buttonContainer.appendChild(deleteOrArchiveBtn);
    detailsContainer.appendChild(buttonContainer); // Add button container to details div
    li.appendChild(detailsContainer); // Add details container to list item

    // --- Click Listener for Toggling Completion (on the whole li) ---
    li.addEventListener("click", async () => {
    await toggleComplete(task.id);
    // Notify only when marking as complete (and not archived yet)
     const taskRef = doc(todosCollection, task.id);
     const docSnap = await getDoc(taskRef);
     if (docSnap.exists() && docSnap.data().completed && !docSnap.data().archived) {
         $.notify("Wohoo..! Task completed!", { className: "success", position: "top center" });
     }
});

// --- Append to List ---
listContainer.appendChild(li);
}

/**
 * Toggles the completion status of a task
 * @param {string} taskId - The ID of the task to toggle
 */

async function toggleComplete(taskId) {
        try {
            // Define Firestore document path
            const taskRef =  doc(db, 'users', auth.currentUser.uid, 'todos', taskId); // If using user-specific tasks
    
            const docSnapshot = await getDoc(taskRef);
    
            if (docSnapshot.exists()) {
                const taskData = docSnapshot.data();
                const newStatus = !taskData.completed; // Toggle completion
    
                let updates = { completed: newStatus };
    
                // If marking task as incomplete, unarchive it
                if (!taskData.archived) {
                    updates.archived = false; // Ensure task is unarchived when changing status
                }
                
    
                // Update Firestore
                await updateDoc(taskRef, updates);
    
                // **Instantly update UI**
                const taskElement = document.querySelector(`[data-id="${taskId}"]`);
                if (taskElement) {
                    taskElement.classList.toggle("checked", newStatus);
                }
    
                // **Show notification**
                $.notify(`Task marked as ${newStatus ? "completed" : "incomplete"}.`, { 
                    className: "info", 
                    position: "top center" 
                });
    
                console.log(`Task ${taskId} completion toggled to ${newStatus}.`);
    
            } else {
                console.log("Task not found:", taskId);
            }
        } catch (e) {
            console.error("Error toggling task status:", e);
            $.notify("Error updating task status.", { className: "error", position: "top center" });
        }
    }

/**
 * Permanently deletes a task
 * @param {string} taskId - The ID of the task to delete
 */

async function deleteTaskPermanently(taskId) {
        if (!todosCollection) return;
        const taskRef = doc(todosCollection, taskId);
        try {
            await deleteDoc(taskRef);
            console.log(`Task ${taskId} permanently deleted.`);
            // Optionally remove directly from DOM for instant feedback before potential refresh
            const taskElement = listContainer.querySelector(`li[data-id="${taskId}"]`);
            if (taskElement) taskElement.remove();
            // You might still call displayTasks if counts etc. need updating,
            // but direct removal feels faster for deletion.
            // await displayTasks(currentFilter);
        } catch (e) {
            console.error("Error permanently deleting document: ", e);
            $.notify("Error deleting task.", { className: "error", position: "top center" });
        }
    }
    
    /**
     * Marks a *completed* task as 'archived' in Firestore.
     * @param {string} taskId - The ID of the task document.
     */
    async function archiveTask(taskId) {
        if (!todosCollection) return;
        const taskRef = doc(todosCollection, taskId);
        try {
            // Safety check: ensure task exists and is completed before archiving
            const docSnapshot = await getDoc(taskRef);
            if (docSnapshot.exists() && docSnapshot.data().completed) {
                 await updateDoc(taskRef, { archived: true });
                 console.log(`Task ${taskId} archived.`);
                 await displayTasks(currentFilter); // Refresh list to hide from 'All'/show in 'Completed'
            } else {
                 console.log(`Task ${taskId} not found or not completed, cannot archive.`);
                 $.notify("Only completed tasks can be archived.", { className: "warn", position: "top center" });
            }
        } catch (e) {
            console.error("Error archiving document: ", e);
            $.notify("Error archiving task.", { className: "error", position: "top center" });
        }
    }

/**
 * Creates and displays a popup for editing task text and date.
 * @param {object} task - The task object being edited.
 */

function openEditPopup(task) {
    // Prevent editing archived tasks
    if (task.archived) {
        $.notify("Cannot edit an archived task.", { className: "warn", position: "top center" });
        return;
    }

    // Close any existing popup first
    const existingPopup = document.querySelector(".popup");
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }

    // Create the popup container
    const popup = document.createElement("div");
    popup.classList.add("popup");

    // Task input field
    const taskInput = document.createElement("input");
    taskInput.type = "text";
    taskInput.value = task.text;

    // Date input field
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = task.date;

    // Create a container for the buttons
    const buttonRow = document.createElement("div");
    buttonRow.classList.add("popup-button-row");

    // Create Save Button (Span with SVG)
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save Changes";
    saveButton.classList.add("save");
    saveButton.type = "button";
    saveButton.title = "Save Changes";

    saveButton.addEventListener("click", async () => {
        const newText = taskInput.value.trim();
        const newDate = dateInput.value || null;
        if (newText) {
            try {
                await updateTask(task.id, newText, newDate);
                document.body.removeChild(popup);
                $.notify("Task updated!", { className: "success", position: "top center" });
            } catch (error) {
                $.notify("Error updating task.", { className: "error", position: "top center" });
            }
        } else {
            $.notify("Task text cannot be empty.", { className: "error", position: "top center" });
        }
    });

    // Create Cancel Button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.classList.add("cancel-button");
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => {
        document.body.removeChild(popup);
    });

    // Append elements to popup
    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(saveButton);

    popup.appendChild(taskInput);
    popup.appendChild(dateInput);
    popup.appendChild(buttonRow);

    // Append popup to body and focus
    document.body.appendChild(popup);
    taskInput.focus();
}

/**
 * Updates a task's text and date in Firestore
 * @param {string} taskId - The ID of the task to update
 * @param {string} newText - The new text for the task
 * @param {string} newDate - The new date for the task
 */

async function updateTask(taskId, newText, newDate) {
    if (!todosCollection) return;
    const taskRef = doc(todosCollection, taskId);
    try {
        await updateDoc(taskRef, {
            text: newText,
            date: newDate
            // Does not change completed or archived status
        });
        console.log(`Task ${taskId} updated.`);
        await displayTasks(currentFilter); // Refresh list
    } catch (e) {
        console.error("Error updating document: ", e);
         $.notify("Error updating task.", { className: "error", position: "top center" });
    }
}

/**
 * Updates the active state of filter buttons based on the current filter
 */

function updateFilterButtonStates() {
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => {
        const btnFilterType = btn.dataset.filter;
        if (btnFilterType === currentFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Filters tasks to show only those within the specified date range
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 */
async function filterTasksByDateRange(fromDate, toDate) {
    if (!todosCollection) {
        console.log("Todos collection not initialized yet.");
        return;
    }
    
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        // Convert string dates to Date objects for comparison
        // Modified code for proper month handling
        const [startYear, startMonth, startDay] = fromDate.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay); // Month is 0-indexed in JavaScript
        startDate.setHours(0, 0, 0, 0);

        const [endYear, endMonth, endDay] = toDate.split('-').map(Number);
        const endDate = new Date(endYear, endMonth - 1, endDay); // Month is 0-indexed in JavaScript
        endDate.setHours(23, 59, 59, 999);
        // Clear the current list
        listContainer.innerHTML = "";
        
        // Get all tasks from current filter
        const q = query(collection(db, 'users', user.uid, 'todos'), orderBy("date", "asc"));
        const querySnapshot = await getDocs(q);
        
        let tasksInRange = [];
        
        querySnapshot.forEach((doc) => {
            const task = { id: doc.id, ...doc.data() };
            
            // Skip tasks without dates
            if (!task.date) return;
            
            const taskDate = new Date(task.date);
            taskDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
            
            // Check if task is within date range
            if (taskDate >= startDate && taskDate <= endDate) {
                const isCompleted = task.completed;
                const isArchived = task.archived || false;
                
                // Apply current filter logic within date range
                let shouldDisplay = false;
                switch (currentFilter) {
                    case "all":
                        if (!isArchived) shouldDisplay = true;
                        break;
                    case "upcoming":
                        if (!isCompleted && !isArchived) shouldDisplay = true;
                        break;
                    case "overdue":
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (!isCompleted && !isArchived && taskDate < today) shouldDisplay = true;
                        break;
                    case "completed":
                        if (isCompleted) shouldDisplay = true;
                        break;
                    default:
                        if (!isArchived) shouldDisplay = true;
                        break;
                }
                
                if (shouldDisplay) {
                    tasksInRange.push(task);
                }
            }
        });
        
        // Sort tasks by date
        tasksInRange.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : null;
            const dateB = b.date ? new Date(b.date) : null;
            
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });
        
        // Display filtered tasks
        if (tasksInRange.length > 0) {
            tasksInRange.forEach(task => appendTask(task));
            $.notify(`Found ${tasksInRange.length} tasks in the selected date range`, { className: "success", position: "top center" });
        } else {
            // Show a message in the list container when no tasks are found
            const noTasksMessage = document.createElement("li");
            noTasksMessage.classList.add("no-tasks-message");
            noTasksMessage.textContent = "No tasks found in the selected date range";
            listContainer.appendChild(noTasksMessage);
            
            $.notify("No tasks found in the selected date range", { className: "info", position: "top center" });
        }
        
        // Update the filter buttons
        updateFilterButtonStates();
        
    } catch (error) {
        console.error("Error filtering tasks by date range:", error);
        $.notify("Error filtering tasks by date range", { className: "error", position: "top center" });
    }
}




    

 

