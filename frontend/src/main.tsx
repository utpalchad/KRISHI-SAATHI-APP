import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider, useWallet, WalletManager, NetworkId, WalletId } from '@txnlab/use-wallet-react' 
import { x402Client } from '@x402-avm/core/client' 
import { registerExactAvmScheme } from '@x402-avm/avm/exact/client' 
import type { ClientAvmSigner } from '@x402-avm/avm'
import './styles.css'

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
const TESTNET = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='
const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY],
  defaultNetwork: NetworkId.TESTNET,
})

type Profile = {
  name: string
  state: string
  district: string
  soil_type: string
  land_size_acres: number
  irrigation: boolean
  current_crop: string
  season: string
  language: string
}

type Service = { key: string; title: string; price: number; icon: string; desc: string }
const services: Service[] = [
  { key: 'soil', title: 'Soil Health Report', price: .05, icon: '🧪', desc: 'Interpret soil observations and identify what should be measured next.' },
  { key: 'water', title: 'Water Quality & Salinity', price: .05, icon: '💧', desc: 'Assess irrigation-water risks and salinity-stress indicators.' },
  { key: 'pathogen', title: 'Leaf & Pathogen Report', price: .10, icon: '🍃', desc: 'AI-assisted symptom review with uncertainty and lab-verification guidance.' },
  { key: 'fertilizer', title: 'Fertilizer Prescription', price: .10, icon: '🌱', desc: 'Create a farm-specific nutrient plan from supplied measurements.' },
]

const initialProfile: Profile = {
  name: 'Demo Farmer', state: 'Uttar Pradesh', district: 'Kanpur', soil_type: 'Loamy', land_size_acres: 2, irrigation: true, current_crop: 'Wheat', season: 'Rabi', language: 'en-IN'
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
  return r.json()
}

function decodeHeader(value: string | null) {
  if (!value) return null
  try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))) } catch { return null }
}

function PremiumPayment({ service, profile, onClose }: { service: Service; profile: Profile; onClose: () => void }) {
  const { activeAccount, signTransactions, connect, disconnect } = useWallet()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Connect an Algorand Testnet wallet to pay.')
  const [receipt, setReceipt] = useState<any>(null)
  const [report, setReport] = useState<any>(null)

  const signer = useMemo<ClientAvmSigner | null>(() => activeAccount ? ({
    address: activeAccount.address,
    signTransactions: async (txns, indexes) => signTransactions(txns, indexes)
  }) : null, [activeAccount, signTransactions])

  const endpoint = `/api/premium/${service.key === 'soil' ? 'soil-health' : service.key === 'water' ? 'water-quality' : service.key === 'pathogen' ? 'pathogen-report' : 'fertilizer'}`

  const pay = useCallback(async () => {
    if (!signer) return setStatus('Connect your wallet first.')
    setBusy(true); setReceipt(null); setReport(null); setStatus('Requesting 402 payment requirements…')
    try {
      const client = new x402Client()
      registerExactAvmScheme(client, { signer, networks: [TESTNET] })
      setStatus(`Preparing ${service.price.toFixed(2)} USDC Testnet payment…`)
      const response = await client.fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, inputs: { source: 'Krishi Saathi live browser x402', requested_service: service.title } })
      })
      if (!response.ok) throw new Error(`Payment request failed (${response.status}). ${await response.text()}`)
      const settlement = decodeHeader(response.headers.get('PAYMENT-RESPONSE'))
      setReceipt(settlement); setReport(await response.json())
      setStatus(settlement?.success ? 'Payment settled on Algorand Testnet. Report unlocked.' : 'Report unlocked. Settlement metadata was not returned.')
    } catch (e: any) {
      setStatus(e?.message || 'Wallet payment was cancelled or failed.')
    } finally { setBusy(false) }
  }, [endpoint, profile, service, signer])

  return <div className="modal-backdrop" onMouseDown={e => e.currentTarget === e.target && !busy && onClose()}>
    <div className="modal payment-modal">
      <button className="modal-x" onClick={onClose} disabled={busy}>×</button>
      <div className="eyebrow green">LIVE x402 · ALGORAND TESTNET</div>
      <h2>{service.icon} {service.title}</h2>
      <p className="muted">${service.price.toFixed(2)} USDC · paid only when you unlock this report.</p>
      <div className="payment-flow"><span>HTTP 402</span><i>→</i><span>Wallet signs</span><i>→</i><span>GoPlausible</span><i>→</i><span>Algorand</span></div>
      {!activeAccount ? <>
        <div className="wallet-copy">Your private key stays inside the wallet. Krishi Saathi only requests the transaction signature.</div>
        <div className="wallet-buttons">
          <button className="primary" onClick={() => connect(WalletId.PERA)}>Connect Pera</button>
          <button className="secondary" onClick={() => connect(WalletId.DEFLY)}>Connect Defly</button>
        </div>
      </> : <>
        <div className="wallet-address">✓ {activeAccount.address}</div>
        <button className="primary full" disabled={busy} onClick={pay}>{busy ? 'Processing x402 payment…' : `Pay $${service.price.toFixed(2)} USDC & Unlock`}</button>
        <button className="text-button" disabled={busy} onClick={() => disconnect()}>Disconnect wallet</button>
      </>}
      <div className="status-box"><b>Status</b><br/>{status}</div>
      {receipt?.success && <div className="receipt">
        <div className="success">✓ PAYMENT SETTLED</div>
        <div><b>Network:</b> {receipt.network || TESTNET}</div>
        <div><b>Payer:</b> {receipt.payer || activeAccount?.address}</div>
        <div><b>Transaction:</b> <code>{receipt.transaction}</code></div>
        {receipt.transaction && <a href={`https://lora.algokit.io/testnet/transaction/${receipt.transaction}`} target="_blank" rel="noreferrer">View real transaction on LoRA Testnet →</a>}
      </div>}
      {report && <div className="report-box"><b>Premium report unlocked</b><pre>{JSON.stringify(report.report, null, 2)}</pre></div>}
    </div>
  </div>
}

