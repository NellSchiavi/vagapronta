import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { friendlyAuthError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { sendMagicLink } from './EmailLoginForm'

const RESEND_SECONDS = 60
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

export function EmailSentCard({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string>()
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [secondsLeft])

  async function resend() {
    setResending(true)
    try {
      await sendMagicLink(email)
      toast.success('Enviamos um novo link.', { description: 'Use sempre o e-mail mais recente.' })
      setSecondsLeft(RESEND_SECONDS)
    } catch (err) {
      toast.error(friendlyAuthError(err))
    } finally {
      setResending(false)
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    const token = code.replace(/\D/g, '')
    if (token.length !== 6) {
      setCodeError('O código tem 6 números. Confira no e-mail e digite de novo.')
      return
    }
    setCodeError(undefined)
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setVerifying(false)
    if (error) setCodeError(friendlyAuthError(error))
    // com sucesso, a sessão muda e o app segue sozinho para a próxima tela
  }

  const mm = Math.floor(secondsLeft / 60)
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-5">
      <div role="status" className="rounded-card border border-success/25 bg-success-soft p-5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="size-6 text-success" aria-hidden />
          <h2 className="font-serif text-xl">Link enviado</h2>
        </div>
        <p className="mt-2 text-ink">
          Enviamos um link de acesso para <strong className="font-medium break-all">{email}</strong>. Abra seu e-mail
          e toque em <span className="font-medium">“Entrar no VagaPronta”</span>.
        </p>
        <p className="mt-2 text-sm text-muted">Não chegou? Olhe também a caixa de spam ou promoções.</p>
        {isLocal && (
          <p className="mt-2 text-sm text-muted">
            Ambiente local: os e-mails chegam em{' '}
            <a href="http://127.0.0.1:54324" target="_blank" rel="noopener noreferrer" className="underline underline-offset-[3px]">
              127.0.0.1:54324
            </a>
            .
          </p>
        )}
      </div>

      <form onSubmit={verifyCode} noValidate className="flex flex-col gap-3">
        <Field
          label="Abriu o e-mail em outro aparelho? Digite o código"
          htmlFor="login-code"
          hint="São 6 números, logo abaixo do botão no e-mail."
          error={codeError}
        >
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-h-[48px] font-serif text-xl tracking-[0.4em]"
          />
        </Field>
        <Button type="submit" variant="secondary" size="lg" block loading={verifying}>
          {!verifying && <KeyRound className="text-terra" aria-hidden />}
          Entrar com o código
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onChangeEmail} className="text-muted">
          Usar outro e-mail
        </Button>
        <Button
          variant="ghost"
          onClick={resend}
          disabled={secondsLeft > 0}
          loading={resending}
          aria-live="polite"
          className="tabular-nums"
        >
          {!resending && <RotateCw aria-hidden />}
          {secondsLeft > 0 ? `Reenviar em ${mm}:${ss}` : 'Reenviar link'}
        </Button>
      </div>
    </div>
  )
}
