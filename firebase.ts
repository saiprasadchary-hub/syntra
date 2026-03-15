// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
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
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
