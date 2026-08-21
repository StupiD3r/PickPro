export const MAX_COURTS = 3

const API_URL = '/api/bookings'

async function request(path = '', options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (Array.isArray(body.errors) && body.errors.length) {
      throw new Error(body.errors.join(' '))
    }
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return body
}

export async function getBookings(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return request(query)
}

function coversHour(booking, hour) {
  const start = Number(booking.time.split(':')[0])
  const duration = Number(booking.duration) || 1
  for (let i = 0; i < duration; i++) {
    if ((start + i) % 24 === hour) return true
  }
  return false
}

export function countBooked(bookings, time) {
  const hour = Number(time.split(':')[0])
  return bookings
    .filter((booking) => booking.status !== 'Archived' && coversHour(booking, hour))
    .reduce((sum, booking) => sum + (Number(booking.courts) || 1), 0)
}

export function isSlotAvailable(bookings, time, duration = 1, courts = 1) {
  const start = Number(time.split(':')[0])
  for (let i = 0; i < duration; i++) {
    const hour = (start + i) % 24
    const occupied = countBooked(bookings, `${String(hour).padStart(2, '0')}:00`)
    if (occupied + courts > MAX_COURTS) return false
  }
  return true
}

export function formatHourLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const hours12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hours12}:00 ${period}`
}

export function formatTimeRange(time, duration) {
  const start = Number(time.split(':')[0])
  const end = (start + (Number(duration) || 1)) % 24
  return `${formatHourLabel(start)} – ${formatHourLabel(end)}`
}

export function getCourtOccupancy(bookings, date, hour) {
  const covering = bookings
    .filter(
      (booking) =>
        booking.date === date &&
        booking.status !== 'Archived' &&
        coversHour(booking, hour)
    )
    .sort(
      (a, b) =>
        String(a.createdAt).localeCompare(String(b.createdAt)) ||
        String(a.reference || '').localeCompare(String(b.reference || ''))
    )

  const courts = Array.from({ length: MAX_COURTS }, (_, i) => ({
    court: i + 1,
    available: true,
    booking: null,
  }))

  let cursor = 0
  for (const booking of covering) {
    const units = Number(booking.courts) || 1
    for (let u = 0; u < units && cursor < MAX_COURTS; u++) {
      courts[cursor] = { court: cursor + 1, available: false, booking }
      cursor++
    }
    if (cursor >= MAX_COURTS) break
  }

  return courts
}

export async function addBooking({ name, contact, date, time, duration = 1, courts = 1 }) {
  return request('', {
    method: 'POST',
    body: JSON.stringify({
      name,
      contact,
      date,
      time,
      duration: Number(duration),
      courts: Number(courts),
    }),
  })
}

export async function updateBookingStatus(id, status) {
  return request(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function archiveBooking(id) {
  return updateBookingStatus(id, 'Archived')
}

export async function deleteBooking(id) {
  return request(`/${id}`, { method: 'DELETE' })
}

export function getReference(booking) {
  if (booking.reference) return booking.reference
  return `PB-${String(booking.id)
    .replace(/\W/g, '')
    .slice(0, 12)
    .toUpperCase()}`
}
