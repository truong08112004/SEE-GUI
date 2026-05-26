import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/** Placeholder used only during SSR/build when env vars are not set locally */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co"
const BUILD_PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && key) return { url, key }
  if (typeof window === "undefined") {
    return { url: BUILD_PLACEHOLDER_URL, key: BUILD_PLACEHOLDER_KEY }
  }
  return null
}

export function createClient() {
  const env = getSupabaseEnv()
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local or Vercel project settings.",
    )
  }
  if (!client) {
    client = createBrowserClient<Database>(env.url, env.key)
  }
  return client
}
