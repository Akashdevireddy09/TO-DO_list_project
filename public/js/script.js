

// // --- Keep Auth Imports, Add getIdToken ---
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
// import { getAuth, onAuthStateChanged, signOut, getIdToken } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// const firebaseConfig = {  
//   apiKey: "AIzaSyCjnP5ilEeUqkW_hpBqsJrUcldlVoBjf4k",
//    authDomain: "mytodolist-fa068.firebaseapp.com",
//    projectId: "mytodolist-fa068",
//    storageBucket: "mytodolist-fa068.firebasestorage.app",
//    messagingSenderId: "1037050677970",
//    appId: "1:1037050677970:web:1270451c9d9f1024abfb0b",
//    measurementId: "G-E4N3XBX79H"
// };
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const API_BASE_URL = 'https://us-central1-mytodolist-fa068.cloudfunctions.net/api';

// // DOM
// const input = document.getElementById("input_task");
// const inputDate = document.getElementById("input_date");
// const listContainer = document.getElementById("list_container");
// const addTaskButton = document.getElementById("add_task_button");
// const fromDateInput = document.querySelector('.from_date input');
// const toDateInput = document.querySelector('.to_date input');
// const searchButton = document.querySelector('.search_button');
// const resetButton = document.querySelector('.reset_button');
// const logoutButton = document.getElementById("logout_button");

// let currentFilter = 'all';
// let eventListenersInitialized = false;
// let editPopup = null;

// async function getAuthToken() {
//   if (!auth.currentUser) return null;
//   try {
//     return await getIdToken(auth.currentUser, false);
//   } catch (e) {
//     console.error(e);
//     return null;
//   }
// }

// async function fetchAPI(endpoint, options = {}) {
//   const token = await getAuthToken();
//   if (!token) return null;
//   const headers = { 'Authorization': `Bearer ${token}`, ...(options.body && { 'Content-Type': 'application/json' }) };
//   const config = { ...options, headers };
//   if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
//   const res = await fetch(API_BASE_URL + endpoint, config);
//   if (!res.ok) return null;
//   return res.status === 204 ? [] : res.json();
// }

// onAuthStateChanged(auth, async user => {
//   if (!user) {
//     window.location.href = 'login.html';
//   } else {
//     document.body.style.display = 'block';
//     if (!eventListenersInitialized) setupEventListeners();
//     await displayTasks(currentFilter);
//   }
// });

// function setupEventListeners() {
//   eventListenersInitialized = true;
//   const today = new Date().toISOString().split('T')[0];
//   if (inputDate) inputDate.setAttribute('min', today);
//   input.addEventListener('keypress', e => e.key==='Enter'&&addTask());
//   inputDate.addEventListener('keypress', e=> e.key==='Enter'&&addTask());
//   addTaskButton.addEventListener('click', addTask);
//   logoutButton.addEventListener('click', ()=>signOut(auth).then(()=>window.location.href='login.html'));
//   document.querySelectorAll('.tab-btn').forEach(btn=> btn.addEventListener('click', async function(){
//     document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
//     this.classList.add('active');
//     currentFilter = this.dataset.filter;
//     await displayTasks(currentFilter);
//   }));
//   searchButton.addEventListener('click', ()=> filterTasksByDateRange(fromDateInput.value, toDateInput.value));
//   resetButton.addEventListener('click', ()=>{ fromDateInput.value=''; toDateInput.value=''; displayTasks(currentFilter); });
// }

// async function addTask() {
//   const text = input.value.trim();
//   const date = inputDate.value;
//   if (!text || !date) return;
//   const selected = new Date(date+"T00:00:00");
//   const today = new Date(); today.setHours(0,0,0,0);
//   if (selected < today) return;
//   const newTask = await fetchAPI('/todos', { method:'POST', body:{ text, date } });
//   if (newTask) {
//     input.value=''; inputDate.value='';
//     await displayTasks(currentFilter);
//   }
// }

// async function displayTasks(filterType='all') {
//   const tasks = await fetchAPI('/todos', { method:'GET' }) || [];
//   // Client-side filtering
//   const today = new Date(); today.setHours(0,0,0,0);
//   let filtered = tasks.filter(task => {
//     const due = new Date(task.date+'T00:00:00');
//     switch(filterType) {
//       case 'upcoming': return !task.completed && due >= today;
//       case 'overdue':  return !task.completed && due < today;
//       case 'completed': return task.completed;
//       default: return true;
//     }
//   });
//   filtered.sort((a,b)=> new Date(a.date)-new Date(b.date));
//   renderTasks(filtered);
// }

