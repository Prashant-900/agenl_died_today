import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import {
  EffectComposer,
  ToneMapping,
  Vignette,
  SMAA,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'

/* ── Ceiling Fan rotation with hover-to-speed-up ── */
function CeilingFan({ scene, onHoverChange, fanSpeed, onFanSpeedChange, fanOverloaded, onPointerMove, onPointerOut, onClickScene }) {
  const fanRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    let fanObject = null
    scene.traverse((child) => {
      if (child.name && child.name.toLowerCase() === 'ceilingfan01a') {
        fanObject = child
      }
    })
    if (fanObject) {
      fanRef.current = fanObject
      console.log('✅ Found ceiling fan:', fanObject.name)
    } else {
      console.warn('⚠ ceilingfan01a not found')
    }
  }, [scene])

  useFrame((_, delta) => {
    if (!fanRef.current) return
    const angle = fanSpeed * delta
    fanRef.current.rotateY(angle)
  })


  const isFanChild = useCallback((object) => {
    let obj = object
    while (obj) {
      if (obj === fanRef.current) return true
      obj = obj.parent
    }
    return false
  }, [])

  const handlePointerOver = useCallback((e) => {
    if (isFanChild(e.object)) {
      e.stopPropagation()
      setIsHovered(true)
      onHoverChange(true)
      document.body.style.cursor = 'pointer'
    }
  }, [onHoverChange, isFanChild])

  const handlePointerOut = useCallback((e) => {
    if (isFanChild(e.object)) {
      e.stopPropagation()
      setIsHovered(false)
      onHoverChange(false)
      document.body.style.cursor = 'default'
    }
  }, [onHoverChange, isFanChild])

  return (
    <primitive
      object={scene}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMove={onPointerMove}
      onClick={onClickScene}
    />
  )
}

/* ── Apply Blender camera from gltf.cameras[0], fixed view ── */
function BlenderCamera({ cameras }) {
  const { set, size } = useThree()
  const appliedRef = useRef(false)

  useEffect(() => {
    if (appliedRef.current || !cameras || cameras.length === 0) return

    const cam = cameras[0]
    console.log('📷 Using Blender camera:', cam.name, cam.type)
    console.log('📷 Position:', cam.position.toArray())
    console.log('📷 Rotation:', cam.rotation.toArray())

    cam.aspect = size.width / size.height
    cam.near = 0.001
    cam.far = 1000
    cam.updateProjectionMatrix()
    set({ camera: cam })
    appliedRef.current = true
  }, [cameras, set, size])

  useFrame(() => {
    if (cameras && cameras[0] && cameras[0].isPerspectiveCamera) {
      const cam = cameras[0]
      const aspect = size.width / size.height
      if (Math.abs(cam.aspect - aspect) > 0.01) {
        cam.aspect = aspect
        cam.updateProjectionMatrix()
      }
    }
  })

  return null
}

