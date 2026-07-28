'use client'

// Client-side file text extraction. Nothing is uploaded: files are read in the
// browser and only the extracted TEXT is sent to the server. Heavy parsers are
// loaded on demand from CDN so they never bloat the initial bundle.

let pdfjsPromise = null
let mammothPromise = null
let tesseractPromise = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => { s.dataset.loaded = '1'; resolve() }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(s)
  })
}

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(() => {
      const pdfjsLib = window.pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      return pdfjsLib
    })
  }
  return pdfjsPromise
}

async function getMammoth() {
  if (!mammothPromise) {
    mammothPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js').then(() => window.mammoth)
  }
  return mammothPromise
}

async function getTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js').then(() => window.Tesseract)
  }
  return tesseractPromise
}

async function extractPdf(file) {
  const pdfjsLib = await getPdfjs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let out = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((it) => it.str)
    out += strings.join(' ') + '\n'
  }
  return out.trim()
}

async function extractDocx(file) {
  const mammoth = await getMammoth()
  const buf = await file.arrayBuffer()
  const res = await mammoth.extractRawText({ arrayBuffer: buf })
  return (res.value || '').trim()
}

async function extractImage(file, onProgress) {
  const Tesseract = await getTesseract()
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100))
    },
  })
  return (data.text || '').trim()
}

async function extractPlain(file) {
  return (await file.text()).trim()
}

// Returns { text, kind }. Throws on unsupported / unreadable files.
export async function extractTextFromFile(file, onProgress) {
  const name = (file.name || '').toLowerCase()
  const type = file.type || ''

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { text: await extractPdf(file), kind: 'pdf' }
  }
  if (name.endsWith('.docx') || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { text: await extractDocx(file), kind: 'docx' }
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/.test(name)) {
    return { text: await extractImage(file, onProgress), kind: 'image' }
  }
  if (type.startsWith('text/') || /\.(txt|md|markdown|rtf)$/.test(name)) {
    return { text: await extractPlain(file), kind: 'text' }
  }
  if (name.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Please save as .docx or PDF, or paste the text.')
  }
  throw new Error('Unsupported file type. Upload a PDF, DOCX, image, or paste the text directly.')
}

export const ACCEPT = '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,image/*'
