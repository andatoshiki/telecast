'use client'

import { useEffect, useRef } from 'react'

/**
 * Telegram-style justified album layout for `.image-list-container`.
 *
 * Given 2–10 images and their natural aspect ratios, picks the best
 * layout template (horizontal rows, vertical columns, or mixed L-shapes)
 * so the entire album forms a **clean rectangle** with uniform gaps —
 * exactly like Telegram's native photo albums.
 *
 * Images are scaled (never cropped) to fill their cells; `object-fit:cover`
 * with `object-position:center` handles minor rounding.
 */

const CONTAINER_SELECTOR = '.prose-telegram .image-list-container'
const IMAGE_SELECTOR = 'img.zoomable'
const GAP = 6 // px gap between cells
const MIN_CELL = 40 // minimum cell dimension (px)

/* ─── geometry helpers ─────────────────────────────────────────────── */

interface Rect { x: number, y: number, w: number, h: number }
type Layout = Rect[]

/** Aspect ratio (w/h) clamped to avoid extremes. */
function ar(img: HTMLImageElement): number {
  return Math.max(0.25, Math.min(img.naturalWidth / img.naturalHeight, 4))
}

/** Sum of aspect ratios in slice `[from, to)`. */
function sumAr(ratios: number[], from: number, to: number): number {
  let s = 0
  for (let i = from; i < to; i++) {
    s += ratios[i]
  }
  return s
}

/* ─── layout solver ────────────────────────────────────────────────── */

/**
 * For a given container `W` and array of aspect ratios, return an array
 * of { x, y, w, h } rects (one per image) that tile a clean rectangle.
 *
 * Strategy mirrors Telegram: for 2–10 images we choose among several
 * candidate row/column splits and pick the one whose overall aspect
 * ratio (album width / album height) is closest to a pleasing target.
 *
 * Target album ratio: for wide containers we aim for ~1.6 (golden);
 * the algorithm naturally adapts.
 */
function solve(ratios: number[], W: number): Layout {
  const n = ratios.length

  // Single image: display large and centered.
  if (n === 1) {
    const naturalH = Math.round(W / ratios[0])
    // Cap at a comfortable max height while keeping aspect ratio.
    const maxH = Math.round(W * 1.35)
    const h = Math.min(naturalH, maxH)
    const displayW = h < naturalH ? Math.round(h * ratios[0]) : W
    const x = Math.round((W - displayW) / 2)
    return [{ x, y: 0, w: displayW, h }]
  }

  // Collect candidate layouts and pick the best one.
  const candidates: Layout[] = []

  // ── 2 images ──────────────────────────────────────────────────
  if (n === 2) {
    // Side by side
    candidates.push(sideBySide(ratios, W))
    // Stacked
    candidates.push(stacked(ratios, W))
  }

  // ── 3 images ──────────────────────────────────────────────────
  if (n === 3) {
    // Row of 3
    candidates.push(singleRow(ratios, W))
    // 1 top + 2 bottom
    candidates.push(topNBottomM(ratios, 1, W))
    // 2 top + 1 bottom
    candidates.push(topNBottomM(ratios, 2, W))
    // 1 left + 2 right (stacked)
    candidates.push(leftNRightM(ratios, 1, W))
  }

  // ── 4 images ──────────────────────────────────────────────────
  if (n === 4) {
    // 2 + 2 rows
    candidates.push(topNBottomM(ratios, 2, W))
    // 1 + 3
    candidates.push(topNBottomM(ratios, 1, W))
    // 3 + 1
    candidates.push(topNBottomM(ratios, 3, W))
    // 1 left + 3 right
    candidates.push(leftNRightM(ratios, 1, W))
    // Row of 4
    candidates.push(singleRow(ratios, W))
  }

  // ── 5+ images: row-split heuristic ───────────────────────────
  if (n >= 5) {
    // Try various 2-row splits
    for (let top = 1; top < n; top++) {
      candidates.push(topNBottomM(ratios, top, W))
    }
    // Try 3-row splits (most important for 5–10 images)
    for (let r1 = 1; r1 <= Math.min(n - 2, 4); r1++) {
      for (let r2 = 1; r2 <= Math.min(n - r1 - 1, 4); r2++) {
        const r3 = n - r1 - r2
        if (r3 >= 1 && r3 <= 4) {
          candidates.push(threeRows(ratios, r1, r2, W))
        }
      }
    }
    // 1 left + rest right (only if right side ≤ 4 to avoid thin strips)
    if (n <= 5) {
      candidates.push(leftNRightM(ratios, 1, W))
    }
  }

  // Score: prefer the layout whose overall bounding box has a
  // balanced aspect ratio. Penalize layouts containing cells that
  // are too thin — this prevents degenerate stacked strips.
  const TARGET_AR = 1.2
  let best = candidates[0]
  let bestScore = Infinity
  for (const layout of candidates) {
    const bounds = boundingBox(layout)
    if (bounds.h < MIN_CELL || bounds.w < MIN_CELL) {
      continue
    }

    // Base score: how close the album ratio is to our target
    const albumAr = bounds.w / bounds.h
    let score = Math.abs(Math.log(albumAr / TARGET_AR))

    // Penalty: if any cell is excessively thin or short, add a
    // large penalty to steer the solver away from degenerate layouts.
    const minCellW = Math.min(...layout.map(r => r.w))
    const minCellH = Math.min(...layout.map(r => r.h))
    if (minCellW < W * 0.15 || minCellH < 50) {
      score += 2.0
    }
    else if (minCellH < 80) {
      score += 0.5
    }

    if (score < bestScore) {
      bestScore = score
      best = layout
    }
  }

  return best
}

