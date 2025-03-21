// Import the functions you need from the SDKs you need
 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
 import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";  // Optional, if using Analytics
 import { getAuth, GoogleAuthProvider,createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

 // Your web app's Firebase configuration
 const firebaseConfig = {
 apiKey: "AIzaSyCjnP5ilEeUqkW_hpBqsJrUcldlVoBjf4k",
 authDomain: "mytodolist-fa068.firebaseapp.com",
 projectId: "mytodolist-fa068",
 storageBucket: "mytodolist-fa068.appspot.com",
 messagingSenderId: "1037050677970",
 appId: "1:1037050677970:web:1270451c9d9f1024abfb0b",
 measurementId: "G-E4N3XBX79H"
};

 // Initialize Firebase
 const app = initializeApp(firebaseConfig);
 const analytics = getAnalytics(app); // Optional, for Analytics
 const auth = getAuth(app); // Initialize Firebase Authentication




const registerForm = document.getElementById('register-form');
const registerErrorMessage = document.getElementById('register-error-message');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        // Create the user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Access the newly created user
        const user = userCredential.user;
        console.log('Registration successful:', user);

        alert("Registration successful! Please log in.");

        // Redirect to login page after successful registration
        window.location.href ="login.html";
    } catch (error) {
        console.error('Registration error:', error.message);
        registerErrorMessage.textContent = error.message; // Display the error message
    }
});
