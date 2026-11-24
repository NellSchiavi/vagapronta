import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { Footer } from '@/components/brand/footer'
import { ThemeToggle } from '@/components/brand/theme-toggle'
import { LinkedInIcon } from '@/components/brand/linkedin-icon'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { friendlyAuthError } from '@/lib/errors'
import { appUrl, supabase } from '@/lib/supabase'
import { EmailLoginForm } from './EmailLoginForm'
import { EmailSentCard } from './EmailSentCard'
import { LoginShowcase } from './LoginShowcase'

type Mode = 'choose' | 'email' | 'sent'

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

export function LoginPage() {
  const { authError, clearAuthError } = useAuth()
  const [mode, setMode] = useState<Mode>('choose')
  const [email, setEmail] = useState('')
  const [linkedinLoading, setLinkedinLoading] = useState(false)

  async function signInWithLinkedIn() {
    setLinkedinLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: appUrl() },
    })
    if (error) {
      setLinkedinLoading(false)
      toast.error(friendlyAuthError(error))
    }
    // sem erro, o navegador vai para o LinkedIn
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Coluna da esquerda: marca, mensagem e botões */}
        <div className="flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex min-h-16 items-center justify-between px-4 py-4 sm:px-6 lg:px-12">
            <Logo size={32} />
            <ThemeToggle />
          </div>

          <main className="flex flex-1 items-center px-4 pb-12 pt-6 sm:px-6 lg:px-12">
            <div className="w-full max-w-[420px]">
              <h1 className="text-[32px] leading-[1.15] sm:text-[40px]">
                Seu próximo emprego começa com um bom currículo.
              </h1>
              <p className="mt-3 text-[17px] text-muted">
                Analise, adapte para cada vaga e acompanhe tudo num só lugar.
              </p>

              {authError && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-card-sm border border-danger/30 bg-danger-soft p-4 text-sm text-ink"
                >
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
                  <p className="flex-1">{authError}</p>
                  <button
                    type="button"
                    onClick={clearAuthError}
                    className="-m-2 inline-flex size-9 items-center justify-center rounded-field text-muted hover:text-ink"
                    aria-label="Fechar aviso"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              )}

              <div className="mt-8">
                <AnimatePresence mode="wait" initial={false}>
                  {mode === 'choose' && (
                    <motion.div key="choose" {...fade} className="flex flex-col gap-4">
                      <Button variant="linkedin" size="lg" block loading={linkedinLoading} onClick={signInWithLinkedIn}>
                        {!linkedinLoading && <LinkedInIcon className="size-5" />}
                        Entrar com LinkedIn
                      </Button>

                      <div className="flex items-center gap-3 text-sm text-muted" role="separator" aria-label="ou">
                        <span className="h-px flex-1 bg-line" />
                        ou
                        <span className="h-px flex-1 bg-line" />
                      </div>

                      <Button variant="secondary" size="lg" block onClick={() => setMode('email')}>
                        <Mail className="text-terra" aria-hidden />
                        Entrar com e-mail
                      </Button>
                    </motion.div>
                  )}

                  {mode === 'email' && (
                    <motion.div key="email" {...fade}>
                      <EmailLoginForm
                        defaultEmail={email}
                        onBack={() => setMode('choose')}
                        onSent={(e) => {
                          setEmail(e)
                          setMode('sent')
                        }}
                      />
                    </motion.div>
                  )}

                  {mode === 'sent' && (
                    <motion.div key="sent" {...fade}>
                      <EmailSentCard email={email} onChangeEmail={() => setMode('email')} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-8 text-[13px] text-muted">
                Ao entrar, você cria sua conta automaticamente. Seus dados ficam só com você.
              </p>
            </div>
          </main>
        </div>

        {/* Coluna da direita: ilustração (some no celular) */}
        <LoginShowcase />
      </div>

      <Footer className="lg:[&>p]:mx-0 lg:[&>p]:max-w-none lg:[&>p]:px-12" />
    </div>
  )
}
