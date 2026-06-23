import { useState, useEffect } from 'react'
import { db, dbPublic } from '../firebase/config'
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { subscribeCampi } from '../firebase/services'

const SPORT_LABELS = { tennis: 'Tennis', padel: 'Padel', pickleball: 'Pickleball', calcio5: 'Calcio a 5' }
const SPORT_COLORS = { tennis: '#C1440E', padel: '#2E7D32', pickleball: '#1565C0', calcio5: '#1B5E20' }
const CELL_W = 130
const SLOT_W = 70

const oggi = () => new Date().toISOString().split('T')[0]
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

function generaSlot() {
  const slots = []
  let min = 8 * 60
  while (min < 22 * 60) {
    slots.push(`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`)
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
  const [modalMulti, setModalMulti] = useState(false)
  const [multiCampo, setMultiCampo] = useState('')
  const [multiDa, setMultiDa] = useState('08:00')
  const [multiA, setMultiA] = useState('10:00')
  const [multiNota, setMultiNota] = useState('')

  useEffect(() => {
    const unsub = subscribeCampi(all => setCampi(all.filter(c => c.sport === sport)))
    return unsub
  }, [sport])

  useEffect(() => {
    const q = query(collection(dbPublic, 'prenotazioni'), where('data', '==', data), where('stato', '==', 'confermata'))
    return onSnapshot(q, snap => setPrenotazioni(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [data])

  useEffect(() => {
    const q = query(collection(db, 'blocchi'), where('data', '==', data))
    return onSnapshot(q, snap => setBlocchi(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [data])

  const changeDay = (delta) => {
    const d = new Date(data + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setData(d.toISOString().split('T')[0])
  }

  const slots = generaSlot()
  const campiFiltrati = campi.filter(c => c.attivo).sort((a, b) => a.nome.localeCompare(b.nome, 'it', { numeric: true }))

  const getPrenotazione = (campoId, slot) => prenotazioni.find(p => {
    if (p.campoId !== campoId) return false
    const [ph, pm] = p.orario.split(':').map(Number)
    const [sh, sm] = slot.split(':').map(Number)
    const pStart = ph * 60 + pm
    const pEnd = pStart + (p.durataMin || 60)
    const sStart = sh * 60 + sm
    return sStart >= pStart && sStart < pEnd
  })

  const getBlocco = (campoId, slot) => blocchi.find(b => b.campoId === campoId && b.slot === slot)

  const handleCellaClick = (campoId, slot) => {
    const pren = getPrenotazione(campoId, slot)
    const blocco = getBlocco(campoId, slot)
    if (pren) { setModalSposta(pren); setCampoDest(campoId); return }
    if (blocco) {
      if (confirm(`Rimuovere il blocco "${blocco.nota}"?`)) deleteDoc(doc(db, 'blocchi', blocco.id))
      return
    }
    setModalBlocco({ campoId, slot })
    setNotaBlocco('')
  }

  const handleBlocca = async () => {
    if (!modalBlocco) return
    await addDoc(collection(db, 'blocchi'), { campoId: modalBlocco.campoId, slot: modalBlocco.slot, data, nota: notaBlocco || 'Bloccato', createdAt: serverTimestamp() })
    setModalBlocco(null)
  }

  const handleBloccaMulti = async () => {
    if (!multiCampo || !multiNota) return
    const [dah, dam] = multiDa.split(':').map(Number)
    const [ah, am] = multiA.split(':').map(Number)
    let min = dah * 60 + dam
    const promises = []
    while (min < ah * 60 + am) {
      const slot = `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`
      promises.push(addDoc(collection(db, 'blocchi'), { campoId: multiCampo, slot, data, nota: multiNota, createdAt: serverTimestamp() }))
      min += 30
    }
    await Promise.all(promises)
    setModalMulti(false)
    setMultiNota('')
  }

  const handleSpostaPrenotazione = async () => {
    if (!modalSposta || !campoDest) return
    try {
      await updateDoc(doc(dbPublic, 'prenotazioni', modalSposta.id), {
        campoId: campoDest,
        campoNome: campiFiltrati.find(c => c.id === campoDest)?.nome || ''
      })
      setModalSposta(null)
    } catch(e) { alert('Errore: ' + e.message) }
  }

  const Modal = ({ children }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: 380 }}>{children}</div>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <h1>Pannello campi</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { setModalMulti(true); setMultiCampo(campiFiltrati[0]?.id || '') }}
            style={{ padding: '8px 14px', background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 8, fontWeight: 500, fontSize: 13 }}>
            🚫 Blocco multiplo
          </button>
          {[0, 1, 2].map(delta => {
            const d = new Date()
            d.setDate(d.getDate() + delta)
            const dateStr = d.toISOString().split('T')[0]
            const labels = ['Oggi', 'Domani', 'Dopodomani']
            const isSelected = data === dateStr
            return (
              <button key={delta} onClick={() => setData(dateStr)}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 13,
                  fontWeight: isSelected ? 500 : 400,
                  background: isSelected ? '#185FA5' : 'white',
                  color: isSelected ? 'white' : '#444',
                  border: isSelected ? 'none' : '0.5px solid #e0e0dc',
                  cursor: 'pointer'
                }}>
                {labels[delta]}
              </button>
            )
          })}
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {Object.entries(SPORT_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setSport(key)}
            style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: sport === key ? 500 : 400, background: sport === key ? SPORT_COLORS[key] : 'white', color: sport === key ? 'white' : '#666', border: `0.5px solid ${sport === key ? SPORT_COLORS[key] : '#e0e0dc'}` }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: '1rem', fontSize: 12 }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#F0FAF5', border: '0.5px solid #97C459', marginRight: 4 }}></span>Libero</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#E6F1FB', border: '0.5px solid #85B7EB', marginRight: 4 }}></span>Prenotato</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#FCEBEB', border: '0.5px solid #F09595', marginRight: 4 }}></span>Bloccato</span>
      </div>

      {campiFiltrati.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessun campo attivo per questo sport.</p>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #e0e0dc', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ width: SLOT_W, minWidth: SLOT_W, flexShrink: 0, padding: '8px 10px', background: '#f5f5f3', fontSize: 12, fontWeight: 500, color: '#666', borderRight: '0.5px solid #e0e0dc' }}>Orario</div>
            {campiFiltrati.map(campo => (
              <div key={campo.id} style={{ width: CELL_W, minWidth: CELL_W, flexShrink: 0, padding: '8px 6px', background: '#f5f5f3', fontSize: 12, fontWeight: 500, color: '#444', textAlign: 'center', borderRight: '0.5px solid #e0e0dc' }}>
                {campo.nome}
                <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{campo.indoor ? 'Indoor' : 'Outdoor'}</div>
              </div>
            ))}
          </div>
          {slots.map(slot => (
            <div key={slot} style={{ display: 'flex', borderBottom: '0.5px solid #e0e0dc' }}>
              <div style={{ width: SLOT_W, minWidth: SLOT_W, flexShrink: 0, padding: '6px 10px', background: '#fafaf8', fontSize: 13, fontWeight: 500, color: '#444', borderRight: '0.5px solid #e0e0dc', display: 'flex', alignItems: 'center' }}>
                {slot}
              </div>
              {campiFiltrati.map(campo => {
                const pren = getPrenotazione(campo.id, slot)
                const blocco = getBlocco(campo.id, slot)
                let bg = '#F0FAF5'
                let textContent = <span style={{ fontSize: 11, color: '#97C459' }}>libero</span>
                if (pren) {
                  bg = '#E6F1FB'
                  const cognome = (pren.clienteNome || 'CLIENTE').split(' ').pop().toUpperCase()
                  textContent = <span style={{ fontSize: 12, fontWeight: 600, color: '#0C447C', letterSpacing: '0.03em' }}>{cognome}</span>
                } else if (blocco) {
                  bg = '#FCEBEB'
                  textContent = <span style={{ fontSize: 11, fontWeight: 500, color: '#A32D2D' }}>{blocco.nota}</span>
                }
                return (
                  <div key={campo.id} onClick={() => handleCellaClick(campo.id, slot)}
                    style={{ width: CELL_W, minWidth: CELL_W, flexShrink: 0, height: 36, padding: '0 6px', background: bg, borderRight: '0.5px solid #e0e0dc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {textContent}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {modalSposta && (
        <Modal>
          <h3 style={{ marginBottom: '0.5rem' }}>Dettagli prenotazione</h3>
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: 13 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{modalSposta.clienteNome}</div>
            <div style={{ color: '#666', marginBottom: 6 }}>{modalSposta.orario} · {modalSposta.tipoPartita} · {modalSposta.durataMin}min · €{modalSposta.prezzo}</div>
            {modalSposta.giocatori && modalSposta.giocatori.length > 0 && (
              <div style={{ borderTop: '0.5px solid #e0e0dc', paddingTop: 6, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>GIOCATORI</div>
                {modalSposta.giocatori.map((g, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#333', fontWeight: i === 0 ? 500 : 400 }}>
                    {i + 1}. {g}
                  </div>
                ))}
              </div>
            )}
          </div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Sposta su campo</label>
          <select value={campoDest} onChange={e => setCampoDest(e.target.value)} style={{ marginBottom: 16 }}>
            {campiFiltrati.map(c => <option key={c.id} value={c.id}>{c.nome} {c.indoor ? '(Indoor)' : '(Outdoor)'}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleSpostaPrenotazione} style={{ flex: 1, padding: '10px' }}>Sposta</button>
            <button onClick={async () => {
              if (!confirm('Cancellare questa prenotazione?')) return
              await updateDoc(doc(dbPublic, 'prenotazioni', modalSposta.id), { stato: 'cancellata' })
              setModalSposta(null)
            }} style={{ flex: 1, padding: '10px', background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 8, cursor: 'pointer' }}>
              Cancella
            </button>
            <button onClick={() => setModalSposta(null)} style={{ padding: '10px 16px' }}>Chiudi</button>
          </div>
        </Modal>
      )}

      {modalBlocco && (
        <Modal>
          <h3 style={{ marginBottom: '0.5rem' }}>Blocca slot</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: '1rem' }}>{campiFiltrati.find(c => c.id === modalBlocco.campoId)?.nome} · {modalBlocco.slot}</p>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Motivo</label>
          <input value={notaBlocco} onChange={e => setNotaBlocco(e.target.value)} placeholder="es. Scuola tennis, Manutenzione..." style={{ marginBottom: 16 }} onKeyDown={e => e.key === 'Enter' && handleBlocca()} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleBlocca} style={{ flex: 1, padding: '10px' }}>Blocca</button>
            <button onClick={() => setModalBlocco(null)} style={{ flex: 1, padding: '10px' }}>Annulla</button>
          </div>
        </Modal>
      )}

      {modalMulti && (
        <Modal>
          <h3 style={{ marginBottom: '1rem' }}>Blocco multiplo</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Campo</label>
            <select value={multiCampo} onChange={e => setMultiCampo(e.target.value)}>
              {campiFiltrati.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Dalle</label>
              <input type="time" value={multiDa} onChange={e => setMultiDa(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Alle</label>
              <input type="time" value={multiA} onChange={e => setMultiA(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Motivo</label>
            <input value={multiNota} onChange={e => setMultiNota(e.target.value)} placeholder="es. Scuola tennis, Torneo..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleBloccaMulti} style={{ flex: 1, padding: '10px', background: '#E24B4A', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Blocca intervallo</button>
            <button onClick={() => setModalMulti(false)} style={{ flex: 1, padding: '10px' }}>Annulla</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