// function renderTasks(tasks) {
//   listContainer.innerHTML = '';
//   if (!tasks.length) { listContainer.innerHTML='<p class="no-tasks">No tasks found.</p>'; return; }
//   const ul=document.createElement('ul'); listContainer.appendChild(ul);
//   tasks.forEach(task=> ul.appendChild(createTaskElement(task)));
// }

// function createTaskElement(task) {
//   const li=document.createElement('li'); li.dataset.id=task.id;
//   if (task.completed) li.classList.add('checked');
//   const spanText=document.createElement('span'); spanText.textContent=task.text;
//   const spanDate=document.createElement('span'); spanDate.className='task-date';
//   spanDate.textContent=new Date(task.date+'T00:00:00')
//     .toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
//   const btns=document.createElement('div'); btns.className='button-container';
//   if (!task.completed) {
//     const edit=document.createElement('span'); edit.className='edit';
//     edit.addEventListener('click', e=>{e.stopPropagation(); openEditPopup(task);});
//     btns.appendChild(edit);
//   }
//   const del=document.createElement('span'); del.className='delete';
//   del.addEventListener('click', e=>{ e.stopPropagation(); deleteTask(task.id); });
//   btns.appendChild(del);
//   li.append(spanText, spanDate, btns);
//   li.addEventListener('click', ()=> toggleComplete(task.id));
//   return li;
// }

// function openEditPopup(task) {
//   if (editPopup) editPopup.remove();
//   editPopup=document.createElement('div'); editPopup.className='popup';
//   editPopup.innerHTML=`<input id="edit-text" type="text" value="${task.text}"><input id="edit-date" type="date" value="${task.date}" min="${new Date().toISOString().split('T')[0]}"><div class="popup-button-row"><button class="cancel-button">Cancel</button><button class="save">Save</button></div>`;
//   document.body.appendChild(editPopup);
//   editPopup.querySelector('.cancel-button').addEventListener('click', ()=>editPopup.remove());
//   editPopup.querySelector('.save').addEventListener('click', async ()=>{
//     const newText=editPopup.querySelector('#edit-text').value.trim();
//     const newDate=editPopup.querySelector('#edit-date').value;
//     if(newText&&newDate) { await fetchAPI(`/todos/${task.id}`,{method:'PUT',body:{text:newText,date:newDate}}); await displayTasks(currentFilter); editPopup.remove(); }
//   });
// }

// async function deleteTask(id) {
//   if(!confirm('Delete?')) return;
//   await fetchAPI(`/todos/${id}`, { method:'DELETE' });
//   await displayTasks(currentFilter);
// }

// async function toggleComplete(id) {
//   await fetchAPI(`/todos/${id}/complete`, { method:'PATCH' });
//   await displayTasks(currentFilter);
// }

// async function filterTasksByDateRange(from, to) {
//   if(!from||!to)return;
//   const all = await fetchAPI('/todos',{method:'GET'})||[];
//   const start=new Date(from+'T00:00:00'), end=new Date(to+'T23:59:59');
//   const range=all.filter(t=>{const d=new Date(t.date+'T00:00:00');return d>=start&&d<=end;});
//   renderTasks(range);
// }



import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, getIdToken } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const firebaseConfig = {  
  apiKey: "AIzaSyCjnP5ilEeUqkW_hpBqsJrUcldlVoBjf4k",
   authDomain: "mytodolist-fa068.firebaseapp.com",
   projectId: "mytodolist-fa068",
   storageBucket: "mytodolist-fa068.firebasestorage.app",
   messagingSenderId: "1037050677970",
   appId: "1:1037050677970:web:1270451c9d9f1024abfb0b",
   measurementId: "G-E4N3XBX79H"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const API_BASE_URL = 'https://us-central1-mytodolist-fa068.cloudfunctions.net/api';

// DOM
const input = document.getElementById("input_task");
const inputDate = document.getElementById("input_date");
const listContainer = document.getElementById("list_container");
const addTaskButton = document.getElementById("add_task_button");
const fromDateInput = document.querySelector('.from_date input');
const toDateInput = document.querySelector('.to_date input');
const searchButton = document.querySelector('.search_button');
const resetButton = document.querySelector('.reset_button');
const logoutButton = document.getElementById("logout_button");

$.notify.defaults({ position: "top center" }); 

let currentFilter = 'all';
let eventListenersInitialized = false;
let editPopup = null;

// Utility function to safely format dates
function formatTaskDate(dateValue) {
  if (!dateValue) {
    return 'No Date';
  }
  
  try {
    // Your backend sends dates in "YYYY-MM-DD" format
    // Handle this specific format to avoid timezone issues
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (dateRegex.test(dateValue)) {
      // Parse YYYY-MM-DD format directly to avoid timezone issues
      const [year, month, day] = dateValue.split('-').map(num => parseInt(num));
      const dateObj = new Date(year, month - 1, day); // month is 0-indexed
      
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    }
    
    // Fallback: try other parsing methods
    let dateObj = new Date(dateValue);
    
    // If invalid, try adding time component
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date(dateValue + 'T00:00:00');
    }
    
    // Final check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date received:', dateValue);
      return 'Invalid Date';
    }
    
    // Format the valid date
    return dateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return 'Invalid Date';
  }
}

