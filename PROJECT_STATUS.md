# Sport Center Admin — Project Status

## Ultimo aggiornamento
Giugno 2026 — Sessione 1

## Stack
- React + Vite
- Firebase (Firestore + Auth)
- react-router-dom
- Deploy: Vercel (`vercel --prod --force` da `~/Desktop/sport-center-admin`)

## Struttura cartelle
```
src/
  firebase/
    config.js       ← credenziali Firebase (da compilare)
    services.js     ← tutte le funzioni Firestore
  components/
    Sidebar.jsx     ← navigazione laterale
  pages/
    Campi.jsx       ← gestione campi (CRUD completo)
    Prenotazioni.jsx ← lista prenotazioni con filtri
    Calendario.jsx  ← vista giornaliera per campo
    Impostazioni.jsx ← orari, finestra prenotazione, slot
  styles/
    global.css      ← variabili CSS e componenti base
```

## Firestore — Collezioni
| Collezione | Descrizione |
|---|---|
| `campi` | Campi sportivi (nome, sport, indoor, prezzi, attivo) |
| `prenotazioni` | Prenotazioni clienti (stato, orario, data, cliente) |
| `config/centro` | Documento singolo con impostazioni globali |
| `disponibilita` | Date/campi bloccati dall'admin |

## Documento config/centro
```json
{
  "nomecentro": "Sport Center",
  "oraApertura": "08:00",
  "oraChiusura": "22:00",
  "finestraMinOre": 48,
  "slotSingolo": 60,
  "slotDoppio": 90
}
```

## Cosa manca (da fare)
- [ ] Creare progetto Firebase e inserire credenziali in config.js
- [ ] Creare documento `config/centro` su Firestore con valori default
- [ ] Autenticazione admin (PIN o email/password)
- [ ] App cliente (sport-center-public) — separata
- [ ] Notifiche email + WhatsApp (conferma + promemoria 2h prima)
- [ ] Blocco disponibilità per data/campo nella pagina Impostazioni
- [ ] Deploy su Vercel

## App cliente (da iniziare)
- React + Firebase separato
- Registrazione email/password
- Vista data → griglia campi disponibili
- Prenotazione automaticamente confermata
- Notifiche email + WhatsApp

## Note
- La finestra minima di prenotazione (es. 48h) è salvata in `config/centro.finestraMinOre`
- L'app cliente leggerà i campi dal Firestore admin (come il lido)
- Prezzi singolo/doppio configurati per ogni campo individualmente