/* ─── layout primitives ────────────────────────────────────────────── */

/** All images in a single horizontal row. */
function singleRow(ratios: number[], W: number): Layout {
  const n = ratios.length
  const totalGap = GAP * (n - 1)
  const usable = W - totalGap
  const totalAr = sumAr(ratios, 0, n)
  const h = Math.max(Math.round(usable / totalAr), MIN_CELL)
  const rects: Layout = []
  let x = 0
  for (let i = 0; i < n; i++) {
    const w = i === n - 1
      ? W - x
      : Math.round(h * ratios[i])
    rects.push({ x, y: 0, w: Math.max(w, MIN_CELL), h })
    x += w + GAP
  }
  return rects
}

/** 2 images side by side, matched height. */
function sideBySide(ratios: number[], W: number): Layout {
  return singleRow(ratios, W)
}

/** 2 images stacked vertically, matched width. */
function stacked(ratios: number[], W: number): Layout {
  const h0 = Math.max(Math.round(W / ratios[0]), MIN_CELL)
  const h1 = Math.max(Math.round(W / ratios[1]), MIN_CELL)
  return [
    { x: 0, y: 0, w: W, h: h0 },
    { x: 0, y: h0 + GAP, w: W, h: h1 },
  ]
}

/** Top row has `topCount` images, bottom row has the rest. */
function topNBottomM(ratios: number[], topCount: number, W: number): Layout {
  const n = ratios.length
  const botCount = n - topCount

  const topRow = rowOfN(ratios, 0, topCount, W)
  const topH = topRow[0].h

  const botRow = rowOfN(ratios, topCount, botCount, W)
  const _botH = botRow[0].h

  // Offset bottom row
  for (const r of botRow) {
    r.y = topH + GAP
  }

  return [...topRow, ...botRow]
}

/** 3 horizontal rows. */
function threeRows(ratios: number[], r1: number, r2: number, W: number): Layout {
  const r3 = ratios.length - r1 - r2

  const row1 = rowOfN(ratios, 0, r1, W)
  const h1 = row1[0].h

  const row2 = rowOfN(ratios, r1, r2, W)
  const h2 = row2[0].h
  for (const r of row2) {
    r.y = h1 + GAP
  }

  const row3 = rowOfN(ratios, r1 + r2, r3, W)
  const _h3 = row3[0].h
  for (const r of row3) {
    r.y = h1 + GAP + h2 + GAP
  }

  return [...row1, ...row2, ...row3]
}

/** Left column has `leftCount` images stacked, right column has the rest. */
function leftNRightM(ratios: number[], leftCount: number, W: number): Layout {
  const n = ratios.length
  const rightCount = n - leftCount

  // Heuristic: left column width based on first image ar vs average right ar.
  const leftAr = sumAr(ratios, 0, leftCount) / leftCount
  const rightAr = sumAr(ratios, leftCount, n) / rightCount

  // The left column's combined height should roughly equal the right column's
  // combined height so they form a rectangle.
  // leftW / leftTotalH ≈ rightW / rightTotalH, where leftW + GAP + rightW = W
  // Simpler: allocate width proportional to average ar
  const leftW = Math.max(Math.round((W - GAP) * leftAr / (leftAr + rightAr)), MIN_CELL)
  const rightW = W - GAP - leftW

  // Left column: stack images vertically with equal partitioning.
  const leftTotalH = computeStackHeight(ratios, 0, leftCount, leftW)
  const leftRects = stackColumn(ratios, 0, leftCount, leftW, leftTotalH, 0, 0)

  // Right column: stack images vertically, same total height as left.
  const rightRects = stackColumn(ratios, leftCount, rightCount, rightW, leftTotalH, leftW + GAP, 0)

  return [...leftRects, ...rightRects]
}

