// Importing the functions that we need from the SDKs 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,getDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
 
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

// Authentication Check
onAuthStateChanged(auth, async (user) => {  // Pass 'auth' to onAuthStateChanged
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    } else {
        // User is signed in. You can access user.uid here.
        document.body.style.display = "block";
        console.log("User is logged in:", user.uid);

        // Initialize todosCollection here, after ensuring the user is logged in
        const db = getFirestore();
        todosCollection = collection(db, 'users', user.uid, 'todos'); // Use collection() from modular SDK

        // Call displayTasks() or other functions to load user-specific data.
        displayTasks(); 
    }
});

async function addTask() {
    const taskText = input.value.trim();
    const taskDate = inputDate.value || "No due date";

    if (taskText !== "") {
        try {
            const docRef=await addDoc(todosCollection, {  // Use addDoc() from modular SDK
                text: taskText,
                date: taskDate,
                completed: false
            });
            
            input.value = "";
            inputDate.value = "";

            appendTask({id:docRef.id, text:taskText,date:taskDate,completed:false});
            $.notify("Task added successfully!", { className: "success", position: "top center" });

        } catch (e) {
            $.notify("Task cannot be empty!", { className: "error", position: "top center" });
            console.error("Error adding document: ", e);

        }
    }
}

  
addTaskButton.addEventListener("click", addTask);
addTaskButton.addEventListener("click", function() {
    $.notify("Task added successfully!", { className: "success", position: "top center" });
});

async function displayTasks(filterType = "all") {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'todos'));
        const taskList = document.getElementById("list_container");

        // Clear previous tasks
        taskList.innerHTML = "";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        querySnapshot.forEach((doc) => {
            const task = doc.data();
            const taskDue = new Date(task.date);
            taskDue.setHours(23, 59, 59, 999);
            const isOverdue = taskDue < today && !task.completed;
            const isUpcoming = taskDue >= today && !task.completed;
            const isCompleted = task.completed;

            // Apply Filter
            if (
                (filterType === "overdue" && !isOverdue) ||
                (filterType === "upcoming" && !isUpcoming) ||
                (filterType === "completed" && !isCompleted)
            ) {
                return; // Skip tasks that don't match the filter
            }

            appendTask({ id: doc.id, ...task });
        });

    } catch (e) {
        console.error("Error displaying tasks: ", e);
    }
}



function appendTask(task) {
    const taskList = document.getElementById("list_container");

    // Create list item
    const li = document.createElement("li");
    li.setAttribute("data-id", task.id); // Store task ID
    li.setAttribute("data-date", task.date); // Store task due date for sorting

    // Create task text
    const taskText = document.createElement("span");
    taskText.innerText = task.text;

    // Create due date as a subscript
    // const dueDate = document.createElement("div");
    // dueDate.innerText = ` ${task.date}`;
    // dueDate.classList.add("due-date"); // Add a class for styling

    // Append elements inside list item
    li.appendChild(taskText);
    li.appendChild(document.createElement("br")); // Line break for better formatting
    


    if (task.completed) {
        li.classList.add("checked");
    }

    // Click event to toggle completion
    li.addEventListener("click", function () {
        toggleComplete(task.id); // First, toggle the task completion
    
        // Then, show notification
        $.notify("Wohoo..! You did it, congrats buddy", { 
            className: "success", 
            position: "top center" 
        });
    });
    taskList.appendChild(li); // Append the list item to the task list
    
    // const taskDueDate = task.date || inputDate.value; // Use stored task date or input date

    const taskDue = new Date(task.date);
      taskDue.setHours(23, 59, 59, 999);  
    // const isOverdue = taskDueDate && new Date(taskDueDate) < new Date();
      const today = new Date();
       today.setHours(0, 0, 0, 0); // Reset time to 00:00:00 for accurate date comparison

      

       if (taskDue < today && !task.completed) {
        li.classList.add("overdue");
    }
    
    
    // Create task due date display
    const dueDate = document.createElement("div");
    dueDate.innerText = ` ${task.date}`;
    dueDate.classList.add("due-date");
    
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container"); // New container for icons
    
    const editBtn = document.createElement("span");
    editBtn.classList.add("edit");
    editBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openEditPopup(task);
    });
    buttonContainer.appendChild(editBtn);
    
    const deleteBtn = document.createElement("span");
    deleteBtn.classList.add("delete");
    deleteBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteTask(task.id);
        $.notify("Task deleted successfully!", { className: "error", position: "top center" });
    });
    buttonContainer.appendChild(deleteBtn);

    li.appendChild(dueDate);
    li.appendChild(buttonContainer);

    //Inserting tasks in sorted Array
    const items=Array.from(taskList.children); // Append the button container to the list item
    let inserted=false;

    for(let i=0;i<items.length;i++){
        const existingTaskDate=new Date(items[i].getAttribute("data-date"));
        if(taskDue < existingTaskDate){
            taskList.insertBefore(li,items[i]);
            inserted=true;
            break;
        }
    }
    if(!inserted){
        taskList.appendChild(li);
    } 
    
}



