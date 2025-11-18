// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsAF-g-y3935ld0AmoK66m2PKJ4ZyAsqk",
  authDomain: "accss-42356.firebaseapp.com",
  projectId: "accss-42356",
  storageBucket: "accss-42356.appspot.com",
  messagingSenderId: "937805840020",
  appId: "1:937805840020:web:12e480e6dc8ee544aa3e81",
  measurementId: "G-G502120M58"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
