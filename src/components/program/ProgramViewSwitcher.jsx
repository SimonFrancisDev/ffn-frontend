import { useEffect, useState } from 'react'
import { Gem, Layers3, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import './ProgramViewSwitcher.css'

const PROGRAM_STORAGE_KEY = 'ffn_active_program'
const DEFAULT_PROGRAM = 'f-freedom'
const PROGRAMS = [
  { value: DEFAULT_PROGRAM, label: 'F-Freedom' },
  { value: 'freedom-plus', label: 'Freedom-Plus' },
]

const normalizeProgram = (value) => (
  value === 'freedom-plus' ? 'freedom-plus' : DEFAULT_PROGRAM
)

const readStoredProgram = () => {
  if (typeof window === 'undefined') return DEFAULT_PROGRAM

  try {
    return normalizeProgram(window.localStorage.getItem(PROGRAM_STORAGE_KEY))
  } catch {
    return DEFAULT_PROGRAM
  }
}

const persistProgram = (program) => {
  try {
    window.localStorage.setItem(PROGRAM_STORAGE_KEY, program)
  } catch {
    // The URL remains authoritative when storage is unavailable.
  }
}

export default function ProgramViewSwitcher({ render }) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const queryProgram = params.get('program')
  const hasExplicitProgram = queryProgram === DEFAULT_PROGRAM || queryProgram === 'freedom-plus'
  const [storedProgram, setStoredProgram] = useState(readStoredProgram)
  const activeProgram = hasExplicitProgram ? queryProgram : storedProgram

  useEffect(() => {
    if (!hasExplicitProgram) return
    const normalized = normalizeProgram(queryProgram)
    persistProgram(normalized)
    setStoredProgram(normalized)
  }, [hasExplicitProgram, queryProgram])

  const selectProgram = (program) => {
    const normalized = normalizeProgram(program)
    const nextParams = new URLSearchParams(location.search)
    nextParams.set('program', normalized)
    persistProgram(normalized)
    setStoredProgram(normalized)
    navigate(`${location.pathname}?${nextParams.toString()}`, {
      replace: true,
      state: location.state,
    })
  }

  return (
    <div className="program-view">
      <section className="program-view__switcher" aria-label="Program view">
        <span className="program-view__label"><Layers3 /> Program view <Sparkles className="program-view__spark" /></span>
        <div className="program-view__options" role="tablist" aria-label="Choose program">
          {PROGRAMS.map((program) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeProgram === program.value}
              className={activeProgram === program.value ? 'active' : ''}
              onClick={() => selectProgram(program.value)}
              key={program.value}
            >
              <span className="program-view__option-mark">{program.value === 'freedom-plus' ? <Gem /> : <Layers3 />}</span>
              <span>{program.label}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="program-view__content" key={activeProgram}>
        {render(activeProgram)}
      </div>
    </div>
  )
}