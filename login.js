import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";  // Optional, if using Analytics


const firebaseConfig = {
    apiKey: "AIzaSyCjnP5ilEeUqkW_hpBqsJrUcldlVoBjf4k",
    authDomain: "mytodolist-fa068.firebaseapp.com",
    projectId: "mytodolist-fa068",
    storageBucket: "mytodolist-fa068.firebasestorage.app",
    messagingSenderId: "1037050677970",
    appId: "1:1037050677970:web:1270451c9d9f1024abfb0b",
    measurementId: "G-E4N3XBX79H"
  };

    // Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Initialize Firebase Authentication
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Get the Firebase auth instance
        const auth = getAuth();

        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Access the user
        const user = userCredential.user;

        console.log('Login successful:', user);

        // Redirect to your to-do list page (index.html)
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Login error:', error.message);
        errorMessage.textContent = error.message; // Display the error message
    }
});