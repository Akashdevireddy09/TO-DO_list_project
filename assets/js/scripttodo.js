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
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    }
}

  
addTaskButton.addEventListener("click", addTask);

async function displayTasks() {
    if (!auth.currentUser) return;

    const taskList = document.getElementById("list_container");
    taskList.innerHTML = ""; // Clear list initially

    const tasksRef = collection(db, 'users', auth.currentUser.uid, 'todos');
    const querySnapshot = await getDocs(tasksRef);

    querySnapshot.forEach((doc) => {
        appendTask({ id: doc.id, ...doc.data() });
    });
}


function appendTask(task) {
    const taskList = document.getElementById("list_container");

    // Create list item
    const li = document.createElement("li");
    li.innerText = task.text;
    li.setAttribute("data-id", task.id); // Store task ID in the element
   

    if (task.completed) {
        li.classList.add("checked");
    }

    // Click event to toggle completion
    li.addEventListener("click", () => toggleComplete(task.id));

    const taskDueDate = task.date || inputDate.value; // Use stored task date or input date

      // const isOverdue = taskDueDate && new Date(taskDueDate) < new Date();
      const today = new Date();
       today.setHours(0, 0, 0, 0); // Reset time to 00:00:00 for accurate date comparison

     const taskDue = new Date(taskDueDate);
      taskDue.setHours(23, 59, 59, 999); // Set taskDueDate to the end of that day

      const isOverdue = taskDue < today;

    
    // Add the "overdue" class if the task is overdue
    if (isOverdue) {
        li.classList.add("overdue");
    }
    
    // if (task.completed) {
    //     li.classList.add("checked");
    // }
    
    // Create task due date display
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
    });
    buttonContainer.appendChild(deleteBtn);
    
    li.appendChild(buttonContainer); // Append the button container to the list item
    taskList.appendChild(li);
    
}



async function toggleComplete(taskId) {
    try {
        const taskRef = doc(db, 'users', auth.currentUser.uid, 'todos', taskId);
        const docSnapshot = await getDoc(taskRef);

        if (docSnapshot.exists()) {
            const currentData = docSnapshot.data();
            const updatedStatus = !currentData.completed;
            await updateDoc(taskRef, {
                completed: updatedStatus  // Toggle completion status
            });


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

    const input = document.createElement("input");
    input.type = "text";
    input.value = task.text;

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

async function updateTask(taskId, newText) {
    try {
        const taskRef = doc(db, 'users', auth.currentUser .uid, 'todos', taskId);
        await updateDoc(taskRef, {
            text: newText  // Update task text
        });
        displayTasks(); // Refresh the task list
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