// Utility function to convert date to YYYY-MM-DD format for input fields
function formatDateForInput(dateValue) {
  if (!dateValue) return '';
  
  try {
    // Your backend sends dates in "YYYY-MM-DD" format already
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (dateRegex.test(dateValue)) {
      // Date is already in the correct format for input fields
      return dateValue;
    }
    
    // Fallback for other formats
    let dateObj = new Date(dateValue);
    
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date(dateValue + 'T00:00:00');
    }
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Format as YYYY-MM-DD for input fields
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', dateValue, error);
    return '';
  }
}

// Utility function to check if a task is overdue
function isTaskOverdue(task) {
  if (!task.date || task.completed) return false;
  
  const taskDate = new Date(task.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return taskDate < today;
}

async function getAuthToken() {
  if (!auth.currentUser) return null;
  try {
    return await getIdToken(auth.currentUser, false);
  } catch (e) {
    console.error('Error getting auth token:', e);
    return null;
  }
}

async function fetchAPI(endpoint, options = {}) {
  const token = await getAuthToken();
  if (!token) {
    console.error('No auth token available');
    $.notify("Authentication error. Please login again.", "error");
    return null;
  }
  
  const headers = { 
    'Authorization': `Bearer ${token}`, 
    ...(options.body && { 'Content-Type': 'application/json' }) 
  };
  const config = { ...options, headers };
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  try {
    console.log('Making API request to:', API_BASE_URL + endpoint);
    const res = await fetch(API_BASE_URL + endpoint, config);
    
    if (!res.ok) {
      console.error('API request failed:', res.status, res.statusText);
      const errorText = await res.text();
      console.error('Error response:', errorText);
      $.notify("Failed to connect to server. Please try again.", "error");
      return null;
    }
    
    return res.status === 204 ? [] : await res.json();
  } catch (error) {
    console.error('API request error:', error);
    $.notify("Network error. Please check your connection.", "error");
    return null;
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    console.log('No authenticated user, redirecting to login');
    window.location.href = 'login.html';
  } else {
    console.log('User authenticated:', user.uid);
    $.notify("Welcome back! Loading your tasks...", "info");
    document.body.style.display = 'block';
    if (!eventListenersInitialized) setupEventListeners();
    await displayTasks(currentFilter);
  }
});

function setupEventListeners() {
  eventListenersInitialized = true;
  const today = new Date().toISOString().split('T')[0];
  if (inputDate) inputDate.setAttribute('min', today);
  
  input.addEventListener('keypress', e => e.key === 'Enter' && addTask());
  inputDate.addEventListener('keypress', e => e.key === 'Enter' && addTask());
  addTaskButton.addEventListener('click', addTask);
  
  logoutButton.addEventListener('click', () => {
    $.notify("Logging out...", "info");
    signOut(auth).then(() => {
      $.notify("Successfully logged out!", "success");
      setTimeout(() => window.location.href = 'login.html', 1000);
    }).catch(() => {
      $.notify("Error logging out. Please try again.", "error");
    });
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', async function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    console.log('Filter changed to:', currentFilter);
    
    // Notify user about filter change
    const filterNames = {
      'all': 'All Tasks',
      'upcoming': 'Upcoming Tasks',
      'completed': 'Completed Tasks',
      'overdue': 'Overdue Tasks'
    };
    $.notify(`Showing ${filterNames[currentFilter]}`, "info");
    
    await displayTasks(currentFilter);
  }));
  
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      $.notify("Searching tasks...", "info");
      filterTasksByDateRange(fromDateInput.value, toDateInput.value);
    });
  }
  
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (fromDateInput) fromDateInput.value = '';
      if (toDateInput) toDateInput.value = '';
      $.notify("Search filters cleared", "info");
      displayTasks(currentFilter);
    });
  }
}

