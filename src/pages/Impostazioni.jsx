import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '../firebase/services'

const defaultConfig = {
  oraApertura: '08:00',
  oraChiusura: '22:00',
  finestraMinOre: 48,
  slotSingolo: 60,
  slotDoppio: 90,
  nomecentro: 'Sport Center',
}

export default function Impostazioni() {
  const [config, setConfig] = useState(defaultConfig)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getConfig().then(data => { if (data) setConfig(c => ({ ...c, ...data })) })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('Errore nel salvataggio: ' + e.message)
    }
    setLoading(false)
  }

  const field = (label, key, type = 'text', extra = {}) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={config[key]}
        onChange={e => setConfig(c => ({ ...c, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
        style={{ maxWidth: 300 }} {...extra} />
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Impostazioni centro</h1>
        {saved && <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>✓ Salvato</span>}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Informazioni centro</h3>
        {field('Nome del centro', 'nomecentro')}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Orari di apertura</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('Apertura', 'oraApertura', 'time')}
          {field('Chiusura', 'oraChiusura', 'time')}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Finestra di prenotazione</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: '1rem' }}>
          Quante ore prima dell'orario il cliente può prenotare
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="number" min="1" max="720" value={config.finestraMinOre}
            onChange={e => setConfig(c => ({ ...c, finestraMinOre: parseInt(e.target.value) || 1 }))}
            style={{ maxWidth: 100 }} />
          <span style={{ fontSize: 14, color: '#666' }}>ore di preavviso minimo</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#1D9E75' }}>
          → Il cliente può prenotare fino a {config.finestraMinOre}h prima dell'orario scelto
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Durata slot</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: '1rem' }}>Durata in minuti per tipo di partita</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Singolo (minuti)</label>
            <input type="number" min="30" max="180" step="15" value={config.slotSingolo}
              onChange={e => setConfig(c => ({ ...c, slotSingolo: parseInt(e.target.value) || 60 }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Doppio (minuti)</label>
            <input type="number" min="30" max="180" step="15" value={config.slotDoppio}
              onChange={e => setConfig(c => ({ ...c, slotDoppio: parseInt(e.target.value) || 90 }))} />
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ padding: '10px 24px' }}>
        {loading ? 'Salvataggio...' : 'Salva impostazioni'}
      </button>
    </div>
  )
}
