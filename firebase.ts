// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHAMamJjyg205u0CE5lO7L4Ya9VPYyGcY",
  authDomain: "sirim1.firebaseapp.com",
  databaseURL: "https://sirim1-default-rtdb.firebaseio.com",
  projectId: "sirim1",
  storageBucket: "sirim1.firebasestorage.app",
  messagingSenderId: "278625864575",
  appId: "1:278625864575:web:eecc62867fb2a94936284a",
  measurementId: "G-9ZRHG3M5QF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Connect to the specific database named 'sirim1' instead of '(default)'
const db = getFirestore(app, 'sirim1');
const rtdb = getDatabase(app);
const storage = getStorage(app);

// Function to get or initialize the secondary app for user management
export const getSecondaryAuth = () => {
    const apps = getApps();
    const secondaryAppName = "secondary-app-for-user-creation";
    let secondaryApp = apps.find(app => app.name === secondaryAppName);

    if (!secondaryApp) {
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    }
    
    return getAuth(secondaryApp);
};


export { app, auth, db, storage, rtdb };