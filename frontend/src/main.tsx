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


type LangCode = 'en-IN'|'hi-IN'|'pa-IN'|'mr-IN'|'bn-IN'|'gu-IN'|'ta-IN'|'te-IN'|'kn-IN'|'ml-IN'|'or-IN'|'as-IN'
const languages: {code:LangCode; label:string}[] = [
  {code:'en-IN',label:'English'}, {code:'hi-IN',label:'हिन्दी'}, {code:'pa-IN',label:'ਪੰਜਾਬੀ'},
  {code:'mr-IN',label:'मराठी'}, {code:'bn-IN',label:'বাংলা'}, {code:'gu-IN',label:'ગુજરાતી'},
  {code:'ta-IN',label:'தமிழ்'}, {code:'te-IN',label:'తెలుగు'}, {code:'kn-IN',label:'ಕನ್ನಡ'},
  {code:'ml-IN',label:'മലയാളം'}, {code:'or-IN',label:'ଓଡ଼ିଆ'}, {code:'as-IN',label:'অসমীয়া'}
]
const ui: Record<string, Record<LangCode,string>> = {
  tagline:{'en-IN':'FROM SOIL TO SALE','hi-IN':'मिट्टी से बाज़ार तक','pa-IN':'ਮਿੱਟੀ ਤੋਂ ਮੰਡੀ ਤੱਕ','mr-IN':'मातीपासून बाजारापर्यंत','bn-IN':'মাটি থেকে বাজার পর্যন্ত','gu-IN':'માટીથી બજાર સુધી','ta-IN':'மண்ணிலிருந்து சந்தை வரை','te-IN':'నేల నుండి మార్కెట్ వరకు','kn-IN':'ಮಣ್ಣಿನಿಂದ ಮಾರುಕಟ್ಟೆಯವರೆಗೆ','ml-IN':'മണ്ണിൽ നിന്ന് വിപണിയിലേക്ക്','or-IN':'ମାଟିରୁ ବଜାର ପର୍ଯ୍ୟନ୍ତ','as-IN':'মাটিৰ পৰা বজাৰলৈ'},
  home:{'en-IN':'Home','hi-IN':'होम','pa-IN':'ਮੁੱਖ ਪੰਨਾ','mr-IN':'मुख्यपृष्ठ','bn-IN':'হোম','gu-IN':'હોમ','ta-IN':'முகப்பு','te-IN':'హోమ్','kn-IN':'ಮುಖಪುಟ','ml-IN':'ഹോം','or-IN':'ହୋମ','as-IN':'হোম'},
  myFarm:{'en-IN':'My Farm','hi-IN':'मेरा खेत','pa-IN':'ਮੇਰਾ ਖੇਤ','mr-IN':'माझे शेत','bn-IN':'আমার খামার','gu-IN':'મારું ખેતર','ta-IN':'என் பண்ணை','te-IN':'నా పొలం','kn-IN':'ನನ್ನ ಹೊಲ','ml-IN':'എന്റെ കൃഷിയിടം','or-IN':'ମୋ ଖେତ','as-IN':'মোৰ খেতি'},
  cropHealth:{'en-IN':'Crop Health','hi-IN':'फसल स्वास्थ्य','pa-IN':'ਫਸਲ ਸਿਹਤ','mr-IN':'पीक आरोग्य','bn-IN':'ফসলের স্বাস্থ্য','gu-IN':'પાક આરોગ્ય','ta-IN':'பயிர் நலம்','te-IN':'పంట ఆరోగ్యం','kn-IN':'ಬೆಳೆ ಆರೋಗ್ಯ','ml-IN':'വിള ആരോഗ്യം','or-IN':'ଫସଲ ସ୍ୱାସ୍ଥ୍ୟ','as-IN':'শস্য স্বাস্থ্য'},
  market:{'en-IN':'Market','hi-IN':'बाज़ार','pa-IN':'ਮੰਡੀ','mr-IN':'बाजार','bn-IN':'বাজার','gu-IN':'બજાર','ta-IN':'சந்தை','te-IN':'మార్కెట్','kn-IN':'ಮಾರುಕಟ್ಟೆ','ml-IN':'വിപണി','or-IN':'ବଜାର','as-IN':'বজাৰ'},
  premium:{'en-IN':'Premium','hi-IN':'प्रीमियम','pa-IN':'ਪ੍ਰੀਮੀਅਮ','mr-IN':'प्रीमियम','bn-IN':'প্রিমিয়াম','gu-IN':'પ્રીમિયમ','ta-IN':'பிரீமியம்','te-IN':'ప్రీమియం','kn-IN':'ಪ್ರೀಮಿಯಂ','ml-IN':'പ്രീമിയം','or-IN':'ପ୍ରିମିୟମ','as-IN':'প্ৰিমিয়াম'},
  farmContext:{'en-IN':'FARM CONTEXT','hi-IN':'खेत की जानकारी','pa-IN':'ਖੇਤ ਦੀ ਜਾਣਕਾਰੀ','mr-IN':'शेताची माहिती','bn-IN':'খামারের তথ্য','gu-IN':'ખેતરની માહિતી','ta-IN':'பண்ணை விவரம்','te-IN':'పొలం సమాచారం','kn-IN':'ಹೊಲದ ಮಾಹಿತಿ','ml-IN':'കൃഷിയിട വിവരം','or-IN':'ଖେତ ସୂଚନା','as-IN':'খেতিৰ তথ্য'},
  farmerName:{'en-IN':'Farmer name','hi-IN':'किसान का नाम','pa-IN':'ਕਿਸਾਨ ਦਾ ਨਾਮ','mr-IN':'शेतकऱ्याचे नाव','bn-IN':'কৃষকের নাম','gu-IN':'ખેડૂતનું નામ','ta-IN':'விவசாயியின் பெயர்','te-IN':'రైతు పేరు','kn-IN':'ರೈತನ ಹೆಸರು','ml-IN':'കർഷകന്റെ പേര്','or-IN':'ଚାଷୀଙ୍କ ନାମ','as-IN':'কৃষকৰ নাম'},
  state:{'en-IN':'State','hi-IN':'राज्य','pa-IN':'ਰਾਜ','mr-IN':'राज्य','bn-IN':'রাজ্য','gu-IN':'રાજ્ય','ta-IN':'மாநிலம்','te-IN':'రాష్ట్రం','kn-IN':'ರಾಜ್ಯ','ml-IN':'സംസ്ഥാനം','or-IN':'ରାଜ୍ୟ','as-IN':'ৰাজ্য'},
  district:{'en-IN':'District','hi-IN':'जिला','pa-IN':'ਜ਼ਿਲ੍ਹਾ','mr-IN':'जिल्हा','bn-IN':'জেলা','gu-IN':'જિલ્લો','ta-IN':'மாவட்டம்','te-IN':'జిల్లా','kn-IN':'ಜಿಲ್ಲೆ','ml-IN':'ജില്ല','or-IN':'ଜିଲ୍ଲା','as-IN':'জিলা'},
  soilType:{'en-IN':'Soil type','hi-IN':'मिट्टी का प्रकार','pa-IN':'ਮਿੱਟੀ ਦੀ ਕਿਸਮ','mr-IN':'मातीचा प्रकार','bn-IN':'মাটির ধরন','gu-IN':'માટીનો પ્રકાર','ta-IN':'மண் வகை','te-IN':'నేల రకం','kn-IN':'ಮಣ್ಣಿನ ವಿಧ','ml-IN':'മണ്ണിന്റെ തരം','or-IN':'ମାଟିର ପ୍ରକାର','as-IN':'মাটিৰ প্ৰকাৰ'},
  season:{'en-IN':'Season','hi-IN':'मौसम','pa-IN':'ਮੌਸਮ','mr-IN':'हंगाम','bn-IN':'মৌসুম','gu-IN':'ઋતુ','ta-IN':'பருவம்','te-IN':'సీజన్','kn-IN':'ಋತು','ml-IN':'കാലം','or-IN':'ଋତୁ','as-IN':'ঋতু'},
  landSize:{'en-IN':'Land size (acres)','hi-IN':'भूमि का आकार (एकड़)','pa-IN':'ਜ਼ਮੀਨ ਦਾ ਆਕਾਰ (ਏਕੜ)','mr-IN':'जमिनीचे क्षेत्र (एकर)','bn-IN':'জমির আকার (একর)','gu-IN':'જમીનનું કદ (એકર)','ta-IN':'நில அளவு (ஏக்கர்)','te-IN':'భూమి విస్తీర్ణం (ఎకరాలు)','kn-IN':'ಭೂಮಿ ಗಾತ್ರ (ಎಕರೆ)','ml-IN':'ഭൂമിയുടെ വലുപ്പം (ഏക്കർ)','or-IN':'ଜମିର ଆକାର (ଏକର)','as-IN':'মাটিৰ আকাৰ (একৰ)'},
  irrigation:{'en-IN':'Irrigation available','hi-IN':'सिंचाई उपलब्ध','pa-IN':'ਸਿੰਚਾਈ ਉਪਲਬਧ','mr-IN':'सिंचन उपलब्ध','bn-IN':'সেচ উপলব্ধ','gu-IN':'સિંચાઈ ઉપલબ્ધ','ta-IN':'பாசன வசதி உள்ளது','te-IN':'నీటిపారుదల అందుబాటులో ఉంది','kn-IN':'ನೀರಾವರಿ ಲಭ್ಯವಿದೆ','ml-IN':'ജലസേചനം ലഭ്യമാണ്','or-IN':'ଜଳସେଚନ ଉପଲବ୍ଧ','as-IN':'জলসিঞ্চন উপলব্ধ'},
  saveRefresh:{'en-IN':'Save & refresh','hi-IN':'सहेजें और अपडेट करें','pa-IN':'ਸੇਵ ਅਤੇ ਅੱਪਡੇਟ','mr-IN':'जतन करा व अपडेट करा','bn-IN':'সংরক্ষণ ও আপডেট','gu-IN':'સાચવો અને અપડેટ કરો','ta-IN':'சேமித்து புதுப்பிக்கவும்','te-IN':'సేవ్ చేసి నవీకరించండి','kn-IN':'ಉಳಿಸಿ ಮತ್ತು ನವೀಕರಿಸಿ','ml-IN':'സേവ് ചെയ്ത് പുതുക്കുക','or-IN':'ସେଭ୍ ଏବଂ ଅପଡେଟ୍','as-IN':'সংৰক্ষণ আৰু আপডেট'},
  diagnostics:{'en-IN':'FIELD DIAGNOSTICS','hi-IN':'खेत की जाँच','pa-IN':'ਖੇਤ ਜਾਂਚ','mr-IN':'शेत तपासणी','bn-IN':'ক্ষেত পরীক্ষা','gu-IN':'ખેતર તપાસ','ta-IN':'வயல் பரிசோதனை','te-IN':'పొలం నిర్ధారణ','kn-IN':'ಹೊಲ ಪರೀಕ್ಷೆ','ml-IN':'കൃഷിയിട പരിശോധന','or-IN':'ଖେତ ପରୀକ୍ଷା','as-IN':'খেতি পৰীক্ষা'},
  uploadLeaf:{'en-IN':'Upload a leaf photo','hi-IN':'पत्ते की फोटो अपलोड करें','pa-IN':'ਪੱਤੇ ਦੀ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ','mr-IN':'पानाचा फोटो अपलोड करा','bn-IN':'পাতার ছবি আপলোড করুন','gu-IN':'પાનનો ફોટો અપલોડ કરો','ta-IN':'இலைப் படத்தை பதிவேற்றவும்','te-IN':'ఆకు ఫోటోను అప్‌లోడ్ చేయండి','kn-IN':'ಎಲೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ','ml-IN':'ഇലയുടെ ചിത്രം അപ്‌ലോഡ് ചെയ്യുക','or-IN':'ପତ୍ରର ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ','as-IN':'পাতৰ ফটো আপলোড কৰক'},
  analysis:{'en-IN':'ANALYSIS','hi-IN':'विश्लेषण','pa-IN':'ਵਿਸ਼ਲੇਸ਼ਣ','mr-IN':'विश्लेषण','bn-IN':'বিশ্লেষণ','gu-IN':'વિશ્લેષણ','ta-IN':'பகுப்பாய்வு','te-IN':'విశ్లేషణ','kn-IN':'ವಿಶ್ಲೇಷಣೆ','ml-IN':'വിശകലനം','or-IN':'ବିଶ୍ଳେଷଣ','as-IN':'বিশ্লেষণ'},
  analyzing:{'en-IN':'Analyzing image…','hi-IN':'चित्र का विश्लेषण हो रहा है…','pa-IN':'ਤਸਵੀਰ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ…','mr-IN':'प्रतिमेचे विश्लेषण सुरू आहे…','bn-IN':'ছবি বিশ্লেষণ করা হচ্ছে…','gu-IN':'છબીનું વિશ્લેષણ થઈ રહ્યું છે…','ta-IN':'படம் பகுப்பாய்வு செய்யப்படுகிறது…','te-IN':'చిత్రాన్ని విశ్లేషిస్తోంది…','kn-IN':'ಚಿತ್ರವನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ…','ml-IN':'ചിത്രം വിശകലനം ചെയ്യുന്നു…','or-IN':'ଛବି ବିଶ୍ଳେଷଣ ହେଉଛି…','as-IN':'ছবি বিশ্লেষণ কৰা হৈছে…'},
  askCompanion:{'en-IN':'Ask your farm companion','hi-IN':'अपने कृषि साथी से पूछें','pa-IN':'ਆਪਣੇ ਖੇਤੀ ਸਾਥੀ ਨੂੰ ਪੁੱਛੋ','mr-IN':'तुमच्या कृषी साथीला विचारा','bn-IN':'আপনার কৃষি সাথীকে জিজ্ঞাসা করুন','gu-IN':'તમારા કૃષિ સાથીને પૂછો','ta-IN':'உங்கள் விவசாய துணையிடம் கேளுங்கள்','te-IN':'మీ వ్యవసాయ సహచరుడిని అడగండి','kn-IN':'ನಿಮ್ಮ ಕೃಷಿ ಸಂಗಾತಿಯನ್ನು ಕೇಳಿ','ml-IN':'നിങ്ങളുടെ കൃഷി കൂട്ടുകാരനോട് ചോദിക്കുക','or-IN':'ଆପଣଙ୍କ କୃଷି ସାଥୀଙ୍କୁ ପଚାରନ୍ତୁ','as-IN':'আপোনাৰ কৃষি সাথীক সোধক'},
  ask:{'en-IN':'Ask →','hi-IN':'पूछें →','pa-IN':'ਪੁੱਛੋ →','mr-IN':'विचारा →','bn-IN':'জিজ্ঞাসা করুন →','gu-IN':'પૂછો →','ta-IN':'கேளுங்கள் →','te-IN':'అడగండి →','kn-IN':'ಕೇಳಿ →','ml-IN':'ചോദിക്കുക →','or-IN':'ପଚାରନ୍ତୁ →','as-IN':'সোধক →'},
  thinking:{'en-IN':'Thinking…','hi-IN':'सोच रहा है…','pa-IN':'ਸੋਚ ਰਿਹਾ ਹੈ…','mr-IN':'विचार करत आहे…','bn-IN':'ভাবছে…','gu-IN':'વિચારી રહ્યું છે…','ta-IN':'யோசிக்கிறது…','te-IN':'ఆలోచిస్తోంది…','kn-IN':'ಯೋಚಿಸುತ್ತಿದೆ…','ml-IN':'ചിന്തിക്കുന്നു…','or-IN':'ଚିନ୍ତା କରୁଛି…','as-IN':'ভাবি আছে…'}
}

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
  const lang = (languages.some(l => l.code === profile.language) ? profile.language : 'en-IN') as LangCode
  const t = (key: string) => ui[key]?.[lang] || ui[key]?.['en-IN'] || key

  useEffect(() => { localStorage.setItem('krishi-profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { loadHome() }, [])
  const loadHome = async () => {
    let failed = false

    const run = async <T,>(request: Promise<T>, onSuccess: (value: T) => void) => {
      try {
        const value = await Promise.race([
          request,
          new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('Request timed out')), 7000))
        ])
        onSuccess(value)
      } catch {
        failed = true
      }
    }

    await Promise.all([
      run(api<any>('/api/farm-brief', { method:'POST', body:JSON.stringify({ profile }) }), setBrief),
      run(api<any>('/api/recommendations', { method:'POST', body:JSON.stringify({ profile }) }), setRecs),
      run(api<any>('/api/weather', { method:'POST', body:JSON.stringify({ city:profile.district, country:'IN' }) }), setWeather),
      run(api<any>('/api/market', { method:'POST', body:JSON.stringify({ commodity:profile.current_crop, state:profile.state, district:profile.district }) }), setMarket)
    ])

    if (failed) setToast('Some farm services are temporarily unavailable. The dashboard is still usable.')
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
    const fd = new FormData(); fd.append('file', file); fd.append('language', profile.language); fd.append('crop', profile.current_crop)
    try { const r = await fetch(`${API}/api/crop-health?language=${encodeURIComponent(profile.language)}&crop=${encodeURIComponent(profile.current_crop || '')}`, {method:'POST',body:fd}); if(!r.ok) throw new Error(); setHealth(await r.json()) }
    catch { setHealth({analysis:'Could not reach the crop-health service.',disclaimer:'Start the Python backend and try again.'}) }
  }
  const setField = (k:keyof Profile, v:any) => setProfile(p => ({...p,[k]:v}))
  const marketPrice = market?.modal_price ?? market?.records?.[0]?.price ?? '—'
  const marketTrend = market?.trend ?? (market?.records?.length ? 'Market record available from the configured Python adapter.' : 'Market trend from the Python data adapter.')
  const weatherTemp = weather?.temperature_c ?? weather?.temperature ?? '—'
  const briefText = brief?.summary ?? brief?.brief ?? 'Loading your farm context…'

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="logo">कृ</div><div><strong>Krishi Saathi</strong><span>{t('tagline')}</span></div></div><div className="top-actions"><span className="testnet-pill">● TESTNET</span><select className="lang" value={lang} onChange={e=>setField('language',e.target.value)} aria-label="Language">{languages.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select></div></header>

    <main>
      {tab==='home' && <section className="hero-grid">
        <div className="hero-copy"><div className="eyebrow orange">ONE INTELLIGENT ASSISTANT FOR EVERY FARMER</div><h1>From <em>Soil</em> to <em>Sale.</em><br/>One farm. One companion.</h1><p>AI guidance, farm context, crop health, weather, market intelligence and paid expert-grade reports — connected in one simple workflow.</p><div className="hero-buttons"><button className="primary" onClick={()=>setTab('farm')}>Open My Farm →</button><button className="secondary" onClick={()=>setTab('premium')}>Explore x402 Services</button></div><div className="mini-stats"><span><b>01</b> Profile</span><span><b>02</b> Crop</span><span><b>03</b> Health</span><span><b>04</b> Market</span></div></div>
        <div className="hero-photo"><img src="/assets/farmer.jpg"/><div className="photo-tag">Your farm companion<br/><b>Practical. Local. Explainable.</b></div></div>
      </section>}

      {tab==='home' && <section className="brief-grid">
        <div className="section-heading"><div><div className="eyebrow green">LIVE FROM PYTHON BACKEND</div><h2>Today’s Farm Brief</h2></div><button className="icon-btn" onClick={loadHome}>↻ Refresh</button></div>
        <div className="cards three"><article className="card photo-card"><img src="/assets/field.jpg"/><div><span className="card-label">FIELD</span><h3>{profile.current_crop} · {profile.land_size_acres} acres</h3><p>{briefText}</p></div></article><article className="card"><span className="card-label">WEATHER</span><div className="big-number">{weatherTemp}°</div><h3>{weather?.condition || 'Current conditions'}</h3><p>{weather?.advice || `${weather?.humidity ?? '—'}% humidity · ${weather?.wind_mps ?? '—'} m/s wind`}</p></article><article className="card"><span className="card-label">MARKET</span><div className="big-number">₹{marketPrice}</div><h3>{profile.current_crop} · mandi</h3><p>{marketTrend}</p></article></div>
      </section>}

      {tab==='farm' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow green">{t('farmContext')}</div><h2>{t('myFarm')}</h2></div><button className="primary small" onClick={loadHome}>{t('saveRefresh')}</button></div><div className="farm-layout"><div className="farm-photo"><img src="/assets/field.jpg"/><div className="farm-photo-overlay"><b>{profile.district}, {profile.state}</b><span>{profile.soil_type} soil · {profile.land_size_acres} acres</span></div></div><div className="form-card">{[['name',t('farmerName')],['state',t('state')],['district',t('district')],['soil_type',t('soilType')],['season',t('season')]].map(([k,l])=><label key={k}>{l}<input value={String(profile[k as keyof Profile])} onChange={e=>setField(k as keyof Profile,e.target.value)}/></label>)}<label>{t('landSize')}<input type="number" value={profile.land_size_acres} onChange={e=>setField('land_size_acres',Number(e.target.value))}/></label><label className="check"><input type="checkbox" checked={profile.irrigation} onChange={e=>setField('irrigation',e.target.checked)}/> {t('irrigation')}</label></div></div><div className="recommend-row"><div><div className="eyebrow orange">EXPLAINABLE RECOMMENDATION</div><h2>What should I grow?</h2></div><div className="rec-cards">{recs?.recommendations?.length ? recs.recommendations.map((r:any)=><div className="rec-card" key={r.crop}><b>{r.crop}</b><strong>{r.score}%</strong><p>{r.reason || (r.reasons || []).join(' · ')}</p></div>) : <div className="rec-card"><b>Recommendations unavailable</b><p>Could not load personalized crop recommendations. Tap “Save & refresh” to try again.</p></div>}</div></div></section>}

      {tab==='health' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow green">{t('diagnostics')}</div><h2>{t('cropHealth')}</h2></div></div><div className="health-layout"><div className="upload-card" onClick={()=>fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&analyze(e.target.files[0])}/>{healthImage ? <img src={healthImage}/> : <div className="upload-placeholder">📷<b>{t('uploadLeaf')}</b><span>AI-assisted symptom review</span></div>}</div><div className="card health-result"><span className="card-label">{t('analysis')}</span>{health?.loading ? <p>{t('analyzing')}</p> : health ? <><h3>{health.analysis}</h3></> : <p>Upload a clear crop photo to begin.</p>}</div></div></section>}

      {tab==='market' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow orange">DATA-BASED MARKET INTELLIGENCE</div><h2>{t('market')} · {profile.current_crop}</h2></div><button className="icon-btn" onClick={loadHome}>↻ Refresh</button></div><div className="market-hero"><img src="/assets/mandi.jpg"/><div className="market-overlay"><span>CURRENT MANDI PRICE</span><strong>₹{marketPrice}</strong><p>{profile.district}, {profile.state} · ₹/quintal</p></div></div><div className="market-grid"><div className="card"><span className="card-label">TODAY'S RANGE</span><h3>{market?.min_price != null && market?.max_price != null ? `₹${market.min_price} – ₹${market.max_price}` : 'Not available'}</h3><p>Minimum and maximum reported mandi prices.</p></div><div className="card"><span className="card-label">7-DAY FORECAST</span><h3>{market?.forecast?.available ? `₹${market.forecast.range_low} – ₹${market.forecast.range_high}` : 'Needs historical data'}</h3><p>{market?.forecast?.available ? `${market.forecast.trend} · ${market.forecast.change_pct > 0 ? '+' : ''}${market.forecast.change_pct}% estimated change` : market?.forecast?.reason}</p></div><div className="card"><span className="card-label">CONFIDENCE</span><h3>{market?.forecast?.available ? market.forecast.confidence : '—'}</h3><p>{market?.forecast?.disclaimer || 'Forecast appears only when enough recent price records are available.'}</p></div></div>{market?.records?.length > 0 && <div className="market-history card"><div className="section-heading"><div><span className="card-label">RECENT PRICE HISTORY</span><h3>Reported mandi prices</h3></div></div><div className="price-bars">{[...market.records].slice(0,14).reverse().map((r:any,i:number)=>{const vals=market.records.map((x:any)=>Number(x.modal_price ?? x.price)).filter((x:number)=>Number.isFinite(x)); const lo=Math.min(...vals), hi=Math.max(...vals); const pct=hi===lo?55:20+((Number(r.modal_price ?? r.price)-lo)/(hi-lo))*80; return <div className="price-bar" key={i} title={`${r.date || ''}: ₹${r.modal_price ?? r.price}`}><span style={{height:`${pct}%`}}></span><small>{i%3===0?(r.date||'').slice(0,5):''}</small></div>})}</div></div>}<p className="market-note">Forecast uses recent price trend and volatility only. It is not an LLM prediction and should not be treated as a guaranteed selling price.</p></section>}

      {tab==='premium' && <section className="page-section"><div className="section-heading"><div><div className="eyebrow green">PAY PER REPORT · x402</div><h2>Premium Intelligence</h2></div></div><div className="service-grid">{services.map(s=><article className="service-card" key={s.key}><div className="service-icon">{s.icon}</div><h3>{s.title}</h3><p>{s.desc}</p><div className="service-bottom"><b>${s.price.toFixed(2)} USDC</b><button className="primary small" onClick={()=>setSelectedService(s)}>Unlock report</button></div></article>)}</div></section>}

      <section className="chat-section"><div className="section-heading"><div><div className="eyebrow green">KRISHI AI</div><h2>{t('askCompanion')}</h2></div></div><div className="chat-box"><div className="messages">{messages.length===0 && <div className="assistant-msg">Tell me what is happening on your farm. I’ll use your saved profile as context.</div>}{messages.map((m,i)=><div key={i} className={m.role==='user'?'user-msg':'assistant-msg'}>{m.text}</div>)}{chatBusy && <div className="assistant-msg">Krishi AI is thinking…</div>}</div><div className="chat-input"><input disabled={chatBusy} value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="e.g. What should I do if my leaves are yellow?"/><button className="primary" disabled={chatBusy || !chat.trim()} onClick={ask}>{chatBusy ? t('thinking') : t('ask')}</button></div></div></section>
    </main>

    <nav className="bottom-nav">{[['home','⌂',t('home')],['farm','◫',t('myFarm')],['health','⌁',t('cropHealth')],['market','₹',t('market')],['premium','✦',t('premium')]].map(([k,i,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}><span>{i}</span>{l}</button>)}</nav>
    {selectedService && <PremiumPayment service={selectedService} profile={profile} onClose={()=>setSelectedService(null)}/>} {toast && <div className="toast" onClick={()=>setToast('')}>{toast}</div>}
  </div>
}

createRoot(document.getElementById('root')!).render(<WalletProvider manager={walletManager}><App/></WalletProvider>)