import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAS903RNf76lNXyHTAnfmkR3AKwTi5cbsE",
  authDomain: "arknights-monopoly.firebaseapp.com",
  databaseURL: "https://arknights-monopoly-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "arknights-monopoly",
  storageBucket: "arknights-monopoly.firebasestorage.app",
  messagingSenderId: "932108689538",
  appId: "1:932108689538:web:8e8e3dfc868df5d302d49b",
  measurementId: "G-GHN8NRVHBG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { db, analytics };
