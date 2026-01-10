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
// 2. FIREBASE CONFIG (Production)
// =====================
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD98eOILfbS-IYGFtjzBUki2JhokmNhtCQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "timeline-os-45bf7.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "timeline-os-45bf7",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "timeline-os-45bf7.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1032738943862",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1032738943862:web:1e301f89adcb6ff0234057"
};

// =====================
// 3. VALIDATE CONFIG
// =====================
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    return false;
  }
  
  return true;
};

// =====================
// 4. INITIALIZE FIREBASE
// =====================
let app;
let auth;
let db;
let provider;

try {
  if (validateFirebaseConfig()) {
    app = initializeApp(firebaseConfig);
    
    // Initialize services
    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
    
    // Add scopes
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Enable persistent login
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting persistence:", error);
    });
    
    console.log('Firebase initialized successfully');
  } else {
    throw new Error('Invalid Firebase configuration');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create fallback mock services for development
  app = { name: '[DEFAULT]' };
  auth = {
    onAuthStateChanged: (callback) => {
      console.warn('Firebase auth not available - using mock');
      callback(null);
      return () => {};
    },
    currentUser: null
  };
  db = {};
  provider = {};
  
  // Mock functions
  const mockFn = () => Promise.reject(new Error('Firebase not initialized'));
  const mockAuth = () => ({ 
    signInWithPopup: mockFn,
    signOut: mockFn 
  });
  
  Object.assign(auth, mockAuth());
}

// =====================
// 5. AUTH STATE LISTENER HELPER
// =====================
const setupAuthListener = (callback) => {
  if (auth && typeof auth.onAuthStateChanged === 'function') {
    return auth.onAuthStateChanged(callback);
  } else {
    console.warn('Auth listener not available');
    callback(null);
    return () => {};
  }
};

// =====================
// 6. EXPORTS
// =====================
export { 
  auth, 
  db, 
  provider, 
  setupAuthListener,
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup, 
  signOut,
  collection, query, where, getDocs,
  doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, Timestamp 
};