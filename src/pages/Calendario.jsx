import { useState, useEffect } from 'react'
import { subscribePrenotazioniByData } from '../firebase/services'
import { subscribeCampi } from '../firebase/services'

const today = () => new Date().toISOString().split('T')[0]

export default function Calendario() {
  const [data, setData] = useState(today())
  const [prenotazioni, setPrenotazioni] = useState([])
  const [campi, setCampi] = useState([])

  useEffect(() => {
    const unsub = subscribeCampi(setCampi)
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribePrenotazioniByData(data, setPrenotazioni)
    return unsub
  }, [data])

  const changeDay = (delta) => {
    const d = new Date(data)
    d.setDate(d.getDate() + delta)
    setData(d.toISOString().split('T')[0])
  }

  const fmtData = (d) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const prenotazioniPerCampo = (campoId) =>
    prenotazioni.filter(p => p.campoId === campoId)

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <h1>Calendario</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button onClick={() => changeDay(-1)} style={{ padding: '6px 12px' }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 500, minWidth: 220, textAlign: 'center' }}>{fmtData(data)}</span>
          <button onClick={() => changeDay(1)} style={{ padding: '6px 12px' }}>→</button>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: 'auto' }} />
        </div>
      </div>

      {campi.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessun campo configurato. Vai nella sezione Campi per aggiungerne.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {campi.filter(c => c.attivo).map(campo => {
          const pren = prenotazioniPerCampo(campo.id)
          return (
            <div key={campo.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontWeight: 500 }}>{campo.nome}</span>
                <span className={`badge badge-${campo.sport}`}>{campo.sport}</span>
              </div>
              {pren.length === 0 && (
                <p style={{ fontSize: 13, color: '#aaa' }}>Nessuna prenotazione</p>
              )}
              {pren.map(p => (
                <div key={p.id} style={{
                  background: '#EAF3DE', borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                  borderLeft: '3px solid #1D9E75'
                }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{p.orario} — {p.clienteNome}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>{p.tipoPartita} · €{p.prezzo?.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
