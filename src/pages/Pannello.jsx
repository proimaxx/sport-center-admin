import { useState, useEffect } from 'react'
import { db, dbPublic } from '../firebase/config'
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { subscribeCampi } from '../firebase/services'

const SPORT_LABELS = { tennis: 'Tennis', padel: 'Padel', pickleball: 'Pickleball', calcio5: 'Calcio a 5' }
const SPORT_COLORS = { tennis: '#C1440E', padel: '#2E7D32', pickleball: '#1565C0', calcio5: '#1B5E20' }

const oggi = () => new Date().toISOString().split('T')[0]
const fmtData = (d) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

function generaSlot(oraApertura = '08:00', oraChiusura = '22:00') {
  const slots = []
  const [hA, mA] = oraApertura.split(':').map(Number)
  const [hC, mC] = oraChiusura.split(':').map(Number)
  let min = hA * 60 + mA
  const fine = hC * 60 + mC
  while (min < fine) {
    const h = String(Math.floor(min / 60)).padStart(2, '0')
    const m = String(min % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    min += 30
  }
  return slots
}

export default function Pannello() {
  const [sport, setSport] = useState('tennis')
  const [data, setData] = useState(oggi())
  const [campi, setCampi] = useState([])
  const [prenotazioni, setPrenotazioni] = useState([])
  const [blocchi, setBlocchi] = useState([])
  const [modalBlocco, setModalBlocco] = useState(null)
  const [notaBlocco, setNotaBlocco] = useState('')
  const [modalSposta, setModalSposta] = useState(null)
  const [campoDest, setCampoDest] = useState('')

  useEffect(() => {
    const unsub = subscribeCampi(all => setCampi(all.filter(c => c.sport === sport)))
    return unsub
  }, [sport])

  useEffect(() => {
    const q = query(
      collection(dbPublic, 'prenotazioni'),
      where('data', '==', data),
      where('stato', '==', 'confermata')
    )
    const unsub = onSnapshot(q, snap =>
      setPrenotazioni(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [data])

  useEffect(() => {
    const q = query(
      collection(db, 'blocchi'),
      where('data', '==', data)
    )
    const unsub = onSnapshot(q, snap =>
      setBlocchi(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [data])

  const changeDay = (delta) => {
    const d = new Date(data + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setData(d.toISOString().split('T')[0])
  }

  const slots = generaSlot()
  const campiFiltrati = campi.filter(c => c.attivo)

  const getPrenotazione = (campoId, slot) =>
    prenotazioni.find(p => {
      if (p.campoId !== campoId) return false
      const [ph, pm] = p.orario.split(':').map(Number)
      const [sh, sm] = slot.split(':').map(Number)
      const pStart = ph * 60 + pm
      const pEnd = pStart + (p.durataMin || 60)
      const sStart = sh * 60 + sm
      return sStart >= pStart && sStart < pEnd
    })

  const getBlocco = (campoId, slot) =>
    blocchi.find(b => b.campoId === campoId && b.slot === slot)

  const handleSpostaPrenotazione = async () => {
    if (!modalSposta || !campoDest) return
    const { dbPublic: dbP } = await import('../firebase/config')
    const { doc: docFn, updateDoc } = await import('firebase/firestore')
    try {
      await updateDoc(docFn(dbPublic, 'prenotazioni', modalSposta.id), {
        campoId: campoDest,
        campoNome: campiFiltrati.find(c => c.id === campoDest)?.nome || ''
      })
      setModalSposta(null)
    } catch(e) { alert('Errore: ' + e.message) }
  }

  const handleCellaClick = (campoId, slot) => {
    const pren = getPrenotazione(campoId, slot)
    const blocco = getBlocco(campoId, slot)
    if (pren) {
      setModalSposta(pren)
      setCampoDest(campoId)
      return
    }
    if (blocco) {
      if (confirm(`Rimuovere il blocco "${blocco.nota || 'Bloccato'}"?`)) {
        deleteDoc(doc(db, 'blocchi', blocco.id))
      }
      return
    }
    setModalBlocco({ campoId, slot })
    setNotaBlocco('')
  }

  const handleBlocca = async () => {
    if (!modalBlocco) return
    await addDoc(collection(db, 'blocchi'), {
      campoId: modalBlocco.campoId,
      slot: modalBlocco.slot,
      data,
      nota: notaBlocco || 'Bloccato',
      createdAt: serverTimestamp()
    })
    setModalBlocco(null)
  }

  return (
    <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <h1>Pannello campi</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeDay(-1)} style={{ padding: '6px 12px' }}>←</button>
          <span style={{ fontWeight: 500, minWidth: 200, textAlign: 'center' }}>{fmtData(data)}</span>
          <button onClick={() => changeDay(1)} style={{ padding: '6px 12px' }}>→</button>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {Object.entries(SPORT_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setSport(key)}
            style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 13,
              fontWeight: sport === key ? 500 : 400,
              background: sport === key ? SPORT_COLORS[key] : 'white',
              color: sport === key ? 'white' : '#666',
              border: `0.5px solid ${sport === key ? SPORT_COLORS[key] : '#e0e0dc'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#EAF3DE', border: '0.5px solid #97C459', display: 'inline-block' }}></span> Libero
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#E6F1FB', border: '0.5px solid #85B7EB', display: 'inline-block' }}></span> Prenotato
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#FCEBEB', border: '0.5px solid #F09595', display: 'inline-block' }}></span> Bloccato
        </span>
      </div>

      {campiFiltrati.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessun campo attivo per questo sport.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', background: '#f5f5f3', border: '0.5px solid #e0e0dc', fontSize: 12, fontWeight: 500, color: '#666', minWidth: 80, textAlign: 'left' }}>Orario</th>
                {campiFiltrati.map(campo => (
                  <th key={campo.id} style={{
                    padding: '8px 12px', background: '#f5f5f3', border: '0.5px solid #e0e0dc',
                    fontSize: 12, fontWeight: 500, color: '#444', minWidth: 130, textAlign: 'center'
                  }}>
                    {campo.nome}
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{campo.indoor ? 'Indoor' : 'Outdoor'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot}>
                  <td style={{ padding: '6px 12px', border: '0.5px solid #e0e0dc', fontSize: 13, fontWeight: 500, color: '#444', background: '#fafaf8' }}>
                    {slot}
                  </td>
                  {campiFiltrati.map(campo => {
                    const pren = getPrenotazione(campo.id, slot)
                    const blocco = getBlocco(campo.id, slot)
                    let bg = 'white'
                    let content = null
                    if (pren) {
                      bg = '#E6F1FB'
                      content = <div style={{ fontSize: 12, color: '#0C447C' }}>
                        <div style={{ fontWeight: 500 }}>{pren.clienteNome?.split(' ')[0] || 'Cliente'}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{pren.tipoPartita} · €{pren.prezzo}</div>
                      </div>
                    } else if (blocco) {
                      bg = '#FCEBEB'
                      content = <div style={{ fontSize: 11, fontWeight: 500, color: '#A32D2D' }}>{blocco.nota}</div>
                    } else {
                      bg = '#F0FAF5'
                      content = <div style={{ fontSize: 11, color: '#3B6D11' }}>libero</div>
                    }
                    return (
                      <td key={campo.id}
                        onClick={() => handleCellaClick(campo.id, slot)}
                        style={{
                          padding: '6px 10px', border: '0.5px solid #e0e0dc',
                          background: bg, textAlign: 'center',
                          cursor: pren ? 'default' : 'pointer',
                          minWidth: 130
                        }}>
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalSposta && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: 380 }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Prenotazione</h3>
            <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: 13 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{modalSposta.clienteNome}</div>
              <div style={{ color: '#666' }}>{modalSposta.orario} · {modalSposta.tipoPartita} · {modalSposta.durataMin}min · €{modalSposta.prezzo}</div>
            </div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Sposta su campo</label>
            <select value={campoDest} onChange={e => setCampoDest(e.target.value)} style={{ marginBottom: 16 }}>
              {campiFiltrati.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.indoor ? '(Indoor)' : '(Outdoor)'}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleSpostaPrenotazione} style={{ flex: 1, padding: '10px' }}>
                Sposta prenotazione
              </button>
              <button onClick={() => setModalSposta(null)} style={{ flex: 1, padding: '10px' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {modalBlocco && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: 360 }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Blocca slot</h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: '1rem' }}>
              {campiFiltrati.find(c => c.id === modalBlocco.campoId)?.nome} · {modalBlocco.slot}
            </p>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Motivo</label>
            <input value={notaBlocco} onChange={e => setNotaBlocco(e.target.value)}
              placeholder="es. Scuola tennis, Manutenzione..."
              style={{ marginBottom: 16 }}
              onKeyDown={e => e.key === 'Enter' && handleBlocca()} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleBlocca} style={{ flex: 1, padding: '10px' }}>
                Blocca slot
              </button>
              <button onClick={() => setModalBlocco(null)} style={{ flex: 1, padding: '10px' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