async function toggleComplete(taskId) {
    try {
        const taskRef = doc(db, 'users', auth.currentUser.uid, 'todos', taskId);
        const docSnapshot = await getDoc(taskRef);

        if (docSnapshot.exists()) {
            const updatedStatus = !docSnapshot.data().completed;
            await updateDoc(taskRef, { completed: updatedStatus });

            const taskElement = document.querySelector(`[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.toggle("checked", updatedStatus);
            }
        }
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}


function openEditPopup(task) {
    const popup = document.createElement("div");
    popup.classList.add("popup");

    const taskInput = document.createElement("input");
taskInput.type = "text";
taskInput.value = task.text;

const dateInput = document.createElement("input");
dateInput.type = "date";
dateInput.value = task.date;


    const saveButton = document.createElement("span");
    saveButton.classList.add("save");
    saveButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 10.5l-2-2a.5.5 0 0 0-.707.707l2.5 2.5a.5.5 0 0 0 .707 0l5-5a.5.5 0 0 0-.707-.707l-4.5 4.5-1.5-1.5z"/></svg>'; // Checkmark SVG
    saveButton.addEventListener("click", async () => {
        await updateTask(task.id, input.value);
        document.body.removeChild(popup);
    });
   

    popup.appendChild(input);
    popup.appendChild(saveButton);
    document.body.appendChild(popup);
}

async function updateTask(taskId, newText, newDate) {
    try {
        const taskRef = doc(db, 'users', auth.currentUser.uid, 'todos', taskId);
        await updateDoc(taskRef, { text: newText, date: newDate });
        displayTasks(); // Refresh UI
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}


async function deleteTask(taskId) {
    try {
        const taskRef = doc(db, 'users', auth.currentUser.uid, 'todos', taskId);
        await deleteDoc(taskRef);  // Deletes the task permanently from Firestore
        const taskElement = document.querySelector(`[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
        } 
    } catch (e) {
        console.error("Error removing document: ", e);
    }
}

displayTasks();
// Event Listeners


// Logout Button functionality
const logoutButton = document.getElementById("logout_button");
logoutButton.addEventListener("click", () => {
    signOut(auth).then(() => {
        // Sign-out successful.
        console.log("User signed out");
        window.location.href = 'login.html';
    }).catch((error) => {
        // An error happened.
        console.error("Sign out error", error);
    });
});

//to load the respective class of the task on clicking the tab buttons.
document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".tab-btn");
    const taskList = document.getElementById("task-list");

    function classifyTasks() {
        const tasks = document.querySelectorAll(".task");
        const today = new Date().toISOString().split("T")[0]; // Get today's date

        tasks.forEach((task) => {
            const taskText = task.innerText;
            const match = taskText.match(/\((\d{4}-\d{2}-\d{2})\)$/); // Extract date from (YYYY-MM-DD)

            if (match) {
                const dueDate = match[1];
                task.classList.remove("upcoming", "overdue"); // Reset classes

                if (dueDate > today) {
                    task.classList.add("upcoming");
                } else if (dueDate < today) {
                    task.classList.add("overdue");
                }
            }

            if (task.classList.contains("checked")) {
                task.classList.add("completed");
            } else {
                task.classList.remove("completed");
            }
        });
    }

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

    buttons.forEach((button) => {
        button.addEventListener("click", function () {
            classifyTasks(); // Update task categories before filtering
            filterTasks(button.getAttribute("data-filter"));
        });
    });

    classifyTasks(); // Run once on page load
});

