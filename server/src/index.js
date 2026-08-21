import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bookingsRouter from './routes/bookings.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/bookings', bookingsRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  if (res.headersSent) return next(err)
  res.status(err.type === 'entity.parse.failed' ? 400 : 500).json({
    error:
      err.type === 'entity.parse.failed'
        ? 'Invalid JSON body'
        : 'Internal server error',
  })
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`PicklePro API listening on http://localhost:${port}`)
})
