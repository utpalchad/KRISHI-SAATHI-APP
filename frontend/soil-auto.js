(() => {
  const STATE_SOIL = {
    'andhra pradesh':'Red Loamy','arunachal pradesh':'Alluvial','assam':'Alluvial','bihar':'Alluvial','chhattisgarh':'Red & Yellow','goa':'Laterite','gujarat':'Black','haryana':'Alluvial','himachal pradesh':'Mountain Forest','jharkhand':'Red & Yellow','karnataka':'Red Loamy','kerala':'Laterite','madhya pradesh':'Black','maharashtra':'Black','manipur':'Red Loamy','meghalaya':'Red Loamy','mizoram':'Red Loamy','nagaland':'Red Loamy','odisha':'Red & Yellow','punjab':'Alluvial','rajasthan':'Sandy','sikkim':'Mountain Forest','tamil nadu':'Red Loamy','telangana':'Red Loamy','tripura':'Red Loamy','uttar pradesh':'Alluvial','uttarakhand':'Alluvial','west bengal':'Alluvial'
  }

  const CITY_SOIL = {
    'kanpur':'Alluvial','lucknow':'Alluvial','agra':'Alluvial','varanasi':'Alluvial','prayagraj':'Alluvial','meerut':'Alluvial','bareilly':'Alluvial','gorakhpur':'Alluvial','jaipur':'Sandy','jodhpur':'Sandy','bikaner':'Sandy','kota':'Black','bhopal':'Black','indore':'Black','nagpur':'Black','nashik':'Black','aurangabad':'Black','pune':'Black','ahmedabad':'Black','rajkot':'Black','surat':'Alluvial','ludhiana':'Alluvial','amritsar':'Alluvial','patiala':'Alluvial','chandigarh':'Alluvial','hyderabad':'Red Loamy','bengaluru':'Red Loamy','mysuru':'Red Loamy','chennai':'Red Loamy','coimbatore':'Red Loamy','bhubaneswar':'Red & Yellow','ranchi':'Red & Yellow','kolkata':'Alluvial','patna':'Alluvial','guwahati':'Alluvial','dehradun':'Alluvial'
  }

  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

  function getInputs() {
    const labels = [...document.querySelectorAll('#root label')]
    const get = name => labels.find(label => normalize(label.textContent).startsWith(normalize(name)))?.querySelector('input') || null
    return { state: get('State'), district: get('District'), soil: get('Soil type') }
  }

  function setReactInput(input, value) {
    if (!input || input.value === value) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!setter) return
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function updateSoil() {
    const { state, district, soil } = getInputs()
    if (!state || !district || !soil) return

    const stateName = normalize(state.value)
    const cityName = normalize(district.value)
    const detectedSoil = CITY_SOIL[cityName] || STATE_SOIL[stateName] || ''

    soil.readOnly = true
    soil.disabled = false
    soil.setAttribute('aria-readonly', 'true')
    soil.title = detectedSoil
      ? 'Automatically determined from your state and city/district'
      : 'Enter a valid state and city/district to determine soil type'

    setReactInput(soil, detectedSoil)
  }

  const observer = new MutationObserver(updateSoil)
  observer.observe(document.body, { childList: true, subtree: true })

  document.addEventListener('input', event => {
    if (event.target?.tagName === 'INPUT') setTimeout(updateSoil, 0)
  }, true)

  document.addEventListener('change', event => {
    if (event.target?.tagName === 'INPUT') setTimeout(updateSoil, 0)
  }, true)

  setInterval(updateSoil, 300)
  updateSoil()
})()
