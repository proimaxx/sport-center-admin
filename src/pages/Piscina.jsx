import { useState, useEffect } from 'react'
import { db, dbPublic } from '../firebase/config'
import {
  doc, getDoc, setDoc, onSnapshot,
  collection, query, where, addDoc, serverTimestamp
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
    prezzoMattinaFeriale: 6,
    prezzoMattinaFestivo: 8,
    prezzoPomeriggioFeriale: 6,
    prezzoPomeriggioFestivo: 8,
    prezzoMezzaFeriale: 7,
    prezzoMezzaFestivo: 10,
    prezzoRidottoFeriale: 5,
    prezzoRidottoFestivo: 7,
    prezzoSoci: 6,
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [data, setData] = useState(oggi())
  const [prenotazioni, setPrenotazioni] = useState([])
  const [cerca, setCerca] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formPren, setFormPren] = useState({ clienteNome: '', clienteEmail: '', persone: 1, tipoIngresso: 'giornaliero', canale: 'in_sede' })
  const [formLoading, setFormLoading] = useState(false)

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

  const getPrezzoIngresso = (p) => {
    const fest = isFestivo(p.data || data)
    switch(p.tipoIngresso) {
      case 'giornaliero': return fest ? config.prezzoGiornalieroFestivo : config.prezzoGiornalieroFeriale
      case 'mattina': return fest ? config.prezzoMattinaFestivo : config.prezzoMattinaFeriale
      case 'pomeriggio': return fest ? config.prezzoPomeriggioFestivo : config.prezzoPomeriggioFeriale
      case 'ridotto': return fest ? config.prezzoRidottoFestivo : config.prezzoRidottoFeriale
      case 'soci': return config.prezzoSoci || 6
      default: return fest ? config.prezzoMezzaFestivo : config.prezzoMezzaFeriale
    }
  }

  const incassoPrevisto = prenotazioni.reduce((acc, p) => acc + (getPrezzoIngresso(p) * (p.persone || 1)), 0)

  const handleAddPrenotazione = async () => {
    if (!formPren.clienteNome.trim()) return alert('Inserisci il nome del cliente')
    if (postiLiberi < formPren.persone) return alert('Posti insufficienti!')
    setFormLoading(true)
    const fest = isFestivo(data)
    const prezzo = formPren.tipoIngresso === 'giornaliero'
      ? (fest ? config.prezzoGiornalieroFestivo : config.prezzoGiornalieroFeriale)
      : (fest ? config.prezzoMezzaFestivo : config.prezzoMezzaFeriale)
    try {
      await addDoc(collection(dbPublic, 'prenotazioniPiscina'), {
        clienteNome: formPren.clienteNome,
        clienteEmail: formPren.clienteEmail,
        persone: formPren.persone,
        tipoIngresso: formPren.tipoIngresso,
        canale: formPren.canale,
        data,
        prezzo,
        totale: prezzo * formPren.persone,
        stato: 'confermata',
        creadaAdmin: true,
      })
      setShowForm(false)
      setFormPren({ clienteNome: '', clienteEmail: '', persone: 1, tipoIngresso: 'giornaliero', canale: 'in_sede' })
    } catch(e) { alert('Errore: ' + e.message) }
    setFormLoading(false)
  }

  const prenotazioniFiltrate = prenotazioni.filter(p =>
    !cerca || (p.clienteNome || '').toLowerCase().includes(cerca.toLowerCase())
  )

  const percOccupazione = Math.round((postiOccupati / config.postiMax) * 100)
  const coloreBar = percOccupazione >= 90 ? '#E24B4A' : percOccupazione >= 70 ? '#EF9F27' : '#1D9E75'

  const priceField = (label, key) => (
    <div>
      <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type="number" min="0" step="0.5" value={config[key]}
        onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))} />
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1>🏊 Piscina</h1>
        <button onClick={() => setShowConfig(!showConfig)}
          style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: showConfig ? '#E6F1FB' : 'white', color: showConfig ? '#0C447C' : '#444', border: '0.5px solid #e0e0dc', cursor: 'pointer' }}>
          ⚙️ Configurazione
        </button>
      </div>

      {showConfig && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #85B7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Configurazione</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {configSaved && <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>✓ Salvato</span>}
              <button onClick={() => setShowConfig(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Posti massimi al giorno</label>
            <input type="number" min="1" value={config.postiMax}
              onChange={e => setConfig(c => ({ ...c, postiMax: parseInt(e.target.value) || 1 }))}
              style={{ maxWidth: 200 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              ['Giornaliero', 'prezzoGiornalieroFeriale', 'prezzoGiornalieroFestivo'],
              ['Mattina', 'prezzoMattinaFeriale', 'prezzoMattinaFestivo'],
              ['Pomeriggio', 'prezzoPomeriggioFeriale', 'prezzoPomeriggioFestivo'],
              ['Mezza giornata', 'prezzoMezzaFeriale', 'prezzoMezzaFestivo'],
              ['Ridotto (6-12 anni)', 'prezzoRidottoFeriale', 'prezzoRidottoFestivo'],
            ].map(([label, keyF, keyW]) => (
              <div key={label} style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {priceField('Feriale (€/persona)', keyF)}
                  {priceField('Festivo (€/persona)', keyW)}
                </div>
              </div>
            ))}
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px', marginBottom: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soci (tariffa unica)</div>
            <div style={{ maxWidth: 200 }}>
              {priceField('Prezzo soci (€/persona)', 'prezzoSoci')}
            </div>
          </div>
          </div>
          <button className="btn-primary" onClick={handleSaveConfig} disabled={configLoading}
            style={{ width: 'auto', padding: '8px 20px' }}>
            {configLoading ? 'Salvataggio...' : 'Salva configurazione'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <button onClick={() => changeDay(-1)} style={{ padding: '6px 12px' }}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 500 }}>{fmtData(data)}</div>
          <span style={{
            background: festivo ? '#FAEEDA' : '#E6F1FB',
            color: festivo ? '#633806' : '#0C447C',
            borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 500
          }}>
            {festivo ? 'Festivo' : 'Feriale'}
          </span>
        </div>
        <button onClick={() => changeDay(1)} style={{ padding: '6px 12px' }}>→</button>
        <input type="date" value={data} onChange={e => setData(e.target.value)}
          style={{ width: 'auto', padding: '6px 10px' }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem' }}>
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

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#666' }}>Occupazione</span>
          <span style={{ fontWeight: 500, color: coloreBar }}>{postiOccupati} / {config.postiMax} posti ({percOccupazione}%)</span>
        </div>
        <div style={{ background: '#f0f0ee', borderRadius: 99, height: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: coloreBar, width: `${Math.min(percOccupazione, 100)}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <input value={cerca} onChange={e => setCerca(e.target.value)}
        placeholder="🔍 Cerca per nome..."
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid #e0e0dc', fontSize: 14, marginBottom: '1rem' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3>Prenotazioni ({prenotazioniFiltrate.length})</h3>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#1D9E75', color: 'white', border: 'none', cursor: 'pointer' }}>
          + Nuova prenotazione
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid #1D9E75' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Nuova prenotazione</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Nome cliente *</label>
              <input placeholder="Nome e cognome" value={formPren.clienteNome}
                onChange={e => setFormPren(f => ({ ...f, clienteNome: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Email (opzionale)</label>
              <input placeholder="email@esempio.it" value={formPren.clienteEmail}
                onChange={e => setFormPren(f => ({ ...f, clienteEmail: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Numero persone</label>
              <input type="number" min="1" max={postiLiberi} value={formPren.persone}
                onChange={e => setFormPren(f => ({ ...f, persone: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Tipo ingresso</label>
              <select value={formPren.tipoIngresso} onChange={e => setFormPren(f => ({ ...f, tipoIngresso: e.target.value }))}>
                <option value="giornaliero">Giornaliero</option>
                <option value="mattina">Mattina</option>
                <option value="pomeriggio">Pomeriggio</option>
                <option value="mezza">Mezza giornata</option>
                <option value="ridotto">Ridotto (6-12 anni)</option>
                <option value="soci">Soci</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Canale</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['in_sede', '🏢 In sede'], ['telefonica', '📞 Telefonica'], ['online', '🌐 Online']].map(([val, label]) => (
                  <button key={val} onClick={() => setFormPren(f => ({ ...f, canale: val }))}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13,
                      fontWeight: formPren.canale === val ? 500 : 400,
                      background: formPren.canale === val ? '#E6F1FB' : 'white',
                      color: formPren.canale === val ? '#0C447C' : '#666',
                      border: formPren.canale === val ? '1.5px solid #85B7EB' : '0.5px solid #e0e0dc',
                      cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#666' }}>Totale</span>
            <span style={{ fontWeight: 500 }}>€{((formPren.tipoIngresso === 'giornaliero' ? (isFestivo(data) ? config.prezzoGiornalieroFestivo : config.prezzoGiornalieroFeriale) : (isFestivo(data) ? config.prezzoMezzaFestivo : config.prezzoMezzaFeriale)) * formPren.persone).toFixed(2)}</span>
          </div>
          <button className="btn-primary" onClick={handleAddPrenotazione} disabled={formLoading}
            style={{ width: 'auto', padding: '10px 24px' }}>
            {formLoading ? 'Salvataggio...' : 'Aggiungi prenotazione'}
          </button>
        </div>
      )}

      {prenotazioniFiltrate.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 14 }}>
          {cerca ? 'Nessun risultato.' : 'Nessuna prenotazione per questo giorno.'}
        </p>
      )}

      {prenotazioniFiltrate.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{p.clienteNome || 'Cliente'}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {p.persone} {p.persone === 1 ? 'persona' : 'persone'} · {p.tipoIngresso === 'giornaliero' ? 'Giornaliero' : 'Mezza giornata'} · €{(getPrezzoIngresso(p) * (p.persone || 1)).toFixed(2)}
              {p.clienteEmail && ` · ${p.clienteEmail}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={async () => {
              const { doc: docFn, updateDoc } = await import('firebase/firestore')
              await updateDoc(docFn(dbPublic, 'prenotazioniPiscina', p.id), { presente: !p.presente })
            }}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.presente ? '#1D9E75' : '#E24B4A',
                color: 'white', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              {p.presente ? '✓' : p.persone}
            </button>
            <span style={{
              background: p.tipoIngresso === 'giornaliero' ? '#E6F1FB' : '#EAF3DE',
              color: p.tipoIngresso === 'giornaliero' ? '#0C447C' : '#27500A',
              borderRadius: 99, fontSize: 11, padding: '3px 8px', fontWeight: 500
            }}>
              {({'giornaliero':'Giornaliero','mattina':'Mattina','pomeriggio':'Pomeriggio','mezza':'Mezza','ridotto':'Ridotto','soci':'Soci'})[p.tipoIngresso] || p.tipoIngresso}
            </span>
            <span style={{
              background: p.canale === 'telefonica' ? '#FAEEDA' : p.canale === 'in_sede' ? '#EAF3DE' : '#f5f5f3',
              color: p.canale === 'telefonica' ? '#633806' : p.canale === 'in_sede' ? '#27500A' : '#666',
              borderRadius: 99, fontSize: 11, padding: '3px 8px', fontWeight: 500
            }}>
              {p.canale === 'telefonica' ? '📞' : p.canale === 'in_sede' ? '🏢' : '🌐'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
