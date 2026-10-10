import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAG_UJ8y1wWjqJT4LnFKT3O6bWGjd7CORI",
  authDomain: "sayban-web.firebaseapp.com",
  projectId: "sayban-web",
  storageBucket: "sayban-web.firebasestorage.app",
  messagingSenderId: "856382957880",
  appId: "1:856382957880:web:13290f4f3da5805ac179cd"
};

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
