import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC0lfXW5wfZX6EyKpEmcCUDiAgv5CVryuU',
  authDomain: 'project-8438726410257398456.firebaseapp.com',
  databaseURL: 'https://project-8438726410257398456-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'project-8438726410257398456',
  storageBucket: 'project-8438726410257398456.firebasestorage.app',
  messagingSenderId: '431206305067',
  appId: '1:431206305067:web:3ea1aa5aba0a123371c96e',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

/** Connexion anonyme — retourne l'utilisateur courant (ou en crée un). */
export async function signInAnon() {
  if (auth.currentUser) return auth.currentUser;
  const { user } = await signInAnonymously(auth);
  return user;
}