function App() {
  const [profile, setProfile] = useState<Profile>(() => JSON.parse(localStorage.getItem('krishi-profile') || 'null') || initialProfile)
  const [tab, setTab] = useState('home')
  const [brief, setBrief] = useState<any>(null)
  const [recs, setRecs] = useState<any>(null)
  const [weather, setWeather] = useState<any>(null)
  const [market, setMarket] = useState<any>(null)
  const [chat, setChat] = useState('')
  const [messages, setMessages] = useState<{role:string;text:string}[]>([])
  const [chatBusy, setChatBusy] = useState(false)
  const [health, setHealth] = useState<any>(null)
  const [healthImage, setHealthImage] = useState<string>('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { localStorage.setItem('krishi-profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { loadHome() }, [])
  const loadHome = async () => {
    const results = await Promise.allSettled([
      api<any>('/api/farm-brief', { method:'POST', body:JSON.stringify({ profile }) }),
      api<any>('/api/recommendations', { method:'POST', body:JSON.stringify({ profile }) }),
      api<any>('/api/weather', { method:'POST', body:JSON.stringify({ city:profile.district, country:'IN' }) }),
      api<any>('/api/market', { method:'POST', body:JSON.stringify({ commodity:profile.current_crop, state:profile.state, district:profile.district }) })
    ])

    const [b, r, w, m] = results

    if (b.status === 'fulfilled') setBrief(b.value)
    if (r.status === 'fulfilled') setRecs(r.value)
    if (w.status === 'fulfilled') setWeather(w.value)
    if (m.status === 'fulfilled') setMarket(m.value)

    if (r.status === 'rejected') {
      setRecs(null)
      setToast('Personalized crop recommendations are currently unavailable. Please try refreshing.')
    } else if (results.some(result => result.status === 'rejected')) {
      setToast('Some farm services are temporarily unavailable, but personalized recommendations are still active.')
    }
  }

  const ask = async () => {
    const q = chat.trim()
    if (!q || chatBusy) return
    setChat('')
    setChatBusy(true)
    setMessages(m => [...m, {role:'user',text:q}])
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 55000)
    try {
      const r = await fetch(`${API}/api/chat`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({profile,message:q}),
        signal: controller.signal,
      })
      if (!r.ok) throw new Error(`AI service returned ${r.status}`)
      const out = await r.json()
      const answer = String(out?.answer || '').trim()
      if (!answer) throw new Error('AI service returned an empty answer')
      setMessages(m => [...m,{role:'assistant',text:answer}])
    } catch (e: any) {
      const text = e?.name === 'AbortError'
        ? 'Krishi AI took too long to respond. Please try the question again.'
        : `Krishi AI is unavailable right now. ${e?.message || 'Please try again.'}`
      setMessages(m => [...m,{role:'assistant',text}])
    } finally {
      window.clearTimeout(timeout)
      setChatBusy(false)
    }
  }

  const analyze = async (file: File) => {
    setHealthImage(URL.createObjectURL(file)); setHealth({loading:true})
    const fd = new FormData(); fd.append('file', file)
    try { const r = await fetch(`${API}/api/crop-health`, {method:'POST',body:fd}); if(!r.ok) throw new Error(); setHealth(await r.json()) }
    catch { setHealth({analysis:'Could not reach the crop-health service.',disclaimer:'Start the Python backend and try again.'}) }
  }
  const setField = (k:keyof Profile, v:any) => setProfile(p => ({...p,[k]:v}))
  const marketPrice = market?.modal_price ?? market?.records?.[0]?.price ?? '—'
  const marketTrend = market?.trend ?? (market?.records?.length ? 'Market record available from the configured Python adapter.' : 'Market trend from the Python data adapter.')
  const weatherTemp = weather?.temperature_c ?? weather?.temperature ?? '—'
  const briefText = brief?.summary ?? brief?.brief ?? 'Loading your farm context…'

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="logo">कृ</div><div><strong>Krishi Saathi</strong><span>FROM SOIL TO SALE</span></div></div><div className="top-actions"><span className="testnet-pill">● TESTNET</span><button className="lang" onClick={()=>setField('language',profile.language==='hi-IN'?'en-IN':'hi-IN')}>{profile.language==='hi-IN'?'हिं':'EN'}</button></div></header>

    <main>
      {tab==='home' && <section className="hero-grid">
        <div className="hero-copy"><div className="eyebrow orange">ONE INTELLIGENT ASSISTANT FOR EVERY FARMER</div><h1>From <em>Soil</em> to <em>Sale.</em><br/>One farm. One companion.</h1><p>AI guidance, farm context, crop health, weather, market intelligence and paid expert-grade reports — connected in one simple workflow.</p><div className="hero-buttons"><button className="primary" onClick={()=>setTab('farm')}>Open My Farm →</button><button className="secondary" onClick={()=>setTab('premium')}>Explore x402 Services</button></div><div className="mini-stats"><span><b>01</b> Profile</span><span><b>02</b> Crop</span><span><b>03</b> Health</span><span><b>04</b> Market</span></div></div>
        <div className="hero-photo"><img src="/assets/farmer.jpg"/><div className="photo-tag">Your farm companion<br/><b>Practical. Local. Explainable.</b></div></div>
      </section>}

      {tab==='home' && <section className="brief-grid">
        <div className="section-heading"><div><div className="eyebrow green">LIVE FROM PYTHON BACKEND</div><h2>Today’s Farm Brief</h2></div><button className="icon-btn" onClick={loadHome}>↻ Refresh</button></div>
        <div className="cards three"><article className="card photo-card"><img src="/assets/field.jpg"/><div><span className="card-label">FIELD</span><h3>{profile.current_crop} · {profile.land_size_acres} acres</h3><p>{briefText}</p></div></article><article className="card"><span className="card-label">WEATHER</span><div className="big-number">{weatherTemp}°</div><h3>{weather?.condition || 'Current conditions'}</h3><p>{weather?.advice || `${weather?.humidity ?? '—'}% humidity · ${weather?.wind_mps ?? '—'} m/s wind`}</p></article><article className="card"><span className="card-label">MARKET</span><div className="big-number">₹{marketPrice}</div><h3>{profile.current_crop} · mandi</h3><p>{marketTrend}</p></article></div>
      </section>}

      {tab==='farm' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow green">FARM CONTEXT</div><h2>My Farm</h2></div><button className="primary small" onClick={loadHome}>Save & refresh</button></div><div className="farm-layout"><div className="farm-photo"><img src="/assets/field.jpg"/><div className="farm-photo-overlay"><b>{profile.district}, {profile.state}</b><span>{profile.soil_type} soil · {profile.land_size_acres} acres</span></div></div><div className="form-card">{[['name','Farmer name'],['state','State'],['district','District'],['soil_type','Soil type'],['season','Season']].map(([k,l])=><label key={k}>{l}<input value={String(profile[k as keyof Profile])} onChange={e=>setField(k as keyof Profile,e.target.value)}/></label>)}<label>Land size (acres)<input type="number" value={profile.land_size_acres} onChange={e=>setField('land_size_acres',Number(e.target.value))}/></label><label className="check"><input type="checkbox" checked={profile.irrigation} onChange={e=>setField('irrigation',e.target.checked)}/> Irrigation available</label></div></div><div className="recommend-row"><div><div className="eyebrow orange">EXPLAINABLE RECOMMENDATION</div><h2>What should I grow?</h2></div><div className="rec-cards">{recs?.recommendations?.length ? recs.recommendations.map((r:any)=><div className="rec-card" key={r.crop}><b>{r.crop}</b><strong>{r.score}%</strong><p>{r.reason || (r.reasons || []).join(' · ')}</p></div>) : <div className="rec-card"><b>Recommendations unavailable</b><p>Could not load personalized crop recommendations. Tap “Save & refresh” to try again.</p></div>}</div></div></section>}

      {tab==='health' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow green">FIELD DIAGNOSTICS</div><h2>Crop Health</h2></div></div><div className="health-layout"><div className="upload-card" onClick={()=>fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&analyze(e.target.files[0])}/>{healthImage ? <img src={healthImage}/> : <div className="upload-placeholder">📷<b>Upload a leaf photo</b><span>AI-assisted symptom review</span></div>}</div><div className="card health-result"><span className="card-label">ANALYSIS</span>{health?.loading ? <p>Analyzing image…</p> : health ? <><h3>{health.analysis}</h3><p>{health.disclaimer}</p></> : <p>Upload a clear crop photo to begin.</p>}</div></div></section>}

      {tab==='market' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow orange">FROM HARVEST TO SALE</div><h2>Market & Sale</h2></div></div><div className="market-hero"><img src="/assets/mandi.jpg"/><div className="market-overlay"><span>MARKET SNAPSHOT</span><strong>₹{marketPrice}</strong><p>{marketTrend}</p></div></div><div className="market-grid"><div className="card"><span className="card-label">COMMODITY</span><h3>{profile.current_crop}</h3><p>{market?.source || 'Python market adapter'}</p></div><div className="card"><span className="card-label">LOCATION</span><h3>{profile.district}</h3><p>{profile.state}</p></div><div className="card"><span className="card-label">NEXT ACTION</span><h3>Compare nearby mandis</h3><p>Use live market data before deciding where to sell.</p></div></div></section>}

      {tab==='premium' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow green">PAY PER REPORT · x402</div><h2>Premium Intelligence</h2></div></div><div className="service-grid">{services.map(s=><article className="service-card" key={s.key}><div className="service-icon">{s.icon}</div><h3>{s.title}</h3><p>{s.desc}</p><div className="service-bottom"><b>${s.price.toFixed(2)} USDC</b><button className="primary small" onClick={()=>setSelectedService(s)}>Unlock report</button></div></article>)}</div></section>}

      <section className="chat-section"><div className="section-heading"><div><div className="eyebrow green">KRISHI AI</div><h2>Ask your farm companion</h2></div></div><div className="chat-box"><div className="messages">{messages.length===0 && <div className="assistant-msg">Tell me what is happening on your farm. I’ll use your saved profile as context.</div>}{messages.map((m,i)=><div key={i} className={m.role==='user'?'user-msg':'assistant-msg'}>{m.text}</div>)}{chatBusy && <div className="assistant-msg">Krishi AI is thinking…</div>}</div><div className="chat-input"><input disabled={chatBusy} value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="e.g. What should I do if my leaves are yellow?"/><button className="primary" disabled={chatBusy || !chat.trim()} onClick={ask}>{chatBusy ? 'Thinking…' : 'Ask →'}</button></div></div></section>
    </main>

    <nav className="bottom-nav">{[['home','⌂','Home'],['farm','◫','My Farm'],['health','⌁','Crop Health'],['market','₹','Market'],['premium','✦','Premium']].map(([k,i,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}><span>{i}</span>{l}</button>)}</nav>
    {selectedService && <PremiumPayment service={selectedService} profile={profile} onClose={()=>setSelectedService(null)}/>} {toast && <div className="toast" onClick={()=>setToast('')}>{toast}</div>}
  </div>
}

createRoot(document.getElementById('root')!).render(<WalletProvider manager={walletManager}><App/></WalletProvider>)
