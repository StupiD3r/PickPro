import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const refs = process.argv.slice(2)
if (!refs.length) {
  console.error('usage: node scripts/cleanup.mjs PB-260821-XXXX [more refs]')
  process.exit(1)
}

const { data, error } = await supabase
  .from('bookings')
  .delete()
  .in('reference', refs)
  .select('reference')

if (error) {
  console.error('cleanup failed:', error.message)
  process.exit(1)
}
console.log('physically removed:', data.map((r) => r.reference).join(', ') || '(none)')
