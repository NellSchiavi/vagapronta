import { Settings } from 'lucide-react'
import { Footer } from '@/components/brand/footer'
import { SiteHeader } from '@/components/brand/site-header'
import { EmptyState } from '@/components/brand/empty-state'

/** Mostrada quando o .env.local ainda não foi preenchido */
export function SetupMissingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="page-container flex flex-1 items-center py-12">
        <EmptyState
          className="mx-auto w-full max-w-xl"
          icon={Settings}
          title="Falta conectar o Supabase"
          description={
            <>
              Copie o arquivo <code className="rounded bg-track px-1">.env.example</code> para{' '}
              <code className="rounded bg-track px-1">.env.local</code>, preencha a URL e a chave pública do Supabase e
              reinicie o <code className="rounded bg-track px-1">npm run dev</code>. O passo a passo está no README.
            </>
          }
        />
      </main>
      <Footer />
    </div>
  )
}
