'use client'

import type { MouseEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const CODE_BLOCK_SELECTOR = '.prose-telegram pre'
const RESET_DELAY_MS = 1500

let codeBlockIdCounter = 0

interface CodeBlockTarget {
  id: string
  node: HTMLElement
}

async function copyToClipboard(value: string) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  }
  catch {
    // Fall back to legacy approach below.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    return copied
  }
  catch {
    return false
  }
}

function getCodeText(pre: HTMLElement) {
  const code = pre.querySelector('code')?.textContent || pre.textContent || ''
  return code.replace(/\s+$/, '')
}

function ensureCodeBlockId(pre: HTMLElement) {
  if (!pre.dataset.codeCopyId) {
    codeBlockIdCounter += 1
    pre.dataset.codeCopyId = `code-copy-${codeBlockIdCounter}`
  }
  return pre.dataset.codeCopyId
}

function CodeCopyButton({ target, copyLabel, copiedLabel }: { target: HTMLElement, copyLabel: string, copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  const onCopyClick = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const content = getCodeText(target)
    if (!content) {
      return
    }

    const didCopy = await copyToClipboard(content)
    if (!didCopy) {
      return
    }

    setCopied(true)

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false)
      resetTimerRef.current = null
    }, RESET_DELAY_MS)
  }, [target])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  return (
    <button
      type="button"
      className="code-copy-button"
      data-copied={copied ? 'true' : 'false'}
      onClick={onCopyClick}
      aria-label={copied ? copiedLabel : copyLabel}
      title={copied ? copiedLabel : copyLabel}
    >
      <span className="code-copy-icon code-copy-icon-copy" aria-hidden>
        <Copy className="h-3.5 w-3.5" />
      </span>
      <span className="code-copy-icon code-copy-icon-check" aria-hidden>
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="sr-only">{copied ? copiedLabel : copyLabel}</span>
    </button>
  )
}

interface ContentCodeCopyProps {
  copyLabel: string
  copiedLabel: string
}

export function ContentCodeCopy({ copyLabel, copiedLabel }: ContentCodeCopyProps) {
  const [targets, setTargets] = useState<CodeBlockTarget[]>([])

  const refreshTargets = useCallback(() => {
    const nextTargets: CodeBlockTarget[] = []

    document.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR).forEach((pre) => {
      if (!pre.isConnected) {
        return
      }

      pre.classList.add('code-copy-enabled')
      const id = ensureCodeBlockId(pre)
      nextTargets.push({ id, node: pre })
    })

    setTargets((previousTargets) => {
      if (
        previousTargets.length === nextTargets.length
        && previousTargets.every((entry, index) =>
          entry.id === nextTargets[index]?.id
          && entry.node === nextTargets[index]?.node,
        )
      ) {
        return previousTargets
      }

      return nextTargets
    })
  }, [])

  useEffect(() => {
    let scanFrame: number | undefined

    const observer = new MutationObserver(() => {
      if (scanFrame) {
        cancelAnimationFrame(scanFrame)
      }

      scanFrame = requestAnimationFrame(refreshTargets)
    })

    refreshTargets()

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      if (scanFrame) {
        cancelAnimationFrame(scanFrame)
      }
    }
  }, [refreshTargets])

  return (
    <>
      {targets.map(({ id, node }) => createPortal(
        <CodeCopyButton key={id} target={node} copyLabel={copyLabel} copiedLabel={copiedLabel} />,
        node,
        id,
      ))}
    </>
  )
}