/** Helper: lay out `count` images starting at `start` in a single row of width `W`. */
function rowOfN(ratios: number[], start: number, count: number, W: number): Layout {
  const totalGap = GAP * (count - 1)
  const usable = W - totalGap
  const totalAr = sumAr(ratios, start, start + count)
  const h = Math.max(Math.round(usable / totalAr), MIN_CELL)
  const rects: Layout = []
  let x = 0
  for (let i = 0; i < count; i++) {
    const w = i === count - 1
      ? W - x
      : Math.max(Math.round(h * ratios[start + i]), MIN_CELL)
    rects.push({ x, y: 0, w, h })
    x += w + GAP
  }
  return rects
}

/** Total height of `count` images stacked at width `colW`. */
function computeStackHeight(ratios: number[], start: number, count: number, colW: number): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.max(Math.round(colW / ratios[start + i]), MIN_CELL)
  }
  return total + GAP * (count - 1)
}

/** Stack `count` images in a column, stretching to `totalH`. */
function stackColumn(
  ratios: number[],
  start: number,
  count: number,
  colW: number,
  totalH: number,
  offsetX: number,
  offsetY: number,
): Layout {
  // Proportional heights summing to totalH minus gaps.
  const usableH = totalH - GAP * (count - 1)
  const inverses: number[] = []
  let sumInv = 0
  for (let i = 0; i < count; i++) {
    const inv = 1 / ratios[start + i]
    inverses.push(inv)
    sumInv += inv
  }

  const rects: Layout = []
  let y = offsetY
  for (let i = 0; i < count; i++) {
    const h = i === count - 1
      ? totalH + offsetY - y
      : Math.max(Math.round(usableH * (inverses[i] / sumInv)), MIN_CELL)
    rects.push({ x: offsetX, y, w: colW, h: Math.max(h, MIN_CELL) })
    y += h + GAP
  }
  return rects
}

function boundingBox(layout: Layout): { w: number, h: number } {
  let maxR = 0
  let maxB = 0
  for (const r of layout) {
    maxR = Math.max(maxR, r.x + r.w)
    maxB = Math.max(maxB, r.y + r.h)
  }
  return { w: maxR, h: maxB }
}

/* ─── DOM application ──────────────────────────────────────────────── */

function layoutContainer(container: HTMLElement): boolean {
  const images = Array.from(
    container.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR),
  )

  if (images.length < 1) {
    return false
  }

  const W = container.clientWidth
  if (W === 0) {
    return false
  }

  const allLoaded = images.every(img => img.complete && img.naturalWidth > 0)
  if (!allLoaded) {
    return false
  }

  const ratios = images.map(ar)
  const layout = solve(ratios, W)
  const bounds = boundingBox(layout)

  // Apply absolute positioning inside a relatively-positioned container.
  container.style.position = 'relative'
  container.style.width = '100%'
  container.style.height = `${bounds.h}px`

  images.forEach((img, i) => {
    const r = layout[i]
    img.style.position = 'absolute'
    img.style.left = `${r.x}px`
    img.style.top = `${r.y}px`
    img.style.width = `${r.w}px`
    img.style.height = `${r.h}px`
    img.style.objectFit = 'cover'
    img.style.objectPosition = 'center'
  })

  container.dataset.albumLaid = 'true'
  return true
}

/* ─── React component ──────────────────────────────────────────────── */

export function ContentAlbum() {
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const initialised = new WeakSet<HTMLElement>()

    function initContainer(container: HTMLElement) {
      if (initialised.has(container)) {
        return
      }
      initialised.add(container)

      const images = Array.from(
        container.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR),
      )
      if (images.length < 1) {
        return
      }

      if (layoutContainer(container)) {
        return
      }

      const retry = () => layoutContainer(container)
      images.forEach((img) => {
        if (!img.complete) {
          img.addEventListener('load', retry, { once: true })
          img.addEventListener('error', retry, { once: true })
        }
      })
      requestAnimationFrame(retry)
    }

    function scan() {
      document
        .querySelectorAll<HTMLElement>(CONTAINER_SELECTOR)
        .forEach(initContainer)
    }

    const observer = new MutationObserver(() => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = requestAnimationFrame(scan)
    })

    scan()
    observer.observe(document.body, { childList: true, subtree: true })

    let resizeTimer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        document
          .querySelectorAll<HTMLElement>(
            `${CONTAINER_SELECTOR}[data-album-laid]`,
          )
          .forEach((container) => {
            // Reset so we can re-measure
            container.style.height = ''
            const images = Array.from(
              container.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR),
            )
            images.forEach((img) => {
              img.style.position = ''
              img.style.left = ''
              img.style.top = ''
              img.style.width = ''
              img.style.height = ''
            })
            layoutContainer(container)
          })
      }, 120)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return null
}
