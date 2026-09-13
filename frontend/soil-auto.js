(() => {
  const STATE_SOIL = {
    'andhra pradesh':'Red Loamy','arunachal pradesh':'Alluvial','assam':'Alluvial','bihar':'Alluvial','chhattisgarh':'Red & Yellow','goa':'Laterite','gujarat':'Black','haryana':'Alluvial','himachal pradesh':'Mountain Forest','jharkhand':'Red & Yellow','karnataka':'Red Loamy','kerala':'Laterite','madhya pradesh':'Black','maharashtra':'Black','manipur':'Red Loamy','meghalaya':'Red Loamy','mizoram':'Red Loamy','nagaland':'Red Loamy','odisha':'Red & Yellow','punjab':'Alluvial','rajasthan':'Sandy','sikkim':'Mountain Forest','tamil nadu':'Red Loamy','telangana':'Red Loamy','tripura':'Red Loamy','uttar pradesh':'Alluvial','uttarakhand':'Alluvial','west bengal':'Alluvial'
  }

  const CITY_SOIL = {
    'kanpur':'Alluvial','lucknow':'Alluvial','agra':'Alluvial','varanasi':'Alluvial','prayagraj':'Alluvial','meerut':'Alluvial','bareilly':'Alluvial','gorakhpur':'Alluvial','jaipur':'Sandy','jodhpur':'Sandy','bikaner':'Sandy','kota':'Black','bhopal':'Black','indore':'Black','nagpur':'Black','nashik':'Black','aurangabad':'Black','pune':'Black','ahmedabad':'Black','rajkot':'Black','surat':'Alluvial','ludhiana':'Alluvial','amritsar':'Alluvial','patiala':'Alluvial','chandigarh':'Alluvial','hyderabad':'Red Loamy','bengaluru':'Red Loamy','mysuru':'Red Loamy','chennai':'Red Loamy','coimbatore':'Red Loamy','bhubaneswar':'Red & Yellow','ranchi':'Red & Yellow','kolkata':'Alluvial','patna':'Alluvial','guwahati':'Alluvial','dehradun':'Alluvial'
  }

  const normalize = value => String(value || '').trim().toLowerCase().replace(/\\s+/g, ' ')

  function findInput(labelText) {
    return [...document.querySelectorAll('label')].find(label => normalize(label.firstChild?.textContent) === normalize(labelText))?.querySelector('input') || null
  }

  function setReactInput(input, value) {
    if (!input || input.value === value) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function updateSoil() {
    const stateInput = findInput('State')
    const districtInput = findInput('District')
    const soilInput = findInput('Soil type')
    if (!stateInput || !districtInput || !soilInput) return

    const state = normalize(stateInput.value)
    const district = normalize(districtInput.value)
    const soil = CITY_SOIL[district] || STATE_SOIL[state] || ''

    soilInput.readOnly = true
    soilInput.setAttribute('aria-readonly', 'true')
    soilInput.title = soil ? 'Automatically determined from state and city' : 'Enter a valid state and city to determine soil type'
    if (soil) setReactInput(soilInput, soil)
  }

  const observer = new MutationObserver(updateSoil)
  observer.observe(document.body, { childList: true, subtree: true })
  document.addEventListener('input', event => {
    if (event.target?.tagName === 'INPUT') setTimeout(updateSoil, 0)
  }, true)
  setInterval(updateSoil, 500)
  updateSoil()
})()
