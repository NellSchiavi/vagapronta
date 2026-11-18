/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** opcional: "auto" ou URL do Supabase para quem abre o app pelo IP do PC */
  readonly VITE_SUPABASE_URL_REDE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
