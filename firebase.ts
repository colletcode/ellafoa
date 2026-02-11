import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBbqfkE_k1i6fmJmCiepJdaVUzMjzRDyzI",
  authDomain: "ellafoa.firebaseapp.com",
  projectId: "ellafoa",
  storageBucket: "ellafoa.firebasestorage.app",
  messagingSenderId: "590102582963",
  appId: "1:590102582963:web:792ce1a143dfa7e49ac2c6"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);