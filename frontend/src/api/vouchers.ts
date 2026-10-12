import { apiRequest } from './client'
import type { Voucher, VoucherInput, VoucherPage, VoucherQuery } from './types'

function queryString(query: VoucherQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export function listVouchers(query: VoucherQuery = {}) {
  return apiRequest<VoucherPage>(`/vouchers${queryString(query)}`)
}

export function getVoucher(id: string) {
  return apiRequest<Voucher>(`/vouchers/${id}`)
}

export function createVoucher(input: VoucherInput) {
  return apiRequest<Voucher>('/vouchers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateVoucher(id: string, input: VoucherInput) {
  return apiRequest<Voucher>(`/vouchers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteVoucher(id: string) {
  return apiRequest<{ success: boolean }>(`/vouchers/${id}`, { method: 'DELETE' })
}

function signatureForm(file: File) {
  const body = new FormData()
  body.append('signature', file)
  return body
}

export function uploadEmployeeSignature(id: string, file: File) {
  return apiRequest<{ employeeSignatureUrl: string }>(
    `/vouchers/${id}/signatures/employee`,
    { method: 'POST', body: signatureForm(file) },
  )
}

export function submitVoucher(id: string) {
  return apiRequest<Voucher>(`/vouchers/${id}/submit`, { method: 'POST' })
}

export function approveVoucher(id: string, file: File) {
  return apiRequest<Voucher>(`/vouchers/${id}/approve`, {
    method: 'POST',
    body: signatureForm(file),
  })
}

export function rejectVoucher(id: string, reason: string) {
  return apiRequest<Voucher>(`/vouchers/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function getDashboard() {
  return apiRequest<import('./types').Dashboard>('/dashboards/me')
}