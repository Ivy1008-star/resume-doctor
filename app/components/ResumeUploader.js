'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, X } from 'lucide-react'
import { extractTextFromFile, ACCEPT } from '../lib/extractText'

// Lets users drop/select a PDF, DOCX, image, or text file. Extraction happens
// entirely in the browser; only the resulting text is handed back via onText.
export default function ResumeUploader({ onText, label = 'Upload resume file' }) {
  const inputRef = useRef(null)
  const [state, setState] = useState('idle') // idle | working | done | error
  const [msg, setMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(file) {
    if (!file) return
    if (file.size > 12 * 1024 * 1024) {
      setState('error'); setMsg('File is larger than 12 MB. Please use a smaller file.'); return
    }
    setState('working'); setMsg(''); setProgress(0); setFileName(file.name)
    try {
      const { text, kind } = await extractTextFromFile(file, (p) => setProgress(p))
      if (!text || text.trim().length < 20) {
        setState('error')
        setMsg(kind === 'image'
          ? 'Could not read enough text from that image. Try a clearer screenshot or paste the text.'
          : 'Could not find text in that file. Try another file or paste the text.')
        return
      }
      onText(text)
      setState('done')
      setMsg(`Imported ${text.length.toLocaleString()} characters from ${file.name}`)
    } catch (err) {
      setState('error'); setMsg(err.message || 'Failed to read file.')
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    handleFile(file)
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}${state === 'working' ? ' busy' : ''}`}
        onClick={() => state !== 'working' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {state === 'working' ? (
          <div className="dz-inner">
            <Loader2 size={22} className="spin" />
            <div className="dz-title">Reading {fileName}...</div>
            <div className="dz-sub">{progress ? `Recognizing text ${progress}%` : 'Extracting text in your browser'}</div>
          </div>
        ) : (
          <div className="dz-inner">
            <span className="dz-ic"><Upload size={20} /></span>
            <div className="dz-title">{label} <span className="dz-or">or drag &amp; drop</span></div>
            <div className="dz-sub">PDF, Word (.docx), image (JPG/PNG), or text — read locally, file never leaves your device</div>
          </div>
        )}
      </div>
      {msg ? (
        <div className={`dz-msg ${state}`}>
          {state === 'done' ? <CheckCircle2 size={15} /> : state === 'error' ? <X size={15} /> : <FileText size={15} />}
          <span>{msg}</span>
        </div>
      ) : null}
    </div>
  )
}
