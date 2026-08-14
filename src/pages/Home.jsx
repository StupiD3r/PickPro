import { useEffect, useState, useMemo } from 'react'
import {
  addBooking,
  isSlotAvailable,
  getBookingCount,
  MAX_COURTS,
} from '../store/bookings'

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const totalMinutes = i * 60
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return {
    value: `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    label: `${hours12}:${String(minutes).padStart(2, '0')} ${period}`,
  }
})

/* ---------- small brand-flavored icon set ---------- */
const IconPaddle = (props) => (
  <svg viewBox="0 0 48 48" fill="none" {...props}>
    <path d="M24 4c8 0 13 5.5 13 13.5S32 30 24 30s-13-4.5-13-12.5S16 4 24 4Z" stroke="currentColor" strokeWidth="2.5" />
    <path d="M24 30v10M18 44h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 12h12M15.5 17.5h17M18 23h12" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
  </svg>
)
const IconBall = (props) => (
  <svg viewBox="0 0 48 48" fill="none" {...props}>
    <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2.5" />
    {[[24,9],[24,39],[9,24],[39,24],[14,14],[34,34],[14,34],[34,14],[24,24]].map(([cx,cy],i)=>(
      <circle key={i} cx={cx} cy={cy} r="2.1" fill="currentColor" />
    ))}
  </svg>
)
const IconShaker = (props) => (
  <svg viewBox="0 0 48 48" fill="none" {...props}>
    <rect x="17" y="4" width="14" height="6" rx="1.5" stroke="currentColor" strokeWidth="2.5" />
    <path d="M15 10h18l-2.4 32.5a2 2 0 0 1-2 1.8H19.4a2 2 0 0 1-2-1.8L15 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M14.5 21h19" stroke="currentColor" strokeWidth="2.2" />
  </svg>
)
const IconCheck = (props) => (
  <svg viewBox="0 0 64 64" fill="none" {...props}>
    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" />
    <path d="M20 33.5 28 41 44 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Home() {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    contact: '09',
    date: '',
    time: '',
    duration: '1',
    courts: '1',
  })
  const [submitted, setSubmitted] = useState(false)
  const [slotError, setSlotError] = useState('')

  useEffect(() => {
    const refresh = () => setForm((prev) => ({ ...prev }))
    window.addEventListener('bookings-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('bookings-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const openModal = () => {
    setForm({
      name: '',
      contact: '09',
      date: '',
      time: '',
      duration: '1',
      courts: '1',
    })
    setSubmitted(false)
    setSlotError('')
    setIsOpen(true)
  }
  const closeModal = () => setIsOpen(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'date' || name === 'time') setSlotError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!/^09\d{9}$/.test(form.contact)) {
      setSlotError('Contact number must be 11 digits starting with 09.')
      return
    }
    if (!isSlotAvailable(form.date, form.time, Number(form.duration), Number(form.courts))) {
      setSlotError(`Sorry, not enough courts available for this date and time. Please pick another slot or fewer courts.`)
      return
    }
    addBooking(form)
    setSubmitted(true)
  }

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  return (
    <div className="pp-root">
      

      <div className="pp-hexlayer" />
      <div className="pp-streaks" />

      <nav className="pp-nav">
        <div className="pp-brand">
          <img src="/logo.jpg" alt="PickPro logo" />
          <div className="pp-wordmark pp-display">
            <span className="g">PICK</span><span className="r">PRO</span>
          </div>
        </div>
        <div className="pp-status">
          <span className="pp-dot" />
          COURTS OPEN 24/7
        </div>
      </nav>

      <header className="pp-hero">
        <div className="pp-logo-hero">
          <img src="/logo.jpg" alt="" />
        </div>
        <p className="pp-eyebrow pp-mono">KORONADAL BUSIEST PICKLEBALL COURTS</p>
        <h1 className="pp-h1 pp-display">
          Book Your Court.<br />Bring Your <span className="accent">Game</span>.
        </h1>
        <p className="pp-sub">
          Three courts, real-time availability, zero double-bookings.
          Pick a time, drop your name, and get on the kitchen line.
          <br /><span className="pp-tagline">Pick your paddle and hit your protein.</span>
        </p>
        <span className="pp-cta-wrap">
          <button className="pp-cta" onClick={openModal}>Book Now</button>
        </span>
      </header>

      <div className="pp-score">
        <div className="pp-score-item">
          <div className="pp-score-num pp-mono">{MAX_COURTS}</div>
          <div className="pp-score-label">COURTS ON SITE</div>
        </div>
        <div className="pp-score-item">
          <div className="pp-score-num pp-mono">24/7</div>
          <div className="pp-score-label">BOOKING WINDOW</div>
        </div>
        <div className="pp-score-item">
          <div className="pp-score-num pp-mono">&lt;60s</div>
          <div className="pp-score-label">TO CONFIRMED</div>
        </div>
      </div>

      <section className="pp-features">
        <div className="pp-feature">
          <IconPaddle />
          <h3 className="pp-display">Pick your slot</h3>
          <p>Every hour of every day is on the board. See exactly how many courts are open before you commit.</p>
        </div>
        <div className="pp-feature">
          <IconBall />
          <h3 className="pp-display">Play it out</h3>
          <p>{MAX_COURTS} courts, first come first served. No overlaps, no awkward court-sharing.</p>
        </div>
        <div className="pp-feature">
          <IconShaker />
          <h3 className="pp-display">Refuel after</h3>
          <p>Grab your shaker on the way out. You earned it.</p>
        </div>
      </section>

      <p className="pp-foot pp-mono">PICKPRO &middot; PICK YOUR PADDLE AND HIT YOUR PROTEIN</p>

      {isOpen && (
        <div className="pp-backdrop" onClick={closeModal}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            {submitted ? (
              <div className="pp-confirm">
                <IconCheck className="pp-confirm-icon" />
                <h2 className="pp-display">Reservation Confirmed!</h2>
                <p>
                  Thank you, <strong>{form.name || 'Guest'}</strong>. Your booking is
                  scheduled for <strong>{form.date || 'a date'}</strong> at{' '}
                  <strong>{form.time || 'a time'}</strong> for{' '}
                  <strong>
                    {Number(form.duration) || 1} hour{Number(form.duration) > 1 ? 's' : ''}
                  </strong>{' '}
                  on{' '}
                  <strong>
                    {Number(form.courts) || 1} court{Number(form.courts) > 1 ? 's' : ''}
                  </strong>.
                </p>
                <button className="pp-btn-done" onClick={closeModal}>DONE</button>
              </div>
            ) : (
              <>
                <button className="pp-modal-x" onClick={closeModal} aria-label="Close">×</button>
                <h2 className="pp-modal-title">Book a <span className="r">Court</span></h2>
                <p className="pp-modal-eyebrow pp-mono">FILL IN YOUR DETAILS</p>
                <form className="pp-form" onSubmit={handleSubmit}>
                  <label className="pp-field">
                    <span>NAME OF BOOKER</span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Juan Dela Cruz"
                      required
                    />
                  </label>
                  <label className="pp-field">
                    <span>CONTACT NO.</span>
                    <input
                      type="tel"
                      name="contact"
                      value={form.contact}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '')
                        const withPrefix = digits.startsWith('09') ? digits : '09' + digits.replace(/^0?/, '')
                        setForm((prev) => ({ ...prev, contact: withPrefix.slice(0, 11) }))
                      }}
                      placeholder="e.g. 09171234567"
                      pattern="09\d{9}"
                      maxLength={11}
                      required
                    />
                  </label>
                  <label className="pp-field">
                    <span>DATE OF BOOK</span>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      min={todayStr}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label className="pp-field">
                    <span>TIME</span>
                    <select name="time" value={form.time} onChange={handleChange} required>
                      <option value="" disabled>Select a time</option>
                      {timeSlots.map((slot) => {
                        const count = form.date ? getBookingCount(form.date, slot.value) : 0
                        const left = MAX_COURTS - count
                        return (
                          <option key={slot.value} value={slot.value} disabled={left <= 0}>
                            {slot.label} ({left > 0 ? `${left} available` : 'Full'})
                          </option>
                        )
                      })}
                    </select>
                  </label>
                  <label className="pp-field">
                    <span>DURATION (HOURS)</span>
                    <select
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      required
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 1).map((hours) => (
                        <option key={hours} value={String(hours)}>
                          {hours} hour{hours > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pp-field">
                    <span>NUMBER OF COURTS</span>
                    <select
                      name="courts"
                      value={form.courts}
                      onChange={handleChange}
                      required
                    >
                      {Array.from({ length: MAX_COURTS }, (_, i) => i + 1).map(
                        (courtCount) => (
                          <option key={courtCount} value={String(courtCount)}>
                            {courtCount} court{courtCount > 1 ? 's' : ''}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  {slotError && <p className="pp-error" role="alert">{slotError}</p>}
                  <button type="submit" className="pp-submit">Confirm Booking</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Home