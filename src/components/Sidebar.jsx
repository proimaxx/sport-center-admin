import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', icon: '⛳', label: 'Campi' },
  { to: '/piscina', icon: '🏊', label: 'Piscina' },
  { to: '/estivi', icon: '🏕️', label: 'Centri estivi' },
  { to: '/prenotazioni', icon: '📋', label: 'Prenotazioni' },
  { to: '/calendario', icon: '📅', label: 'Calendario' },
  { to: '/impostazioni', icon: '⚙️', label: 'Impostazioni' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: 'white',
      borderRight: '0.5px solid #e0e0dc', padding: '1.5rem 0',
      display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '0.5px solid #e0e0dc', marginBottom: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 500 }}>Sport Center</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Pannello admin</div>
      </div>
      {links.map(l => (
        <NavLink key={l.to} to={l.to} end={l.to === '/'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 1.25rem', textDecoration: 'none',
            fontSize: 14, fontWeight: isActive ? 500 : 400,
            color: isActive ? '#185FA5' : '#444',
            background: isActive ? '#E6F1FB' : 'transparent',
            borderRadius: 8, margin: '0 8px',
          })}>
          <span>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </aside>
  )
}
