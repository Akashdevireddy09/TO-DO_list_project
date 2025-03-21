

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const input=document.getElementById("input_item")
const inputDate = document.getElementById("input_item_date");
const listContainer=document.getElementById("list_container");
const addTaskButton = document.getElementById("add_task_button");

const auth = getAuth();

let todosCollection;

onAuthStateChanged(auth, async (user) => {  // Pass 'auth' to onAuthStateChanged
  if (!user) {
      // Redirect to login if not authenticated
      window.location.href = 'login.html';
  } else {
      // User is signed in. You can access user.uid here.
      console.log("User is logged in:", user.uid);

      // Initialize todosCollection here, after ensuring the user is logged in
      const db = getFirestore();
      todosCollection = collection(db, 'users', user.uid, 'todos'); // Use collection() from modular SDK

      // Call displayTasks() or other functions to load user-specific data.
      displayTasks(); // Make sure displayTasks() is adapted to load data only for the current user.
  }
});

function addTask(){
  if(input.value===''){
    alert("You forget to add your task,hehe");
  }else{
    let li=document.createElement("li");
    li.innerHTML=input.value.trim();
    listContainer.appendChild(li);
    let span =document.createElement("span");
    li.appendChild(span);
  }
  input.value='';
  saveData();
}

listContainer.addEventListener("click",function(e){
         if(e.target.tagName==="LI"){
            e.target.classList.toggle("checked");
            saveData();
         }else if(e.target.tagName==="SPAN"){
            e.target.parentElement.remove();
            saveData();
         }
},false); 

function saveData(){
    localStorage.setItem("data",listContainer.innerHTML);
}

function showData(){
    listContainer.innerHTML=localStorage.getItem("data");
}
showData()