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
const getLunedi = (d) => {
  const date = new Date(d + 'T00:00:00')
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0]
}
const getVenerdi = (lunedi) => {
  const date = new Date(lunedi + 'T00:00:00')
  date.setDate(date.getDate() + 4)
  return date.toISOString().split('T')[0]
}

export default function Estivi() {
  const [config, setConfig] = useState({ postiMax: 30, prezzoSettimanale: 150, prezzoGiornaliero: 35 })
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [data, setData] = useState(oggi())
  const [tipoVista, setTipoVista] = useState('settimanale')
  const [prenotazioni, setPrenotazioni] = useState([])

  const lunedi = getLunedi(data)
  const venerdi = getVenerdi(lunedi)

  useEffect(() => {
    getDoc(doc(db, 'config', 'estivi')).then(snap => {
      if (snap.exists()) setConfig(snap.data())
    })
  }, [])

  useEffect(() => {
    const chiave = tipoVista === 'settimanale' ? lunedi : data
    const q = query(
      collection(dbPublic, 'prenotazioniEstivi'),
      where('chiave', '==', chiave),
      where('stato', '==', 'confermata')
    )
    const unsub = onSnapshot(q, snap =>
      setPrenotazioni(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [data, tipoVista, lunedi])

  const postiOccupati = prenotazioni.reduce((acc, p) => acc + (p.persone || 1), 0)
  const postiLiberi = config.postiMax - postiOccupati
  const percOccupazione = Math.round((postiOccupati / config.postiMax) * 100)
  const coloreBar = percOccupazione >= 90 ? '#E24B4A' : percOccupazione >= 70 ? '#EF9F27' : '#1D9E75'
  const incasso = prenotazioni.reduce((acc, p) => acc + (p.totale || 0), 0)

  const handleSaveConfig = async () => {
    setConfigLoading(true)
    await setDoc(doc(db, 'config', 'estivi'), config)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2500)
    setConfigLoading(false)
  }

  const changeDay = (delta) => {
    const d = new Date(data + 'T00:00:00')
    d.setDate(d.getDate() + (tipoVista === 'settimanale' ? delta * 7 : delta))
    setData(d.toISOString().split('T')[0])
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>🏕️ Centri estivi</h1>
        {configSaved && <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>✓ Salvato</span>}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Configurazione</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Posti massimi</label>
            <input type="number" min="1" value={config.postiMax}
              onChange={e => setConfig(c => ({ ...c, postiMax: parseInt(e.target.value) || 1 }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Prezzo settimanale (€)</label>
            <input type="number" min="0" step="0.5" value={config.prezzoSettimanale}
              onChange={e => setConfig(c => ({ ...c, prezzoSettimanale: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Prezzo giornaliero (€)</label>
            <input type="number" min="0" step="0.5" value={config.prezzoGiornaliero}
              onChange={e => setConfig(c => ({ ...c, prezzoGiornaliero: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <button className="btn-primary" onClick={handleSaveConfig} disabled={configLoading}
          style={{ width: 'auto', padding: '8px 20px' }}>
          {configLoading ? 'Salvataggio...' : 'Salva configurazione'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
          {['settimanale', 'giornaliero'].map(t => (
            <button key={t} onClick={() => setTipoVista(t)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13,
                fontWeight: tipoVista === t ? 500 : 400,
                background: tipoVista === t ? '#FFF3E0' : 'white',
                color: tipoVista === t ? '#E65100' : '#666',
                border: tipoVista === t ? '1.5px solid #FF9800' : '0.5px solid #e0e0dc',
              }}>
              {t === 'settimanale' ? '📅 Settimanale' : '☀️ Giornaliero'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
          <button onClick={() => changeDay(-1)} style={{ padding: '6px 12px' }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            {tipoVista === 'settimanale' ? (
              <>
                <div style={{ fontWeight: 500 }}>Settimana {lunedi} → {venerdi}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{fmtData(lunedi)} – {fmtData(venerdi)}</div>
              </>
            ) : (
              <div style={{ fontWeight: 500 }}>{fmtData(data)}</div>
            )}
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
              <div style={{ fontSize: 12, color: '#185FA5' }}>Iscritti</div>
            </div>
            <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500 }}>€{incasso.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Incasso previsto</div>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: 10 }}>Iscrizioni</h3>
        {prenotazioni.length === 0 && (
          <p style={{ color: '#aaa', fontSize: 14 }}>Nessuna iscrizione per questo periodo.</p>
        )}
        {prenotazioni.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{p.clienteNome || 'Cliente'}</div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {p.persone} {p.persone === 1 ? 'bambino' : 'bambini'} · {p.tipoIscrizione} · €{p.totale?.toFixed(2)}
                {p.clienteEmail && ` · ${p.clienteEmail}`}
              </div>
            </div>
            <span style={{
              background: p.tipoIscrizione === 'settimanale' ? '#FFF3E0' : '#EAF3DE',
              color: p.tipoIscrizione === 'settimanale' ? '#E65100' : '#27500A',
              borderRadius: 99, fontSize: 12, padding: '3px 10px', fontWeight: 500
            }}>
              {p.tipoIscrizione === 'settimanale' ? '📅 Settimanale' : '☀️ Giornaliero'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
