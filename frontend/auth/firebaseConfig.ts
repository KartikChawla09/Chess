import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDTaUOi2XJKKOQJJmhoutOtHZzmM8QbH-w",
  authDomain: "chess-c3ac9.firebaseapp.com",
  projectId: "chess-c3ac9",
  storageBucket: "chess-c3ac9.appspot.com",
  messagingSenderId: "268519890943",
  appId: "1:268519890943:web:6024d4d120b92ad1c8d1ca",
  measurementId: "G-LMC6B05B9S",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
