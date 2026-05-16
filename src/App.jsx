import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import WorldScene from './components/WorldScene'
import ArtOverlay from './components/ArtOverlay'
import ProjectsOverlay from './components/ProjectsOverlay'
import AboutMeOverlay from './components/AboutMeOverlay'
import './index.css'

/* ── Object name → friendly display name mapping (dots stripped for matching) ── */
const OBJECT_LABELS = {
  'stool': 'Stool',
  '_0_0': '_0_0',
  '_0_0001': '_0_0.001',
  '1_0': '1_0',
  '1_0001': '1_0.001',
  '3_0': '3_0',
  'armature': 'Canvas',
  'armature001': 'Character',
  'board_panel001': 'Board',
  'camera': 'Camera',
  'ceilingfan01a': 'Fan',
  'ceilingfan01a001': 'Bulb',
  'mesh0': 'Chair',
  'mesh_0032': 'Mesh_0.032',
  'mesh_0027_mesh_0027001': 'Mesh_0027_Mesh_0027.001',
  'mesh_0028_mesh_0028001': 'Mesh_0028_Mesh_0028.001',
  'object0': 'Object0',
  'object0001': 'Object0001',
  'old football': 'Old Football',
  'old teddy bear': 'Old Teddy Bear',
  'plane': 'Plane',
  'plane001': 'Plane.001',
  'plane002': 'Plane.002',
  'point': 'Point',
  'point001': 'Point.001',
  'point002': 'Point.002',
  'polysurface67': 'polySurface67',
}

/* ── Cursor labels for interactive objects ── */
const CURSOR_LABELS = {
  'Board': 'PROJECTS',
  'Canvas': 'ART',
  'Chair': 'ABOUT ME',
}



/* ── Loading Screen: TV static noise strip on black ── */
function LoadingScreen({ visible }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = 400, h = 60
    canvas.width = w
    canvas.height = h

    let rafId
    const draw = () => {
      const imageData = ctx.createImageData(w, h)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [visible])

  return (
    <div className={`loading-screen ${!visible ? 'fade-out' : ''}`}>
      <canvas ref={canvasRef} className="loading-noise-strip" />
    </div>
  )
}

/* ── Full-screen glitch transition (plays for duration of transition.mp3) ── */
function GlitchTransition({ active, onComplete }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let dead = false

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const audio = new Audio('/transition.mp3')
    audio.play().catch(() => {})

    let rafId
    const draw = () => {
      if (dead) return
      const w = canvas.width, h = canvas.height

      // Black base
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      // Frame-tear noise strips
      const numStrips = (5 + Math.random() * 15) | 0
      for (let i = 0; i < numStrips; i++) {
        const y = (Math.random() * h) | 0
        const sh = (2 + Math.random() * 40) | 0
        const offset = ((Math.random() - 0.5) * 80) | 0
        const sw = w
        const imageData = ctx.createImageData(sw, sh)
        const d = imageData.data
        for (let j = 0; j < d.length; j += 4) {
          const v = (Math.random() * 255) | 0
          d[j] = v; d[j + 1] = v; d[j + 2] = v
          d[j + 3] = Math.random() > 0.25 ? 255 : 0
        }
        ctx.putImageData(imageData, offset, y)
      }

      // Occasional white flash
      if (Math.random() > 0.82) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.35})`
        ctx.fillRect(0, 0, w, h)
      }

      // Occasional inverted block
      if (Math.random() > 0.9) {
        const bx = (Math.random() * w) | 0
        const by = (Math.random() * h) | 0
        const bw = (50 + Math.random() * 200) | 0
        const bh = (20 + Math.random() * 100) | 0
        ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.2})`
        ctx.fillRect(bx, by, bw, bh)
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let y = 0; y < h; y += 2) {
        ctx.fillRect(0, y, w, 1)
      }

      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    const finish = () => {
      if (dead) return
      dead = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      onComplete()
    }

    audio.addEventListener('ended', finish)
    const fallback = setTimeout(finish, 5000)

    return () => {
      dead = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      clearTimeout(fallback)
      audio.pause()
      audio.src = ''
    }
  }, [active, onComplete])

  if (!active) return null
  return <canvas ref={canvasRef} className="glitch-transition" />
}

