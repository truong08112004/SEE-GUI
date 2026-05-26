export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (url && key) {
    return { url, key }
  }
  return null
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null
}
