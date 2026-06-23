import { useState, useEffect } from 'react'
import { db, dbPublic } from '../firebase/config'
import {
  doc, getDoc, setDoc, onSnapshot,
  collection, query, where
} from 'firebase/firestore'

const oggi = () => new Date().toISOString().split('T')[0]
const fmtData = (d) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const isFestivo = (d) => {
  const day = new Date(d + 'T00:00:00').getDay()
  return day === 0 || day === 6
}

export default function Piscina() {
  const [config, setConfig] = useState({
    postiMax: 50,
    prezzoGiornalieroFeriale: 10,
    prezzoGiornalieroFestivo: 14,
    prezzoMezzaFeriale: 7,
    prezzoMezzaFestivo: 10,
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [data, setData] = useState(oggi())
  const [prenotazioni, setPrenotazioni] = useState([])

  useEffect(() => {
    getDoc(doc(db, 'config', 'piscina')).then(snap => {
      if (snap.exists()) setConfig(snap.data())
    })
  }, [])

  useEffect(() => {
    const q = query(
      collection(dbPublic, 'prenotazioniPiscina'),
      where('data', '==', data),
      where('stato', '==', 'confermata')
    )
    const unsub = onSnapshot(q, snap =>
      setPrenotazioni(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [data])

  const postiOccupati = prenotazioni.reduce((acc, p) => acc + (p.persone || 1), 0)
  const postiLiberi = config.postiMax - postiOccupati
  const festivo = isFestivo(data)

  const handleSaveConfig = async () => {
    setConfigLoading(true)
    await setDoc(doc(db, 'config', 'piscina'), config)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2500)
    setConfigLoading(false)
  }

  const changeDay = (delta) => {
    const d = new Date(data + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setData(d.toISOString().split('T')[0])
  }

  const percOccupazione = Math.round((postiOccupati / config.postiMax) * 100)
  const coloreBar = percOccupazione >= 90 ? '#E24B4A' : percOccupazione >= 70 ? '#EF9F27' : '#1D9E75'

  const getPrezzoIngresso = (p) => {
    const fest = isFestivo(p.data || data)
    if (p.tipoIngresso === 'giornaliero') return fest ? config.prezzoGiornalieroFestivo : config.prezzoGiornalieroFeriale
    return fest ? config.prezzoMezzaFestivo : config.prezzoMezzaFeriale
  }

  const incassoPrevisto = prenotazioni.reduce((acc, p) => acc + (getPrezzoIngresso(p) * (p.persone || 1)), 0)

  const priceField = (label, key) => (
    <div>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type="number" min="0" step="0.5" value={config[key]}
        onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))} />
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Piscina</h1>
        {configSaved && <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>✓ Salvato</span>}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Configurazione</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Posti massimi al giorno</label>
          <input type="number" min="1" value={config.postiMax}
            onChange={e => setConfig(c => ({ ...c, postiMax: parseInt(e.target.value) || 1 }))}
            style={{ maxWidth: 200 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giornaliero</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {priceField('Feriale (€/persona)', 'prezzoGiornalieroFeriale')}
              {priceField('Festivo (€/persona)', 'prezzoGiornalieroFestivo')}
            </div>
          </div>
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mezza giornata</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {priceField('Feriale (€/persona)', 'prezzoMezzaFeriale')}
              {priceField('Festivo (€/persona)', 'prezzoMezzaFestivo')}
            </div>
          </div>
        </div>
        <button className="btn-primary" onClick={handleSaveConfig} disabled={configLoading}
          style={{ width: 'auto', padding: '8px 20px' }}>
          {configLoading ? 'Salvataggio...' : 'Salva configurazione'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
          <button onClick={() => changeDay(-1)} style={{ padding: '6px 12px' }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 500 }}>{fmtData(data)}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              <span style={{
                background: festivo ? '#FAEEDA' : '#E6F1FB',
                color: festivo ? '#633806' : '#0C447C',
                borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 500
              }}>
                {festivo ? 'Festivo' : 'Feriale'}
              </span>
            </div>
          </div>
          <button onClick={() => changeDay(1)} style={{ padding: '6px 12px' }}>→</button>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: '#666' }}>Occupazione</span>
            <span style={{ fontWeight: 500, color: coloreBar }}>{postiOccupati} / {config.postiMax} posti ({percOccupazione}%)</span>
          </div>
          <div style={{ background: '#f0f0ee', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, background: coloreBar,
              width: `${Math.min(percOccupazione, 100)}%`, transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ background: '#EAF3DE', borderRadius: 8, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#27500A' }}>{postiLiberi}</div>
              <div style={{ fontSize: 12, color: '#3B6D11' }}>Posti liberi</div>
            </div>
            <div style={{ background: '#E6F1FB', borderRadius: 8, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#0C447C' }}>{postiOccupati}</div>
              <div style={{ fontSize: 12, color: '#185FA5' }}>Posti occupati</div>
            </div>
            <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500 }}>€{incassoPrevisto.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Incasso previsto</div>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: 10 }}>Prenotazioni del giorno</h3>
        {prenotazioni.length === 0 && (
          <p style={{ color: '#aaa', fontSize: 14 }}>Nessuna prenotazione per questo giorno.</p>
        )}
        {prenotazioni.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{p.clienteNome || 'Cliente'}</div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {p.persone} {p.persone === 1 ? 'persona' : 'persone'} · {p.tipoIngresso === 'giornaliero' ? 'Giornaliero' : 'Mezza giornata'} · €{(getPrezzoIngresso(p) * p.persone).toFixed(2)} in loco
                {p.clienteEmail && ` · ${p.clienteEmail}`}
              </div>
            </div>
            <span style={{
              background: p.tipoIngresso === 'giornaliero' ? '#E6F1FB' : '#EAF3DE',
              color: p.tipoIngresso === 'giornaliero' ? '#0C447C' : '#27500A',
              borderRadius: 99, fontSize: 12, padding: '3px 10px', fontWeight: 500
            }}>
              {p.tipoIngresso === 'giornaliero' ? 'Giornaliero' : 'Mezza'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
