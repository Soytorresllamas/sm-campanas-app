import { createClient } from '@supabase/supabase-js'

// Proyecto Supabase compartido. La publishable key es de exposición pública por diseño.
// Convivimos con otro proyecto en la misma base: todas nuestras tablas van prefijadas `sm_campanas_`.
const URL = 'https://zrooipzscpkagjdpyxic.supabase.co'
const KEY = 'sb_publishable__6P7PyqfzqJ0ZN9YVYidpg_8BccM_1V'

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false },
})

export const GANTT_TABLE = 'sm_campanas_gantt'
export const GANTT_ROW = 'gantt-26-27'
