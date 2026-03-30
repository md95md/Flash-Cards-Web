import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDeD-nkuU4P2wEcS8DvGvt0sdeerVB6PsE",
  authDomain: "flash-cards-1ee15.firebaseapp.com",
  databaseURL: "https://flash-cards-1ee15-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "flash-cards-1ee15",
  storageBucket: "flash-cards-1ee15.firebasestorage.app",
  messagingSenderId: "832599387260",
  appId: "1:832599387260:web:95b9086e91efc227d1adf9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
export const auth = getAuth(app);

export async function loadDecks(userId) {
  const snapshot = await get(ref(db, `users/${userId}/decks`));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()).map(deck => ({
    ...deck,
    cards: deck.cards ? Object.values(deck.cards) : []
  }));
}

export async function saveDeck(userId, deck) {
  await set(ref(db, `users/${userId}/decks/${deck.id}`), deck);
}

export async function deleteDeckFromDB(userId, deckId) {
  await remove(ref(db, `users/${userId}/decks/${deckId}`));
}

export function registerUser(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}

export function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}