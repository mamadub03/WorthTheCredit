import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, ChevronIcon } from '../../components/ui/icons.tsx'
import { COLLEGES } from '../../domain/colleges.ts'
import { coursesSearch } from '../../routes/discoveryPaths.ts'
import styles from './CollegeCarousel.module.css'

const STEP = 360 / COLLEGES.length
const AUTO_SPEED = -0.075 // degrees per frame while nobody is touching it
const IDLE_MS = 2500

/** Ring depth and hover pop, smaller on phones. */
function geometry(compact: boolean) {
  return compact ? { depth: -470, hoverDepth: -330, hoverScale: 1.12 } : { depth: -730, hoverDepth: -490, hoverScale: 1.15 }
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

/**
 * RIT's 11 colleges on a slowly spinning 3D wall. Students can drag it, swipe
 * sideways on a trackpad, use the side arrows or the arrow keys; it picks up
 * the auto-spin again after a moment. Hovering or tabbing to a card brings it
 * closer. Each card opens the course list for that college.
 * Owner: FE1 (#20).
 */
export default function CollegeCarousel() {
  const compact = useMediaQuery('(max-width: 640px)')
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [hovered, setHovered] = useState<number | null>(null)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const angle = useRef(0)
  const pending = useRef(0)
  const autoVel = useRef(0)
  const lastInteract = useRef(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const hoveredRef = useRef<number | null>(null)
  useEffect(() => {
    hoveredRef.current = hovered
  }, [hovered])

  const touch = () => {
    lastInteract.current = performance.now()
  }

  // The spin runs outside React: one requestAnimationFrame loop writes the ring's transform.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const idle = !dragging.current && hoveredRef.current === null && performance.now() - lastInteract.current > IDLE_MS
      autoVel.current += ((idle && !reduceMotion ? AUTO_SPEED : 0) - autoVel.current) * 0.04
      const move = pending.current * 0.12
      pending.current -= move
      angle.current += autoVel.current + move
      if (ringRef.current) ringRef.current.style.transform = `rotateY(${angle.current.toFixed(3)}deg)`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduceMotion])

  // Sideways trackpad swipes and shift+wheel spin the ring; vertical scrolling still scrolls the page.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (event: WheelEvent) => {
      const dx = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0
      if (!dx) return
      event.preventDefault()
      pending.current -= dx * 0.12
      touch()
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  const spin = useCallback((direction: 1 | -1) => {
    pending.current += direction * STEP
    touch()
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      spin(1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      spin(-1)
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    dragging.current = true
    moved.current = false
    const startX = event.clientX
    let lastX = event.clientX
    let lastT = performance.now()
    let velocity = 0
    const onMove = (move: globalThis.PointerEvent) => {
      const now = performance.now()
      const dx = move.clientX - lastX
      if (Math.abs(move.clientX - startX) > 6) moved.current = true
      angle.current += dx * 0.12
      velocity = dx / Math.max(1, now - lastT)
      lastX = move.clientX
      lastT = now
    }
    const onUp = () => {
      dragging.current = false
      pending.current += velocity * 15 // let it coast a little
      touch()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // A drag shouldn't also open the card it ended on.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (moved.current) {
      event.preventDefault()
      event.stopPropagation()
      moved.current = false
    }
  }

  const { depth, hoverDepth, hoverScale } = geometry(compact)

  return (
    <section className={styles.section} aria-labelledby="colleges-heading">
      <h2 id="colleges-heading" className="wtc-sr">
        Browse by college
      </h2>
      <div
        ref={stageRef}
        className={styles.stage}
        role="region"
        aria-label="RIT colleges. Use the left and right arrow keys to spin."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
      >
        <div ref={ringRef} className={styles.ring}>
          {COLLEGES.map((college, i) => {
            const on = hovered === i
            const style = {
              transform: `rotateY(${(i * STEP).toFixed(2)}deg) translateZ(${on ? hoverDepth : depth}px) scale(${on ? hoverScale : 1})`,
              background: `var(--wtc-${college.tint})`,
            } as CSSProperties
            return (
              <Link
                key={college.key}
                to={coursesSearch({ college: college.key })}
                className={`${styles.card} ${on ? styles.cardOn : ''}`}
                style={style}
                draggable={false}
                aria-label={`${college.fullName}: explore courses`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <img className={styles.photo} src={college.photo} alt="" draggable={false} />
                <span className={styles.text}>
                  <span className={styles.name}>{college.name}</span>
                  <span className={styles.full}>{college.fullName}</span>
                  <span className={styles.explore}>
                    Explore courses <ArrowRightIcon size={14} />
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
        <button type="button" className={`wtc-btn wtc-btn-white ${styles.arrow} ${styles.arrowLeft}`} aria-label="Previous college" onClick={() => spin(1)}>
          <ChevronIcon direction="left" size={22} />
        </button>
        <button type="button" className={`wtc-btn wtc-btn-white ${styles.arrow} ${styles.arrowRight}`} aria-label="Next college" onClick={() => spin(-1)}>
          <ChevronIcon size={22} />
        </button>
      </div>
    </section>
  )
}
