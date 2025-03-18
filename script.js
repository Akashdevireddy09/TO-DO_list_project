// const form = document.getElementById('form')
// const input = document.getElementById('input')
// const todosUL = document.getElementById('todos')

// const todos = JSON.parse(localStorage.getItem('todos'))

// if(todos) {
//     todos.forEach(todo => addTodo(todo))
// }

// form.addEventListener('submit', (e) => {
//     e.preventDefault()

//     addTodo()
// })

// function addTodo(todo) {
//     let todoText = input.value

//     if(todo) {
//         todoText = todo.text
//     }

//     if(todoText) {
//         const todoEl = document.createElement('li')
//         if(todo && todo.completed) {
//             todoEl.classList.add('completed')
//         }

//         todoEl.innerText = todoText

//         todoEl.addEventListener('click', () => {
//             todoEl.classList.toggle('completed')
//             updateLS()
//         }) 

//         todoEl.addEventListener('contextmenu', (e) => {
//             e.preventDefault()

//             todoEl.remove()
//             updateLS()
//         }) 

//         todosUL.appendChild(todoEl)

//         input.value = ''

//         updateLS()
//     }
// }

// function updateLS() {
//     todosEl = document.querySelectorAll('li')

//     const todos = []

//     todosEl.forEach(todoEl => {
//         todos.push({
//             text: todoEl.innerText,
//             completed: todoEl.classList.contains('completed')
//         })
//     })

//     localStorage.setItem('todos', JSON.stringify(todos))
// }


const input=document.getElementById("input_item")
const listContainer=document.getElementById("list_container")

function addTask(){
  if(input.value===''){
    alert("You forget to add your task,hehe");
  }else{
    let li=document.createElement("li");
    li.innerHTML=input.value;
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