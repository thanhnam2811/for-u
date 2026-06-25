// ── Shared Firebase SDK Initializer ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGmezPDJ7CmDuwqbMr-odhK85gWQIS7Hs",
  authDomain: "lines97-magic.firebaseapp.com",
  projectId: "lines97-magic",
  storageBucket: "lines97-magic.firebasestorage.app",
  messagingSenderId: "454124473980",
  appId: "1:454124473980:web:c0c2329a50e0adf5b443f9",
  measurementId: "G-SQN548P6RF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
