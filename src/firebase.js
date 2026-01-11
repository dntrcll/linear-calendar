// firebase.js - UPDATED VERSION
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD98eOILfbS-IYGFtjzBUki2JhokmNhtCQ",
  authDomain: "timeline-os-45bf7.firebaseapp.com",
  projectId: "timeline-os-45bf7",
  storageBucket: "timeline-os-45bf7.firebasestorage.app",
  messagingSenderId: "1032738943862",
  appId: "1:1032738943862:web:1e301f89adcb6ff0234057"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export auth functions
export { 
  setPersistence, 
  browserLocalPersistence, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
};

// Export Firestore functions
export { 
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
};

// Export the app if needed
export default app;