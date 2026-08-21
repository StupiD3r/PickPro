import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getBookings,
  getReference,
  updateBookingStatus,
  archiveBooking,
  deleteBooking,
  getCourtOccupancy,
  getNextBooking,
  formatHourLabel,
  formatTimeRange,
  MAX_COURTS,
} from '../api/bookings'

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`
}

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const period = Number(hours) >= 12 ? 'PM' : 'AM'
  const hours12 = Number(hours) % 12 === 0 ? 12 : Number(hours) % 12
  return `${hours12}:${minutes} ${period}`
}

function formatDuration(duration) {
  const hours = Number(duration) || 1
  return `${hours} hr${hours > 1 ? 's' : ''}`
}

function formatCourts(courts) {
  const count = Number(courts) || 1
  return `${count}`
}

function formatCreatedAt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function useBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await getBookings()
      setBookings(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { bookings, loading, error, refresh }
}

function StatusBadge({ status }) {
  const className = `status-badge ${
    status === 'Confirmed'
      ? 'status-confirmed'
      : status === 'Archived'
        ? 'status-archived'
        : 'status-pending'
  }`
  return <span className={className}>{status}</span>
}

function getNowLocal() {
  const d = new Date()
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`,
    hour: d.getHours(),
  }
}

function Admin() {
  const { bookings, loading, error, refresh } = useBookings()
  const [tab, setTab] = useState('active')
  const [boardDate, setBoardDate] = useState(() => getNowLocal().date)
  const [boardHour, setBoardHour] = useState(() => getNowLocal().hour)

  const resetBoard = () => {
    const { date, hour } = getNowLocal()
    setBoardDate(date)
    setBoardHour(hour)
  }

  const courtStatus = useMemo(
    () => getCourtOccupancy(bookings, boardDate, boardHour),
    [bookings, boardDate, boardHour]
  )
  const occupiedCount = courtStatus.filter((c) => !c.available).length

  const nextBooking = useMemo(
    () => getNextBooking(bookings, boardDate, boardHour),
    [bookings, boardDate, boardHour]
  )

  const todayStr = getNowLocal().date

  const isPast = (booking) => booking.date < todayStr

  const activeBookings = bookings.filter(
    (b) => b.status !== 'Archived' && !b.deletedAt && !isPast(b)
  )
  const historyBookings = bookings
    .filter((b) => b.status === 'Archived' || b.deletedAt || isPast(b))
    .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))

  const toggleConfirm = async (booking) => {
    await updateBookingStatus(
      booking.id,
      booking.status === 'Confirmed' ? 'Pending' : 'Confirmed'
    )
    refresh()
  }

  const archive = async (booking) => {
    await archiveBooking(booking.id)
    refresh()
  }

  const restore = async (booking) => {
    await updateBookingStatus(booking.id, 'Pending', { undoDelete: true })
    refresh()
  }

  const remove = async (booking) => {
    await deleteBooking(booking.id)
    refresh()
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="container">
          <div className="admin-header-row">
            <h1 className="admin-title">Admin — Bookings</h1>
            <a href="/" className="btn btn-outline">
              Back to Site
            </a>
          </div>
          <p className="admin-subtitle">
            {activeBookings.length} upcoming · {historyBookings.length} recorded
          </p>
        </div>
      </header>

      <div className="container">
        <section className="courts-board">
          <div className="courts-board-head">
            <div>
              <h2 className="courts-title">Court Status</h2>
              <p className="courts-subtitle">
                {occupiedCount} of {MAX_COURTS} courts occupied
              </p>
            </div>
            <div className="courts-controls">
              <input
                type="date"
                value={boardDate}
                onChange={(e) => setBoardDate(e.target.value)}
                aria-label="Board date"
              />
              <select
                value={boardHour}
                onChange={(e) => setBoardHour(Number(e.target.value))}
                aria-label="Board hour"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {formatHourLabel(h)}
                  </option>
                ))}
              </select>
              <button type="button" className="courts-reset" onClick={resetBoard}>
                Reset
              </button>
            </div>
          </div>
          <div className="court-cards">
            {courtStatus.map(({ court, available, booking }) =>
              available ? (
                <div key={court} className="court-card free">
                  <div className="court-card-top">
                    <span className="court-dot" />
                    <span className="court-name">COURT {court}</span>
                  </div>
                  <div className="court-available">AVAILABLE</div>
                </div>
              ) : (
                <div
                  key={court}
                  className={`court-card occupied${
                    booking.status === 'Pending' ? ' pending' : ''
                  }`}
                >
                  <div className="court-card-top">
                    <span className="court-dot" />
                    <span className="court-name">COURT {court}</span>
                  </div>
                  <div className="court-occupant">{booking.name}</div>
                  <div className="court-ref">{getReference(booking)}</div>
                  <div className="court-time">
                    {formatTimeRange(booking.time, booking.duration)}
                  </div>
                  <div className="court-meta">
                    <StatusBadge status={booking.status} />
                    <span className="court-units">
                      {Number(booking.courts) || 1} court
                      {(Number(booking.courts) || 1) > 1 ? 's' : ''} booked
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
          <p className="courts-next">
            {nextBooking
              ? `Next booking: ${formatHourLabel(
                  Number(nextBooking.time.split(':')[0])
                )} · ${nextBooking.name} · ${getReference(nextBooking)}`
              : 'No more bookings scheduled for this day.'}
          </p>
        </section>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            Active ({activeBookings.length})
          </button>
          <button
            className={`admin-tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            History ({historyBookings.length})
          </button>
        </div>
      </div>

      <main className="container">
        {error && (
          <div className="admin-empty">
            <p>Failed to load bookings: {error}</p>
          </div>
        )}
        {!error && loading ? (
          <div className="admin-empty">
            <p>Loading bookings…</p>
          </div>
        ) : tab === 'active' ? (
          activeBookings.length === 0 ? (
            <div className="admin-empty">
              <p>No upcoming bookings yet. New reservations will appear here.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Courts</th>
                    <th>Status</th>
                    <th>Booked</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBookings
                    .slice()
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((booking, index) => (
                      <tr key={booking.id}>
                        <td>{index + 1}</td>
                        <td>{booking.name}</td>
                        <td>{booking.contact}</td>
                        <td>{getReference(booking)}</td>
                        <td>{formatDate(booking.date)}</td>
                        <td>{formatTime(booking.time)}</td>
                        <td>{formatDuration(booking.duration)}</td>
                        <td>{formatCourts(booking.courts)}</td>
                        <td>
                          <StatusBadge status={booking.status} />
                        </td>
                        <td>{formatCreatedAt(booking.createdAt)}</td>
                        <td className="table-actions">
                          <button
                            className="btn-action btn-confirm"
                            onClick={() => toggleConfirm(booking)}
                          >
                            {booking.status === 'Confirmed'
                              ? 'Unconfirm'
                              : 'Confirm'}
                          </button>
                          <button
                            className="btn-action btn-archive"
                            onClick={() => archive(booking)}
                          >
                            Archive
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => remove(booking)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        ) : historyBookings.length === 0 ? (
          <div className="admin-empty">
            <p>Nothing recorded yet. Past, archived and deleted bookings appear here automatically.</p>
          </div>
        ) : (
          <div className="admin-archive">
            {Array.from(
              historyBookings.reduce((groups, booking) => {
                const day = booking.date
                if (!groups.has(day)) groups.set(day, [])
                groups.get(day).push(booking)
                return groups
              }, new Map())
            ).map(([day, dayBookings]) => (
              <div key={day} className="admin-day-group">
                <h3 className="admin-day-title">
                  {formatDate(day)}
                  <span className="admin-day-count">
                    {dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}
                  </span>
                </h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Reference</th>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Courts</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>{booking.name}</td>
                          <td>{booking.contact}</td>
                          <td>{getReference(booking)}</td>
                          <td>{formatTime(booking.time)}</td>
                          <td>{formatDuration(booking.duration)}</td>
                          <td>{formatCourts(booking.courts)}</td>
                          <td>
                            {booking.deletedAt ? (
                              <span className="status-badge status-deleted">
                                Deleted
                              </span>
                            ) : (
                              <StatusBadge status={booking.status} />
                            )}
                          </td>
                          <td className="table-actions">
                            {(booking.status === 'Archived' || booking.deletedAt) && (
                              <button
                                className="btn-action btn-restore"
                                onClick={() => restore(booking)}
                              >
                                Restore
                              </button>
                            )}
                            {!booking.deletedAt && (
                              <button
                                className="btn-action btn-delete"
                                onClick={() => remove(booking)}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Admin