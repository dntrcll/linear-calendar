// src/firebase.js

// =====================
// 1. IMPORTS
// =====================
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup,
  signOut,
  GoogleAuthProvider 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

// =====================
// 2. FIREBASE CONFIG
// =====================
const firebaseConfig = {
  apiKey: "AIzaSyD98eOILfbS-IYGFtjzBUki2JhokmNhtCQ",
  authDomain: "timeline-os-45bf7.firebaseapp.com",
  projectId: "timeline-os-45bf7",
  storageBucket: "timeline-os-45bf7.firebasestorage.app",
  messagingSenderId: "1032738943862",
  appId: "1:1032738943862:web:1e301f89adcb6ff0234057"
};

// =====================
// 3. INITIALIZE FIREBASE
// =====================
const app = initializeApp(firebaseConfig);

// =====================
// 4. INITIALIZE SERVICES
// =====================
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// =====================
// 5. OPTIONAL SETUP
// =====================
// Enable persistent login
setPersistence(auth, browserLocalPersistence);

// =====================
// 6. EXPORTS
// =====================
// Core services
export { auth, db, provider };

// Authentication exports
export { 
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup, 
  signOut 
};

// Firestore exports
export { 
  collection, query, where, getDocs,
  doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, Timestamp
};