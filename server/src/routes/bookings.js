import { Router } from 'express'
import { supabase } from '../db.js'

const router = Router()

const MAX_COURTS = 3
const STATUSES = ['Pending', 'Confirmed', 'Archived']

function hourToTime(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

function toApi(row) {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    contact: row.contact,
    date: row.booking_date,
    time: hourToTime(row.start_hour),
    duration: row.duration_hours,
    courts: row.courts,
    status: row.status,
    createdAt: row.created_at,
  }
}

router.get('/', async (req, res) => {
  const { date } = req.query

  let query = supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (date) query = query.eq('booking_date', date)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  res.json(data.map(toApi))
})

router.post('/', async (req, res) => {
  const { name, contact, date, time, duration, courts } = req.body ?? {}
  const errors = []

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('name is required')
  }
  if (!/^09\d{9}$/.test(String(contact ?? ''))) {
    errors.push('contact must be an 11-digit number starting with 09')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ''))) {
    errors.push('date must be in YYYY-MM-DD format')
  }

  let startHour = null
  if (/^\d{1,2}:\d{2}$/.test(String(time ?? ''))) {
    startHour = Number(String(time).split(':')[0])
  }
  if (startHour === null || !Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    errors.push('time must be a valid hour between 00:00 and 23:00')
  }

  const durationHours = Number(duration ?? 1)
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 8) {
    errors.push('duration must be an integer between 1 and 8 hours')
  }

  const courtCount = Number(courts ?? 1)
  if (!Number.isInteger(courtCount) || courtCount < 1 || courtCount > MAX_COURTS) {
    errors.push(`courts must be an integer between 1 and ${MAX_COURTS}`)
  }

  if (errors.length) return res.status(400).json({ errors })

  const { data, error } = await supabase.rpc('create_booking', {
    p_name: name.trim(),
    p_contact: String(contact),
    p_date: String(date),
    p_start_hour: startHour,
    p_duration: durationHours,
    p_courts: courtCount,
  })

  if (error) {
    if (error.message.includes('COURT_CAPACITY')) {
      return res.status(409).json({
        error: 'Not enough courts available for this date and time.',
      })
    }
    console.error('create_booking failed:', error.message)
    return res.status(500).json({ error: 'Failed to create booking.' })
  }

  res.status(201).json(toApi(data))
})

router.patch('/:id', async (req, res) => {
  const { status } = req.body ?? {}

  if (!STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${STATUSES.join(', ')}` })
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Booking not found' })
    }
    return res.status(500).json({ error: error.message })
  }

  res.json(toApi(data))
})

router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Booking not found' })
    }
    return res.status(500).json({ error: error.message })
  }

  res.json(toApi(data))
})

export default router