async function addTask() {
  const text = input.value.trim();
  const date = inputDate.value;
  if (!text || !date) {
    $.notify("Please enter both task text and date", "warn");
    return;
  }
  
  const selected = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selected < today) {
    $.notify("Please select a date that is today or in the future", "warn");
    return;
  }
  
  console.log('Adding task:', { text, date });
  $.notify("Adding task...", "info");
  
  const newTask = await fetchAPI('/todos', { 
    method: 'POST', 
    body: { text, date } 
  });
  
  if (newTask) {
    console.log('Task added successfully:', newTask);
    input.value = '';
    inputDate.value = '';
    $.notify("Task added successfully! 🎉", "success");
    await displayTasks(currentFilter);
  } else {
    $.notify("Failed to add task. Please try again.", "error");
  }
}

// Updated displayTasks function
async function displayTasks(filterType = 'all') {
  console.log('Displaying tasks with filter:', filterType);
  
  let endpoint = '/todos';
  let status = 'all';
  
  switch(filterType) {
    case 'upcoming': 
      status = 'upcoming'; 
      break;
    case 'overdue': 
      status = 'overdue'; 
      break;
    case 'completed': 
      status = 'completed'; 
      break;
    default: 
      status = 'all';
  }
  
  endpoint += `?status=${status}`;
  console.log('API endpoint:', endpoint);
  
  const tasks = await fetchAPI(endpoint, { method: 'GET' });
  
  if (!tasks) {
    console.error('Failed to fetch tasks');
    listContainer.innerHTML = '<p class="no-tasks">Failed to load tasks. Please try again.</p>';
    $.notify("Failed to load tasks", "error");
    return;
  }
  
  console.log('Raw tasks received:', tasks);
  
  // FIXED: Safe sorting that handles null/undefined dates properly
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.date;
    const dateB = b.date;

    console.log('Sorting: typeof dateA:', typeof dateA, 'dateA value:', dateA);
    console.log('Sorting: typeof dateB:', typeof dateB, 'dateB value:', dateB);
    
    if ((!dateA || dateA === '') && (!dateB || dateB === '')) return 0;
    if (!dateA || dateA === '') return 1; 
    if (!dateB || dateB === '') return -1;
    
    return dateA.localeCompare(dateB); 
  });
  
  console.log('Sorted tasks:', sortedTasks);
  renderTasks(sortedTasks);
  
  // Show task count notification
  if (sortedTasks.length > 0) {
    const filterNames = {
      'all': 'total',
      'upcoming': 'upcoming',
      'completed': 'completed',
      'overdue': 'overdue'
    };
    $.notify(`Found ${sortedTasks.length} ${filterNames[filterType]} task(s)`, "info");
  }
}

function renderTasks(tasks) {
  console.log('Rendering tasks:', tasks.length);
  listContainer.innerHTML = '';
  
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) { 
    listContainer.innerHTML = '<p class="no-tasks">No tasks found.</p>'; 
    return; 
  }
  
  const ul = document.createElement('ul'); 
  listContainer.appendChild(ul);
  tasks.forEach(task => {
    const taskElement = createTaskElement(task);
    if (taskElement) {
      ul.appendChild(taskElement);
    }
  });
}

function createTaskElement(task) {
  if (!task || !task.id) {
    console.warn('Invalid task data:', task);
    return null;
  }
  
  const li = document.createElement('li');
  li.dataset.id = task.id;
  
  // Add appropriate classes
  if (task.completed) {
    li.classList.add('checked');
  } else if (isTaskOverdue(task)) {
    // FIX: Add overdue class for styling
    li.classList.add('overdue');
  }
  
  // Create task text span
  const spanText = document.createElement('span');
  spanText.textContent = task.text || 'No description';
  spanText.className = 'task-text';
  
  // Create button container
  const btns = document.createElement('div');
  btns.className = 'button-container';
  
  // Create date span with improved formatting
  const spanDate = document.createElement('span');
  spanDate.className = 'task-date';
  spanDate.textContent = formatTaskDate(task.date);
  
  // Add date to button container
  btns.appendChild(spanDate);
  
  // Add edit button for non-completed tasks
  if (!task.completed) {
    const edit = document.createElement('span');
    edit.className = 'edit';
    edit.addEventListener('click', e => {
      e.stopPropagation();
      openEditPopup(task);
    });
    btns.appendChild(edit);
  }
  
  // Add delete button
  const del = document.createElement('span');
  del.className = 'delete';
  del.addEventListener('click', e => {
    e.stopPropagation();
    deleteTask(task.id);
  });
  btns.appendChild(del);
  
  // Append elements to li
  li.appendChild(spanText);
  li.appendChild(btns);
  
  // Add click listener for toggle complete
  li.addEventListener('click', () => toggleComplete(task.id));
  
  return li;
}

