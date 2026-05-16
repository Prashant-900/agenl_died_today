import { useState, useEffect } from 'react'
import './AboutMeOverlay.css'

const NAME = 'Prashant Suthar'

const ROWS = [
  { label: 'Location', value: 'Himachal Pradesh, India' },
  { label: 'Education', value: 'IIT Mandi — 3rd Year'   },
  { label: 'Major',    value: 'Data Science'            },
  { label: 'Activity', value: 'Core Member, Coding Club'},
]

const BIO = `I like to draw, create,\nand have fun :)`

// Flat string for timing — sections separated by \n
const SECTIONS = [NAME, ...ROWS.map(r => r.value), BIO]
const FULL = SECTIONS.join('\n')

export default function AboutMeOverlay({ visible }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!visible) { setCount(0); return }
    let i = 0
    const iv = setInterval(() => {
      i++
      setCount(i)
      if (i >= FULL.length) clearInterval(iv)
    }, 42)
    return () => clearInterval(iv)
  }, [visible])

  if (!visible) return null

  // Walk char budget through each section in order
  let budget = count

  const slice = (str) => {
    const out = str.slice(0, budget)
    budget = Math.max(0, budget - str.length - 1) // -1 for the \n separator
    return out
  }

  const visName = slice(NAME)
  const visRows = ROWS.map(r => slice(r.value))
  const visBio  = slice(BIO)

  const done = count >= FULL.length

  // Cursor sits after whichever section is currently typing
  const cursorAfter = (() => {
    if (visName.length < NAME.length) return 'name'
    for (let i = 0; i < ROWS.length; i++) {
      if (visRows[i].length < ROWS[i].value.length) return `row-${i}`
    }
    if (visBio.length < BIO.length) return 'bio'
    return 'bio' // stays at end
  })()

  return (
    <div className="aboutme-overlay">
      <div className="aboutme-card">

        {/* NAME */}
        <h1 className="aboutme-name">
          {visName}
          {cursorAfter === 'name' && <span className="aboutme-cursor">|</span>}
        </h1>

        {/* INFO ROWS */}
        <div className="aboutme-rows">
          {ROWS.map((row, i) => (
            visRows[i].length > 0 && (
              <div className="aboutme-row" key={i}>
                <span className="aboutme-row-label">{row.label}</span>
                <span className="aboutme-row-value">
                  {visRows[i]}
                  {cursorAfter === `row-${i}` && <span className="aboutme-cursor">|</span>}
                </span>
              </div>
            )
          ))}
        </div>

        {/* DIVIDER — appears once all rows are typed */}
        {visRows[ROWS.length - 1]?.length === ROWS[ROWS.length - 1].value.length && (
          <div className="aboutme-divider" />
        )}

        {/* BIO */}
        {visBio.length > 0 && (
          <pre className="aboutme-bio">
            {visBio}<span className="aboutme-cursor">|</span>
          </pre>
        )}

      </div>
    </div>
  )
}