// Import Firebase modules you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA7pcTlj7zkWUVPFMVtYfkS2GvY5ohpY_c",
  authDomain: "thesis-cec35.firebaseapp.com",
  projectId: "thesis-cec35",
  storageBucket: "thesis-cec35.firebasestorage.app",
  messagingSenderId: "620375802252",
  appId: "1:620375802252:web:f610bccc60f993ab0056a9",
  measurementId: "G-NZDG227W5L"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Function to handle Google Login
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("User Info:", user);
    return user;
  } catch (error) {
    console.error("Error signing in:", error);
  }
};

// Function to handle Logout
const logout = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Export what you need
export { auth, signInWithGoogle, logout };