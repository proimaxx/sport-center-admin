import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfigAdmin = {
  apiKey: "AIzaSyAxB5TB1UGQew1ZtXv3By0vNy7E3KXFG98",
  authDomain: "sport-center-admin.firebaseapp.com",
  projectId: "sport-center-admin",
  storageBucket: "sport-center-admin.firebasestorage.app",
  messagingSenderId: "452970127107",
  appId: "1:452970127107:web:c1e38d011af2378fc81336"
}

const firebaseConfigPublic = {
  apiKey: "AIzaSyBTzzbsY0FN5YC78uB2LxoPgxD9qAGPBlQ",
  authDomain: "sport-center-public.firebaseapp.com",
  projectId: "sport-center-public",
  storageBucket: "sport-center-public.firebasestorage.app",
  messagingSenderId: "643579394507",
  appId: "1:643579394507:web:e1cd39c2c0b5c6e5f6de4e"
}

const adminApp = initializeApp(firebaseConfigAdmin, 'admin')
const publicApp = initializeApp(firebaseConfigPublic, 'public')

export const db = getFirestore(adminApp)
export const dbPublic = getFirestore(publicApp)
export const auth = getAuth(adminApp)
export default adminApp
