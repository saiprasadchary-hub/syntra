// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYCPe0nETlX_x49PVW26pPhuFpgdCtwqw",
  authDomain: "syntra-ed.firebaseapp.com",
  projectId: "syntra-ed",
  storageBucket: "syntra-ed.firebasestorage.app",
  messagingSenderId: "392574559814",
  appId: "1:392574559814:web:475855d3ee82753fb9cc47",
  measurementId: "G-TD91Z0J9MC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, analytics };
