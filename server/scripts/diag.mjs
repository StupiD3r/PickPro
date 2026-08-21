import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

console.log('URL host:', new URL(process.env.SUPABASE_URL).host)

const { data: tables, error: tErr } = await supabase
  .from('bookings')
  .select('id')
  .limit(1)
console.log('table check:', tErr ? `ERROR ${tErr.message}` : 'OK')

const { data, error } = await supabase.rpc('create_booking', {
  p_name: 'Diag Test',
  p_contact: '09171234567',
  p_date: '2026-08-22',
  p_start_hour: 10,
  p_duration: 1,
  p_courts: 1,
})

if (error) {
  console.log('RPC ERROR code:', error.code)
  console.log('RPC ERROR message:', error.message)
  console.log('RPC ERROR details:', error.details)
  console.log('RPC ERROR hint:', error.hint)
} else {
  console.log('RPC SUCCESS:', JSON.stringify(data, null, 2))
}