/* ── Enhance punctual lights from the GLB ── */
/* lightsOff: 0 = on, 1 = flickering (short-circuit), 2 = fully off */
function EnhanceLights({ scene, lightsOff }) {
  const originalIntensitiesRef = useRef(new Map()) // uuid → { intensity, name }
  const initializedRef = useRef(false)
  const flickerRef = useRef(0)

  // Use original light intensities from GLB
  const SHADOW_MAP_SIZE = 1024
  const SHADOW_BIAS = -0.01
  const SHADOW_INTENSITY = 0.45

  // Capture original intensities once
  useEffect(() => {
    if (initializedRef.current) return
    scene.traverse((child) => {
      if (child.isLight) {
        const name = child.name || `light_${child.uuid.slice(0, 6)}`
        originalIntensitiesRef.current.set(child.uuid, { intensity: child.intensity, name })
        console.log('💡 Light:', name, child.type, 'intensity:', child.intensity)
      }
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          if (mat._origEmissiveIntensity === undefined && mat.emissiveIntensity !== undefined) {
            mat._origEmissiveIntensity = mat.emissiveIntensity
          }
          if (mat._origEmissive === undefined && mat.emissive) {
            mat._origEmissive = mat.emissive.clone()
          }
        })
      }
    })
    initializedRef.current = true
  }, [scene])

  // Apply per-light intensity based on lightsOff state (divide by 100)
  useEffect(() => {
    if (lightsOff === 1) return // Flicker handles this state

    scene.traverse((child) => {
      if (child.isLight) {
        const entry = originalIntensitiesRef.current.get(child.uuid)
        if (entry) {
          // Keep bare minimum when off, full dimmed intensity when on
          child.intensity = lightsOff === 2 ? (entry.intensity / 100) * 0.1 : entry.intensity / 100
        }
      }
    })
  }, [scene, lightsOff])

  // Flicker effect per-frame when lightsOff === 1 — all lights AND emissive
  useFrame((_, delta) => {
    if (lightsOff !== 1) {
      flickerRef.current = 0
      return
    }

    flickerRef.current += delta

    // Rapid flicker pattern for ~0.6s
    const t = flickerRef.current
    let flickerMultiplier = 0
    if (t < 0.08) flickerMultiplier = 0.12
    else if (t < 0.12) flickerMultiplier = 0
    else if (t < 0.18) flickerMultiplier = 0.08
    else if (t < 0.22) flickerMultiplier = 0
    else if (t < 0.30) flickerMultiplier = 0.15
    else if (t < 0.34) flickerMultiplier = 0.01
    else if (t < 0.40) flickerMultiplier = 0.10
    else if (t < 0.44) flickerMultiplier = 0
    else if (t < 0.50) flickerMultiplier = 0.06
    else if (t < 0.55) flickerMultiplier = 0
    else if (t < 0.58) flickerMultiplier = 0.03
    else flickerMultiplier = 0

    scene.traverse((child) => {
      // Flicker ALL lights (divide by 100)
      if (child.isLight) {
        const entry = originalIntensitiesRef.current.get(child.uuid)
        if (entry) {
          child.intensity = (entry.intensity / 100) * flickerMultiplier
        }
      }
      // Flicker emissive materials
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          if (mat._origEmissiveIntensity !== undefined) {
            mat.emissiveIntensity = mat._origEmissiveIntensity * flickerMultiplier * 8
          }
          if (mat._origEmissive && mat.emissive) {
            mat.emissive.copy(mat._origEmissive).multiplyScalar(flickerMultiplier > 0 ? 1 : 0)
          }
        })
      }
    })
  })

  // Kill / restore emissive on all materials (non-flicker states)
  useEffect(() => {
    if (lightsOff === 1) return

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          // Always keep emissive at original when lights are off (state 2)
          if (lightsOff === 2) {
            if (mat._origEmissiveIntensity !== undefined) mat.emissiveIntensity = mat._origEmissiveIntensity
            if (mat._origEmissive) mat.emissive.copy(mat._origEmissive)
          } else {
            if (mat._origEmissiveIntensity !== undefined) mat.emissiveIntensity = mat._origEmissiveIntensity
            if (mat._origEmissive) mat.emissive.copy(mat._origEmissive)
          }
        })
      }
    })
  }, [scene, lightsOff])

  // Apply shadow settings — fixed values, softer shadows
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isLight && (child.isPointLight || child.isSpotLight || child.isDirectionalLight)) {
        child.castShadow = true
        if (child.shadow) {
          child.shadow.bias = SHADOW_BIAS
          child.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
          child.shadow.normalBias = 0.02
          if (child.shadow.intensity !== undefined) {
            child.shadow.intensity = SHADOW_INTENSITY
          }
          if (child.shadow.map) {
            child.shadow.map.dispose()
            child.shadow.map = null
          }
        }
      }
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  return null
}

/* ── Post-processing (bloom removed) ── */
function PostEffects() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.6} />
    </EffectComposer>
  )
}

/*
 * ── Animation state machine ──
 *
 *  REST (idle looping) ──wakeup btn──▶ wait for idle loop end ──▶ WAKEUP (once)
 *       ▲                                                            │
 *       └────────────────────────────────────────────────────────────┘
 *
 *  REST ──camera btn──▶ projects / art / aboutme  (once, from rest)
 *                           │
 *                      art finishes ──▶ paint (loop forever)
 *
 *  aboutme ──aboutme_project btn──▶ aboutme_project (once, from aboutme)
 *
 *  ANY state ──reset──▶ REST (idle)
 *
 *  Idle & wakeup are NOT overridable — camera actions only work from rest.
 *  Wakeup only queues during idle.
 */

