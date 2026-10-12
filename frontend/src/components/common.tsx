import { useEffect, useState } from 'react'
import { AlertCircle, Check, Clock3, CircleX, FileCheck2 } from 'lucide-react'
import { fetchSignature } from '../api/client'
import type { VoucherStatus } from '../api/types'

const statusDetails: Record<VoucherStatus, { label: string; icon: typeof Clock3 }> = {
  DRAFT: { label: 'Draft', icon: Clock3 },
  PENDING_APPROVAL: { label: 'Pending approval', icon: Clock3 },
  APPROVED: { label: 'Approved', icon: Check },
  REJECTED: { label: 'Rejected', icon: CircleX },
}

export function StatusPill({ status }: { status: VoucherStatus }) {
  const { label, icon: Icon } = statusDetails[status]
  return <span className={`status-pill status-${status.toLowerCase()}`}><Icon size={13} />{label}</span>
}

export function ErrorNotice({ children }: { children: string }) {
  return <div className="error-notice" role="alert"><AlertCircle size={17} />{children}</div>
}

export function LoadingState({ label = 'Loading records' }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-icon"><FileCheck2 size={22} /></span><strong>{title}</strong><p>{detail}</p></div>
}

export function SignaturePreview({ path, label }: { path: string | null; label: string }) {
  const [image, setImage] = useState<{ path: string; url: string | null; failed: boolean } | null>(null)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    if (!path) return
    fetchSignature(path).then((blob) => {
      objectUrl = URL.createObjectURL(blob)
      if (active) setImage({ path, url: objectUrl, failed: false })
    }).catch(() => {
      if (active) setImage({ path, url: null, failed: true })
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  return (
    <div className="signature-preview">
      <span className="signature-label">{label}</span>
      {image?.path === path && image.url ? <img src={image.url} alt={`${label} signature`} /> : <span className="signature-empty">{image?.path === path && image.failed ? 'Unavailable' : path ? 'Loading…' : 'Not provided'}</span>}
    </div>
  )
}