function openEditPopup(task) {
  if (editPopup) editPopup.remove();
  
  editPopup = document.createElement('div');
  editPopup.className = 'popup';
  
  // Use the utility function to format date for input
  const formattedDate = formatDateForInput(task.date);
  const minDate = new Date().toISOString().split('T')[0];
  
  editPopup.innerHTML = `
    <div class="popup-content">
      <h3>Edit Task</h3>
      <input id="edit-text" type="text" value="${(task.text || '').replace(/"/g, '&quot;')}" placeholder="Task description">
      <input id="edit-date" type="date" value="${formattedDate}" min="${minDate}">
      <div class="popup-button-row">
        <button class="cancel-button">Cancel</button>
        <button class="save">Save</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(editPopup);
  
  // Focus on text input
  const textInput = editPopup.querySelector('#edit-text');
  textInput.focus();
  textInput.select();
  
  $.notify("Edit mode activated", "info");
  
  editPopup.querySelector('.cancel-button').addEventListener('click', () => {
    editPopup.remove();
    $.notify("Edit cancelled", "info");
  });
  
  editPopup.querySelector('.save').addEventListener('click', async () => {
    const newText = editPopup.querySelector('#edit-text').value.trim();
    const newDate = editPopup.querySelector('#edit-date').value;
    
    if (!newText || !newDate) {
      $.notify("Please enter both task text and date", "warn");
      return;
    }
    
    // Validate date is not in the past
    const selectedDate = new Date(newDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      $.notify("Please select a date that is today or in the future", "warn");
      return;
    }
    
    console.log('Updating task:', { id: task.id, text: newText, date: newDate });
    $.notify("Updating task...", "info");
    
    const result = await fetchAPI(`/todos/${task.id}`, {
      method: 'PUT',
      body: { text: newText, date: newDate }
    });
    
    if (result) {
      console.log('Task updated successfully');
      $.notify("Task updated successfully! ✏️", "success");
      await displayTasks(currentFilter);
      editPopup.remove();
    } else {
      $.notify("Failed to update task. Please try again.", "error");
    }
  });
  
  // Allow Enter key to save
  editPopup.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      editPopup.querySelector('.save').click();
    }
  });
  
  // Allow Escape key to cancel
  editPopup.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      editPopup.remove();
      $.notify("Edit cancelled", "info");
    }
  });
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) {
    $.notify("Delete cancelled", "info");
    return;
  }
  
  console.log('Deleting task:', id);
  $.notify("Deleting task...", "info");
  
  const result = await fetchAPI(`/todos/${id}`, { method: 'DELETE' });
  if (result !== null) {
    console.log('Task deleted successfully');
    $.notify("Task deleted successfully! 🗑️", "success");
    await displayTasks(currentFilter);
  } else {
    $.notify("Failed to delete task. Please try again.", "error");
  }
}

async function toggleComplete(id) {
  console.log('Toggling task completion:', id);
  $.notify("Updating task status...", "info");
  
  const result = await fetchAPI(`/todos/${id}/complete`, { method: 'PATCH' });
  if (result !== null) {
    console.log('Task completion toggled successfully');
    $.notify("Task status updated! ✅", "success");
    await displayTasks(currentFilter);
  } else {
    $.notify("Failed to update task status. Please try again.", "error");
  }
}

async function filterTasksByDateRange(from, to) {
  if (!from || !to) {
    $.notify("Please select both from and to dates", "warn");
    return;
  }
  
  if (new Date(from) > new Date(to)) {
    $.notify("From date cannot be later than to date", "warn");
    return;
  }
  
  console.log('Filtering by date range:', { from, to });
  const endpoint = `/todos?from=${from}&to=${to}`;
  const range = await fetchAPI(endpoint, { method: 'GET' }) || [];
  console.log('Date range results:', range);
  
  if (range.length === 0) {
    $.notify("No tasks found in the selected date range", "info");
  } else {
    $.notify(`Found ${range.length} task(s) in the selected date range`, "success");
  }
  
  renderTasks(range);
}