/* ── Spiky cursor-following label ── */
function CursorLabel({ label, x, y }) {
  if (!label) return null
  return (
    <div className="cursor-label" style={{ left: x + 16, top: y - 40 }}>
      <span className="cursor-label-spike left" />
      <span className="cursor-label-text">{label}</span>
      <span className="cursor-label-spike right" />
    </div>
  )
}

/* ── Sound Toggle (top right) ── */
function SoundToggle({ playing, onToggle }) {
  return (
    <button
      className={`sound-toggle ${playing ? 'on' : 'off'}`}
      onClick={onToggle}
      title={playing ? 'Mute Music' : 'Play Music'}
    >
      <svg className="sound-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {playing ? (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        )}
      </svg>
    </button>
  )
}



export default function App() {
  const [loading, setLoading] = useState(true)
  const [fanSpeed, setFanSpeed] = useState(3)
  const [fanOverloaded, setFanOverloaded] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [lightsOff, setLightsOff] = useState(0)
  const [hoveredObject, setHoveredObject] = useState(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const [actionComplete, setActionComplete] = useState(null)
  const canvasContainerRef = useRef(null)
  const worldRef = useRef(null)
  const bgAudioRef = useRef(null)

  const handleGlitchComplete = useCallback(() => {
    setGlitchActive(false)
  }, [])

  const handleActionComplete = useCallback((name) => {
    setActionComplete(name)
  }, [])

  // ── Background music (default OFF) ──
  useEffect(() => {
    const audio = new Audio('/bg.mp3')
    audio.loop = true
    audio.volume = 0.35
    bgAudioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  useEffect(() => {
    const audio = bgAudioRef.current
    if (!audio) return
    if (bgMusicPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [bgMusicPlaying])

  const handleToggleBgMusic = useCallback(() => {
    setBgMusicPlaying(prev => !prev)
  }, [])

  // ── Track cursor position ──
  useEffect(() => {
    const onMove = (e) => setCursorPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Fan overload ──
  const OVERLOAD_THRESHOLD = 15
  const OVERLOAD_DURATION = 3000
  const topSpeedTimerRef = useRef(null)

  const handleSetFanSpeed = useCallback((valOrFn) => {
    setFanSpeed((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn
      return next
    })
  }, [])

  useEffect(() => {
    if (fanOverloaded) return

    if (fanSpeed >= OVERLOAD_THRESHOLD) {
      if (!topSpeedTimerRef.current) {
        topSpeedTimerRef.current = setTimeout(() => {
          setFanOverloaded(true)
          topSpeedTimerRef.current = null
          // Play fan overload sound
          const fanAudio = new Audio('/fan.mp3')
          fanAudio.play().catch(() => {})
          let current = fanSpeed
          const decayInterval = setInterval(() => {
            current = current * 0.90
            if (current < 0.3) {
              current = 0.3
              clearInterval(decayInterval)
              // Fan stays permanently overloaded — no reset
            }
            setFanSpeed(current)
          }, 120)
        }, OVERLOAD_DURATION)
      }
    } else {
      if (topSpeedTimerRef.current) {
        clearTimeout(topSpeedTimerRef.current)
        topSpeedTimerRef.current = null
      }
    }
  }, [fanSpeed, fanOverloaded])

  useEffect(() => {
    return () => {
      if (topSpeedTimerRef.current) clearTimeout(topSpeedTimerRef.current)
    }
  }, [])

  // ── Frame-based fan speed increase on hover ──
  useEffect(() => {
    if (hoveredObject !== 'Fan' || fanOverloaded) return
    let rafId
    let lastTime = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now
      handleSetFanSpeed((prev) => Math.min(prev + dt * 3, 18))
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [hoveredObject, fanOverloaded, handleSetFanSpeed])

  const handleLoaded = useCallback(() => {
    setTimeout(() => setLoading(false), 600)
  }, [])

  const handleFanHover = useCallback(() => {}, [])

  // ── Hover detection ──
  const handleObjectHover = useCallback((objectName) => {
    if (!objectName) {
      setHoveredObject(null)
      return
    }
    const normalized = objectName.toLowerCase().replace(/\./g, '')
    const label = OBJECT_LABELS[normalized]
    setHoveredObject(label || null)
  }, [])

  // ── Click on 3D objects ──
  const handleObjectClick = useCallback((objectName) => {
    if (!objectName) return
    const normalized = objectName.toLowerCase().replace(/\./g, '')
    const label = OBJECT_LABELS[normalized]
    if (!label) return

    switch (label) {
      case 'Bulb': {
        // Once lights are off, they stay off
        if (lightsOff !== 0) break
        const audio = new Audio('/bulb.mp3')
        audio.play().catch(() => {})
        setLightsOff(1) // start flicker
        let settled = false
        const settle = () => {
          if (settled) return
          settled = true
          setLightsOff(2) // fully off when sound ends
        }
        audio.addEventListener('ended', settle)
        setTimeout(settle, 3000) // fallback
        break
      }
      case 'Character': {
        const state = worldRef.current?.getState()
        if (state === 'camera' || state === 'paint') {
          // Trigger glitch transition + reset
          setGlitchActive(true)
          worldRef.current?.resetAll()
          setActiveAction(null)
          setActionComplete(null)
        } else if (state === 'rest') {
          // Queue wakeup (no override)
          worldRef.current?.queueWakeup()
        }
        // If state === 'wakeup', do nothing (no override)
        break
      }
      case 'Canvas': {
        const result = worldRef.current?.playAction('art')
        if (result !== undefined && result !== null) setActiveAction(result)
        break
      }
      case 'Chair': {
        const result = worldRef.current?.playAction('aboutme')
        if (result !== undefined && result !== null) setActiveAction(result)
        break
      }
      case 'Board': {
        const state = worldRef.current?.getState()
        if (state === 'camera' && activeAction === 'aboutme') {
          const result = worldRef.current?.playAction('aboutme_project')
          if (result !== undefined && result !== null) setActiveAction(result)
        } else {
          const result = worldRef.current?.playAction('projects')
          if (result !== undefined && result !== null) setActiveAction(result)
        }
        break
      }
      case 'Object0':
      case 'Object0001': {
        const deathAudio = new Audio('/death.mp3')
        deathAudio.play().catch(() => {})
        break
      }
    }
  }, [lightsOff, activeAction])

  // Derive cursor label — hide when corresponding action is already active
  const ACTION_FOR_LABEL = { 'Board': 'projects', 'Canvas': 'art', 'Chair': 'aboutme' }
  const cursorLabel = (() => {
    if (!hoveredObject) return null
    const lbl = CURSOR_LABELS[hoveredObject]
    if (!lbl) return null
    // Don't show if that action is already playing
    const mappedAction = ACTION_FOR_LABEL[hoveredObject]
    if (mappedAction && (activeAction === mappedAction || activeAction === 'aboutme_project')) return null
    return lbl
  })()

  return (
    <>
      <LoadingScreen visible={loading} />
      <GlitchTransition active={glitchActive} onComplete={handleGlitchComplete} />
      <SoundToggle playing={bgMusicPlaying} onToggle={handleToggleBgMusic} />
      <CursorLabel label={cursorLabel} x={cursorPos.x} y={cursorPos.y} />
      <ArtOverlay visible={actionComplete === 'art'} />
      <ProjectsOverlay visible={actionComplete === 'projects' || actionComplete === 'aboutme_project'} />
      <AboutMeOverlay visible={actionComplete === 'aboutme' && activeAction !== 'aboutme_project'} />
      <div className="canvas-container" ref={canvasContainerRef}>
        <Canvas
          shadows
          camera={{ position: [0, 2, 5], fov: 50, near: 0.1, far: 1000 }}
          eventSource={canvasContainerRef}
          eventPrefix="offset"
          gl={{
            antialias: true,
            toneMapping: THREE.NoToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
            shadowMapType: THREE.PCFShadowMap,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true
            gl.setClearColor('#0a0a0f')
          }}
        >
          <Suspense fallback={null}>
            <WorldScene
              ref={worldRef}
              onLoaded={handleLoaded}
              onFanHover={handleFanHover}
              onObjectHover={handleObjectHover}
              onObjectClick={handleObjectClick}
              fanSpeed={fanSpeed}
              onFanSpeedChange={handleSetFanSpeed}
              fanOverloaded={fanOverloaded}
              lightsOff={lightsOff}
              onActionComplete={handleActionComplete}
            />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
