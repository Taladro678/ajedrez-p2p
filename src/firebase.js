// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB3Atm5pCVONvW_-Qsu9CvpCFf1DE3JdVw",
    authDomain: "ajedrezp2p.firebaseapp.com",
    projectId: "ajedrezp2p",
    storageBucket: "ajedrezp2p.firebasestorage.app",
    messagingSenderId: "820986888362",
    appId: "1:820986888362:web:9387a3a8bfb872a8f990d3",
    measurementId: "G-LXCX2MJZ06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