/* ── Known object names for hover detection (dots stripped) ── */
const KNOWN_OBJECTS = new Set([
  'stool', '_0_0', '_0_0001', '1_0', '1_0001', '3_0',
  'armature', 'armature001', 'board_panel001', 'camera',
  'ceilingfan01a', 'ceilingfan01a001', 'mesh0',
  'mesh_0032', 'mesh_0027_mesh_0027001', 'mesh_0028_mesh_0028001',
  'object0', 'object0001',
  'old football', 'old teddy bear',
  'plane', 'plane001', 'plane002',
  'point', 'point001', 'point002', 'polysurface67',
])

/* Background/surface objects — deprioritized in hover detection */
const BACKGROUND_OBJECTS = new Set([
  'plane', 'plane001', 'plane002',
  'point', 'point001', 'point002',
  'camera',
])

/* Priority objects — Character and Fan always win over overlapping objects */
const PRIORITY_OBJECTS = new Set(['armature001', 'armature', 'ceilingfan01a', 'ceilingfan01a001'])

/** Normalize a name: lowercase + strip dots */
function normalizeName(name) {
  return name.toLowerCase().replace(/\./g, '')
}

function findKnownAncestor(object) {
  let obj = object
  while (obj) {
    if (obj.name && KNOWN_OBJECTS.has(normalizeName(obj.name))) {
      return obj.name
    }
    obj = obj.parent
  }
  return null
}

/**
 * Scan ALL intersections (nearest-to-farthest) and return the best match.
 * 1. Priority objects (Character) always win if found anywhere.
 * 2. Specific objects are preferred over background surfaces.
 */
function findBestHoverName(intersections) {
  let fallback = null
  let specific = null

  for (const hit of intersections) {
    const name = findKnownAncestor(hit.object)
    if (!name) continue
    const normalized = normalizeName(name)

    // Priority objects win immediately
    if (PRIORITY_OBJECTS.has(normalized)) return name

    if (!BACKGROUND_OBJECTS.has(normalized)) {
      if (!specific) specific = name
    } else {
      if (!fallback) fallback = name
    }
  }
  return specific || fallback
}

