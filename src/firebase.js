// firebase.js - COMPLETE FIXED VERSION
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCwl3hRIJ4wVAWU9FoBP0nAqWuO6f9nJ8",
  authDomain: "linear-calendar-e03d1.firebaseapp.com",
  projectId: "linear-calendar-e03d1",
  storageBucket: "linear-calendar-e03d1.firebasestorage.app",
  messagingSenderId: "432287409618",
  appId: "1:432287409618:web:ae8e139aa1813f2ba4140b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);