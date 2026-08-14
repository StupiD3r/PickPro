import { useEffect, useState } from 'react'
import {
  getBookings,
  getReference,
  updateBookingStatus,
  archiveBooking,
  deleteBooking,
} from '../store/bookings'

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
  const [bookings, setBookings] = useState(getBookings())

  useEffect(() => {
    const refresh = () => setBookings(getBookings())
    window.addEventListener('bookings-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('bookings-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return bookings
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

function Admin() {
  const bookings = useBookings()
  const [tab, setTab] = useState('active')

  const activeBookings = bookings.filter((b) => b.status !== 'Archived')
  const archivedBookings = bookings
    .filter((b) => b.status === 'Archived')
    .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))

  const pendingCount = activeBookings.filter((b) => b.status === 'Pending').length

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
            {activeBookings.length} active · {archivedBookings.length} archived ·{' '}
            {pendingCount} pending
          </p>
        </div>
      </header>

      <div className="container">
        <div className="admin-tabs">
          <button
            className={`admin-tab ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            Active ({activeBookings.length})
          </button>
          <button
            className={`admin-tab ${tab === 'archive' ? 'active' : ''}`}
            onClick={() => setTab('archive')}
          >
            Archive ({archivedBookings.length})
          </button>
        </div>
      </div>

      <main className="container">
        {tab === 'active' ? (
          activeBookings.length === 0 ? (
            <div className="admin-empty">
              <p>No active bookings yet. Bookings will appear here once confirmed.</p>
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
                            onClick={() =>
                              updateBookingStatus(
                                booking.id,
                                booking.status === 'Confirmed'
                                  ? 'Pending'
                                  : 'Confirmed'
                              )
                            }
                          >
                            {booking.status === 'Confirmed'
                              ? 'Unconfirm'
                              : 'Confirm'}
                          </button>
                          <button
                            className="btn-action btn-archive"
                            onClick={() => archiveBooking(booking.id)}
                          >
                            Archive
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => deleteBooking(booking.id)}
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
        ) : archivedBookings.length === 0 ? (
          <div className="admin-empty">
            <p>No archived bookings yet. Archived or completed bookings appear here.</p>
          </div>
        ) : (
          <div className="admin-archive">
            {Array.from(
              archivedBookings.reduce((groups, booking) => {
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
                          <td className="table-actions">
                            <button
                              className="btn-action btn-restore"
                              onClick={() =>
                                updateBookingStatus(booking.id, 'Pending')
                              }
                            >
                              Restore
                            </button>
                            <button
                              className="btn-action btn-delete"
                              onClick={() => deleteBooking(booking.id)}
                            >
                              Delete
                            </button>
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