/* ── Main Scene ── */
const WorldScene = forwardRef(function WorldScene({ onLoaded, onFanHover, onObjectHover, onObjectClick, fanSpeed, onFanSpeedChange, fanOverloaded, lightsOff, onActionComplete }, ref) {
  const gltf = useGLTF('/world.glb')
  const { scene, cameras, animations } = gltf
  const mixerRef = useRef(null)
  const actionsRef = useRef({})
  const activeActionRef = useRef(null)
  const pendingWakeupRef = useRef(false)
  // Track which "state" we are in: 'rest', 'wakeup', 'camera', 'paint'
  const stateRef = useRef('rest')
  const onActionCompleteRef = useRef(onActionComplete)
  useEffect(() => { onActionCompleteRef.current = onActionComplete }, [onActionComplete])
  const { gl } = useThree()

  // Fixed values
  const bgColor = '#0a0a0f'
  const ambientIntensity = 0
  const ambientColor = '#ffffff'
  const envMapIntensity = 0
  const exposure = 0.10

  // Apply environment map intensity to all materials (fixed at 0)
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = false;
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            if (mat.envMapIntensity !== undefined) {
              mat.envMapIntensity = envMapIntensity
            }
          })
        }
      }
    })
  }, [scene])

  // Apply exposure (fixed at 0.10)
  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl])

  // Helper: start idle loop
  const startIdle = useCallback(() => {
    const idle = actionsRef.current['idle']
    if (!idle) return
    idle.reset()
    idle.setLoop(THREE.LoopRepeat, Infinity)
    idle.clampWhenFinished = false
    idle.play()
    activeActionRef.current = idle
    stateRef.current = 'rest'
    console.log('▶ Playing "idle" (looping) — state: rest')
  }, [])

  // Helper: start paint loop
  const startPaint = useCallback(() => {
    const paint = actionsRef.current['paint']
    if (!paint) {
      console.warn('⚠ "paint" action not available, returning to idle')
      startIdle()
      return
    }
    paint.reset()
    paint.setLoop(THREE.LoopRepeat, Infinity)
    paint.clampWhenFinished = false
    paint.play()
    activeActionRef.current = paint
    stateRef.current = 'paint'
    console.log('▶ Playing "paint" (looping) — state: paint')
  }, [startIdle])

  // Set up AnimationMixer and prepare all named actions
  useEffect(() => {
    if (!scene || !animations || animations.length === 0) return

    const mixer = new THREE.AnimationMixer(scene)
    mixerRef.current = mixer
    const actions = {}

    console.log('🎬 Animations found:', animations.map(a => a.name))

    const ACTION_NAMES = ['idle', 'wakeup', 'art', 'paint', 'projects', 'aboutme', 'aboutme_project']
    for (const name of ACTION_NAMES) {
      const clip = animations.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      )
      if (clip) {
        const action = mixer.clipAction(clip)
        action.clampWhenFinished = true
        action.loop = THREE.LoopOnce
        actions[name] = action
        console.log(`✅ "${name}" action ready`)
      } else {
        console.warn(`⚠ No animation clip named "${name}" found`)
      }
    }

    actionsRef.current = actions
    activeActionRef.current = null
    pendingWakeupRef.current = false
    stateRef.current = 'rest'

    // Listen for when any action finishes (LoopOnce completed)
    const onFinished = (e) => {
      const finishedAction = e.action

      // Wakeup finished → go back to idle
      if (finishedAction === actions['wakeup']) {
        console.log('✅ Wakeup finished → resuming idle')
        finishedAction.stop()
        startIdle()
        return
      }

      // Art finished → auto-start paint loop
      if (finishedAction === actions['art']) {
        console.log('✅ Art finished → starting paint loop')
        finishedAction.stop()
        startPaint()
        onActionCompleteRef.current?.('art')
        return
      }

      // Camera actions finish → stay clamped, notify parent
      if (finishedAction === actions['projects']) {
        console.log('✅ Projects animation finished')
        onActionCompleteRef.current?.('projects')
        return
      }
      if (finishedAction === actions['aboutme']) {
        console.log('✅ About me animation finished')
        onActionCompleteRef.current?.('aboutme')
        return
      }
      if (finishedAction === actions['aboutme_project']) {
        console.log('✅ About me project animation finished')
        onActionCompleteRef.current?.('aboutme_project')
        return
      }
    }

    // Loop event: idle loop completed, check if wakeup is pending
    const onLoop = (e) => {
      if (e.action === actions['idle'] && pendingWakeupRef.current) {
        console.log('🔁 Idle loop completed → playing wakeup')
        pendingWakeupRef.current = false
        actions['idle'].stop()
        const wakeup = actions['wakeup']
        if (wakeup) {
          wakeup.reset()
          wakeup.setLoop(THREE.LoopOnce, 1)
          wakeup.clampWhenFinished = true
          wakeup.play()
          activeActionRef.current = wakeup
          stateRef.current = 'wakeup'
          console.log('▶ Playing "wakeup" — state: wakeup')
        }
      }
    }

    mixer.addEventListener('finished', onFinished)
    mixer.addEventListener('loop', onLoop)

    // Auto-start idle
    if (actions['idle']) {
      const idle = actions['idle']
      idle.reset()
      idle.setLoop(THREE.LoopRepeat, Infinity)
      idle.clampWhenFinished = false
      idle.play()
      activeActionRef.current = idle
      stateRef.current = 'rest'
      console.log('▶ Auto-started "idle" (looping)')
    }

    return () => {
      mixer.removeEventListener('finished', onFinished)
      mixer.removeEventListener('loop', onLoop)
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      mixerRef.current = null
      actionsRef.current = {}
      activeActionRef.current = null
      pendingWakeupRef.current = false
      stateRef.current = 'rest'
    }
  }, [scene, animations, startIdle, startPaint])

  // Advance the mixer every frame
  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
  })

  // Expose play / reset methods to parent via ref
  useImperativeHandle(ref, () => ({
    /**
     * Play a camera action. Only allowed from 'rest' state (idle at rest position).
     * Exception: aboutme_project is allowed from 'camera' state when aboutme was played.
     */
    playAction(name) {
      const actions = actionsRef.current
      const next = actions[name]
      if (!next) {
        console.warn(`⚠ "${name}" action not available`)
        return null
      }

      const state = stateRef.current

      // aboutme_project can play from camera state (when aboutme is active/finished)
      if (name === 'aboutme_project') {
        if (state !== 'camera') {
          console.warn('⚠ aboutme_project only works from aboutme position')
          return null
        }
        // Stop current (aboutme clamped) and play aboutme_project
        if (activeActionRef.current) activeActionRef.current.stop()
        next.reset()
        next.setLoop(THREE.LoopOnce, 1)
        next.clampWhenFinished = true
        next.play()
        activeActionRef.current = next
        // stays in 'camera' state
        console.log(`▶ Playing "aboutme_project" from aboutme position`)
        return name
      }

      // Camera actions (projects, art, aboutme) only from rest
      if (state !== 'rest') {
        console.warn(`⚠ Camera action "${name}" blocked — current state: ${state} (only works from rest)`)
        return null
      }

      // Stop idle
      const idle = actions['idle']
      if (idle) idle.stop()
      pendingWakeupRef.current = false

      // Play the camera action
      next.reset()
      next.setLoop(THREE.LoopOnce, 1)
      next.clampWhenFinished = true
      next.play()
      activeActionRef.current = next
      stateRef.current = 'camera'
      console.log(`▶ Playing "${name}" — state: camera`)
      return name
    },

    queueWakeup() {
      const actions = actionsRef.current
      if (!actions['wakeup'] || !actions['idle']) {
        console.warn('⚠ wakeup or idle action not available')
        return
      }

      // Only queue wakeup when in rest state (idle playing)
      if (stateRef.current !== 'rest') {
        console.warn(`⚠ Wakeup blocked — current state: ${stateRef.current} (only works from rest/idle)`)
        return
      }

      pendingWakeupRef.current = true
      console.log('⏳ Wakeup queued — will play after current idle loop')
    },

    resetAll() {
      const actions = actionsRef.current

      // Stop all actions
      Object.values(actions).forEach((a) => {
        a.stop()
        a.reset()
      })

      pendingWakeupRef.current = false
      activeActionRef.current = null
      stateRef.current = 'rest'

      // Restart idle
      startIdle()

      console.log('⏹ All actions reset → idle resumed')
      return null
    },

    getState() {
      return stateRef.current
    },
  }), [startIdle])

  useEffect(() => {
    if (scene) {
      onLoaded()
    }
  }, [scene, cameras, onLoaded])

  // Hover detection for known objects — scan ALL intersections, prioritise specific objects
  const handleScenePointerMove = useCallback((e) => {
    if (!onObjectHover) return
    const name = findBestHoverName(e.intersections || [])
    onObjectHover(name)
  }, [onObjectHover])

  const handleScenePointerOut = useCallback(() => {
    if (onObjectHover) onObjectHover(null)
  }, [onObjectHover])

  // Click detection for known objects
  const handleSceneClick = useCallback((e) => {
    if (!onObjectClick) return
    e.stopPropagation()
    const name = findBestHoverName(e.intersections || [])
    onObjectClick(name)
  }, [onObjectClick])

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <BlenderCamera cameras={cameras} />
      <EnhanceLights scene={scene} lightsOff={lightsOff} />
      <CeilingFan scene={scene} onHoverChange={onFanHover} fanSpeed={fanSpeed} onFanSpeedChange={onFanSpeedChange} fanOverloaded={fanOverloaded} onPointerMove={handleScenePointerMove} onPointerOut={handleScenePointerOut} onClickScene={handleSceneClick} />
      <PostEffects />
    </>
  )
})

export default WorldScene

useGLTF.preload('/world.glb')
