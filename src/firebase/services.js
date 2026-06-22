import { db, dbPublic } from './config'
import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where,
  serverTimestamp
} from 'firebase/firestore'

export const subscribeCampi = (callback) => {
  const q = query(collection(db, 'campi'), orderBy('createdAt'))
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export const addCampo = (data) =>
  addDoc(collection(db, 'campi'), { ...data, createdAt: serverTimestamp() })

export const updateCampo = (id, data) =>
  updateDoc(doc(db, 'campi', id), data)

export const deleteCampo = (id) =>
  deleteDoc(doc(db, 'campi', id))

export const getConfig = async () => {
  const snap = await getDoc(doc(db, 'config', 'centro'))
  return snap.exists() ? snap.data() : null
}

export const updateConfig = (data) =>
  updateDoc(doc(db, 'config', 'centro'), data)

export const subscribePrenotazioni = (callback) => {
  const q = query(collection(dbPublic, 'prenotazioni'), orderBy('data', 'desc'))
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export const subscribePrenotazioniByData = (data, callback) => {
  const q = query(
    collection(dbPublic, 'prenotazioni'),
    where('data', '==', data),
    orderBy('orario')
  )
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export const cancellaPrenotazione = (id) =>
  updateDoc(doc(dbPublic, 'prenotazioni', id), {
    stato: 'cancellata',
    cancelledAt: serverTimestamp()
  })

export const getDisponibilita = async () => {
  const snap = await getDocs(collection(db, 'disponibilita'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const bloccaData = (data) =>
  addDoc(collection(db, 'disponibilita'), { data, tipo: 'blocco', createdAt: serverTimestamp() })

export const sbloccaData = (id) =>
  deleteDoc(doc(db, 'disponibilita', id))
