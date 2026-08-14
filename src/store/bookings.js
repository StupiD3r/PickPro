const STORAGE_KEY = 'pickleball_bookings'
const UPDATED_EVENT = 'bookings-updated'
export const MAX_COURTS = 3

export function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function persist(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

function hourNumber(time) {
  return Number(time.split(':')[0])
}

function coversHour(booking, hour) {
  const start = hourNumber(booking.time)
  const duration = Number(booking.duration) || 1
  for (let i = 0; i < duration; i++) {
    if ((start + i) % 24 === hour) return true
  }
  return false
}

export function getBookingCount(date, time) {
  const hour = hourNumber(time)
  return getBookings()
    .filter((booking) => booking.date === date && coversHour(booking, hour))
    .reduce((sum, booking) => sum + (Number(booking.courts) || 1), 0)
}

export function isSlotAvailable(date, time, duration = 1, courts = 1) {
  const start = hourNumber(time)
  for (let i = 0; i < duration; i++) {
    const hour = (start + i) % 24
    const occupied = getBookingCount(date, `${String(hour).padStart(2, '0')}:00`)
    if (occupied + courts > MAX_COURTS) {
      return false
    }
  }
  return true
}

export function addBooking({ name, contact, date, time, duration = 1, courts = 1 }) {
  if (!isSlotAvailable(date, time, duration, courts)) {
    return null
  }
  const bookings = getBookings()
  const booking = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reference: generateReference(),
    name,
    contact,
    date,
    time,
    duration,
    courts,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  }
  persist([...bookings, booking])
  return booking
}

export function generateReference() {
  const used = new Set(getBookings().map((b) => b.reference))
  let ref = ''
  do {
    ref = `PB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(
      Math.floor(1000 + Math.random() * 9000)
    )}`
  } while (used.has(ref))
  return ref
}

export function getReference(booking) {
  if (booking.reference) return booking.reference
  return `PB-${String(booking.id)
    .replace(/\W/g, '')
    .slice(0, 12)
    .toUpperCase()}`
}

export function updateBookingStatus(id, status) {
  persist(
    getBookings().map((booking) =>
      booking.id === id ? { ...booking, status } : booking
    )
  )
}

export function archiveBooking(id) {
  updateBookingStatus(id, 'Archived')
}

export function deleteBooking(id) {
  persist(getBookings().filter((booking) => booking.id !== id))
}