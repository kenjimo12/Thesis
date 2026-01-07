// src/auth.js

import { initializeApp } from "firebase/app";

// Firebase Auth
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7pcTlj7zkWUVPFMVtYfkS2GvY5ohpY_c",
  authDomain: "thesis-cec35.firebaseapp.com",
  projectId: "thesis-cec35",
  storageBucket: "thesis-cec35.firebasestorage.app",
  messagingSenderId: "620375802252",
  appId: "1:620375802252:web:f610bccc60f993ab0056a9",
  measurementId: "G-NZDG227W5L",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// OPTIONAL analytics (can comment out if it causes issues)
// const analytics = getAnalytics(app);

// Initialize Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/**
 * Google Sign In
 */
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);

    const user = {
      uid: result.user.uid,
      name: result.user.displayName,
      email: result.user.email,
      photo: result.user.photoURL,
    };

    console.log("Google User:", user);
    return user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

/**
 * Logout
 */
const logout = async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

export { auth, signInWithGoogle, logout };
