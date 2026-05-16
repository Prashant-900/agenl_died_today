import { useState, useEffect } from 'react'
import './AboutMeOverlay.css'

export default function AboutMeOverlay({ visible }) {
  const [displayedText, setDisplayedText] = useState('')
  const fullText = `Prashant Suthar

📍 Himachal Pradesh, India
🎓 IIT Mandi — 3rd Year
📊 Data Science Major
💻 Core Member, Coding Club

I like to draw, create,
and have fun :)`

  useEffect(() => {
    if (!visible) {
      setDisplayedText('')
      return
    }
    let index = 0
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 45)
    return () => clearInterval(interval)
  }, [visible, fullText])

  if (!visible) return null
  return (
    <div className="aboutme-overlay">
      <div className="aboutme-card">
        <span className="aboutme-label">ABOUT ME</span>
        <pre className="aboutme-text">{displayedText}<span className="aboutme-cursor">|</span></pre>
      </div>
    </div>
  )
}
