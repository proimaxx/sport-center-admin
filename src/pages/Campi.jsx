import { useState, useEffect } from 'react'
import { subscribeCampi, addCampo, updateCampo, deleteCampo } from '../firebase/services'

const SPORT_TYPES = ['tennis', 'padel', 'pickleball', 'calcio5']

const defaultCampo = {
  nome: '', sport: 'tennis', indoor: false,
  prezzoSingolo: 15, prezzoDoppio: 20, note: '', attivo: true
}

export default function Campi() {
  const [campi, setCampi] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultCampo)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = subscribeCampi(setCampi)
    return unsub
  }, [])

  const handleSave = async () => {
    if (!form.nome.trim()) return alert('Inserisci il nome del campo')
    setLoading(true)
    try {
      if (editId) {
        await updateCampo(editId, form)
      } else {
        await addCampo(form)
      }
      setShowForm(false)
      setForm(defaultCampo)
      setEditId(null)
    } catch (e) {
      alert('Errore: ' + e.message)
    }
    setLoading(false)
  }

  const handleEdit = (campo) => {
    const { id, createdAt, ...data } = campo
    setForm(data)
    setEditId(id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo campo?')) return
    await deleteCampo(id)
  }

  const handleToggle = (campo) => {
    updateCampo(campo.id, { attivo: !campo.attivo })
  }

  const grouped = SPORT_TYPES.reduce((acc, s) => {
    acc[s] = campi.filter(c => c.sport === s)
    return acc
  }, {})

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Gestione campi</h1>
        <button className="btn-primary" onClick={() => { setForm(defaultCampo); setEditId(null); setShowForm(true) }}>
          + Nuovo campo
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #378ADD' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editId ? 'Modifica campo' : 'Nuovo campo'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Nome campo</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Campo 1" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Sport</label>
              <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}>
                {SPORT_TYPES.map(s => <option key={s} value={s}>{
                s === 'calcio5' ? 'Calcio a 5' : s.charAt(0).toUpperCase() + s.slice(1)
              }</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Prezzo singolo (€/h)</label>
              <input type="number" min="0" step="0.5" value={form.prezzoSingolo}
                onChange={e => setForm(f => ({ ...f, prezzoSingolo: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Prezzo doppio (€/1h30)</label>
              <input type="number" min="0" step="0.5" value={form.prezzoDoppio}
                onChange={e => setForm(f => ({ ...f, prezzoDoppio: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={form.indoor ? 'indoor' : 'outdoor'} onChange={e => setForm(f => ({ ...f, indoor: e.target.value === 'indoor' }))}>
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Note</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="es. Illuminato, parcheggio..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }}>Annulla</button>
          </div>
        </div>
      )}

      {SPORT_TYPES.map(sport => (
        <div key={sport} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            {sport} — {grouped[sport].length} campi
          </div>
          {grouped[sport].length === 0 && (
            <p style={{ fontSize: 14, color: '#aaa', padding: '0.5rem 0' }}>Nessun campo. Clicca "+ Nuovo campo" per aggiungerne uno.</p>
          )}
          {grouped[sport].map(campo => (
            <div key={campo.id} className="card" style={{ marginBottom: 8, opacity: campo.attivo ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{campo.nome}</span>
                  <span className={`badge badge-${campo.sport}`}>{campo.sport === 'calcio5' ? 'Calcio a 5' : campo.sport}</span>
                  <span className="badge" style={{ background: '#f0f0ee', color: '#555' }}>{campo.indoor ? 'Indoor' : 'Outdoor'}</span>
                  {!campo.attivo && <span className="badge" style={{ background: '#FCEBEB', color: '#A32D2D' }}>Disattivato</span>}
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  Singolo €{campo.prezzoSingolo.toFixed(2)}/h · Doppio €{campo.prezzoDoppio.toFixed(2)}/1h30
                  {campo.note && ` · ${campo.note}`}
                </div>
              </div>
              <label className="toggle" aria-label="Attiva/disattiva">
                <input type="checkbox" checked={campo.attivo} onChange={() => handleToggle(campo)} />
                <span className="toggle-slider"></span>
              </label>
              <button onClick={() => handleEdit(campo)} style={{ padding: '6px 12px' }}>Modifica</button>
              <button className="btn-danger" onClick={() => handleDelete(campo.id)} style={{ padding: '6px 12px' }}>Elimina</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
