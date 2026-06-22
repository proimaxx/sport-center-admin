import { useState, useEffect } from 'react'
import { subscribePrenotazioni, cancellaPrenotazione } from '../firebase/services'

const STATO_COLORS = {
  confermata: { bg: '#EAF3DE', color: '#27500A' },
  cancellata: { bg: '#FCEBEB', color: '#A32D2D' },
  in_attesa: { bg: '#FAEEDA', color: '#633806' },
}

export default function Prenotazioni() {
  const [prenotazioni, setPrenotazioni] = useState([])
  const [filtroData, setFiltroData] = useState('')
  const [filtroSport, setFiltroSport] = useState('tutti')

  useEffect(() => {
    const unsub = subscribePrenotazioni(setPrenotazioni)
    return unsub
  }, [])

  const filtrate = prenotazioni.filter(p => {
    if (filtroData && p.data !== filtroData) return false
    if (filtroSport !== 'tutti' && p.sport !== filtroSport) return false
    return true
  })

  const handleCancella = async (id) => {
    if (!confirm('Cancellare questa prenotazione?')) return
    await cancellaPrenotazione(id)
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Prenotazioni</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filtroSport} onChange={e => setFiltroSport(e.target.value)} style={{ width: 'auto' }}>
            <option value="tutti">Tutti gli sport</option>
            <option value="tennis">Tennis</option>
            <option value="padel">Padel</option>
            <option value="pickleball">Pickleball</option>
          </select>
          <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={{ width: 'auto' }} />
          {filtroData && <button onClick={() => setFiltroData('')}>✕ Rimuovi filtro</button>}
        </div>
      </div>

      {filtrate.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessuna prenotazione trovata.</p>
      )}

      {filtrate.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{p.orario}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{p.durata}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{p.clienteNome || 'Cliente'}</span>
              <span className={`badge badge-${p.sport}`}>{p.sport}</span>
              <span className="badge" style={{ background: '#f0f0ee', color: '#555' }}>{p.campoNome}</span>
              <span className="badge" style={{ ...(STATO_COLORS[p.stato] || STATO_COLORS.in_attesa) }}>{p.stato}</span>
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {p.data} · {p.tipoPartita} · €{p.prezzo?.toFixed(2)}
              {p.clienteEmail && ` · ${p.clienteEmail}`}
            </div>
          </div>
          {p.stato !== 'cancellata' && (
            <button className="btn-danger" onClick={() => handleCancella(p.id)} style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
              Cancella
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
