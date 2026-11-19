import { useState } from 'react'
import { FileText, Mail, Sparkles, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Footer } from '@/components/brand/footer'
import { SiteHeader } from '@/components/brand/site-header'
import { ScoreRing } from '@/components/brand/score-ring'
import { CompanyInitial, MatchPill, STATUS_ORDER, StatusPill } from '@/components/brand/pills'
import { EmptyState } from '@/components/brand/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { LoadingCards } from '@/components/ui/skeleton'
import { AtsTerm } from '@/components/ui/tooltip'

const SWATCHES = [
  ['bg', 'Fundo creme'],
  ['card', 'Cartões'],
  ['ink', 'Texto principal'],
  ['muted', 'Texto secundário'],
  ['line', 'Bordas'],
  ['line-strong', 'Bordas de campos'],
  ['terra', 'Terracota'],
  ['terra-soft', 'Terracota suave'],
  ['success', 'Sucesso'],
  ['success-soft', 'Sucesso suave'],
  ['info', 'Informação'],
  ['info-soft', 'Informação suave'],
  ['danger', 'Erro'],
] as const

/**
 * Página interna para conferir o design system (Etapa 1).
 * Acesse em /#/estilo. Será substituída pelas telas reais nas próximas etapas.
 */
export function StyleGuidePage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [score, setScore] = useState(72)

  function validate() {
    if (!email.trim()) return setError('Digite seu e-mail para receber o link.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      return setError('Esse e-mail parece incompleto. Confira e tente de novo.')
    setError(undefined)
    toast.success('Tudo certo!', { description: `Validação ok para ${email.trim()}.` })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="page-container flex-1 space-y-10 py-8 sm:py-10">
        <section>
          <p className="text-sm font-medium uppercase tracking-wider text-terra-strong">Guia visual</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Seu próximo emprego começa com um bom currículo.</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Esta página mostra as cores, fontes e componentes que todas as telas do VagaPronta vão usar.
            Experimente o modo escuro no botão da lua.
          </p>
        </section>

        <section aria-labelledby="cores">
          <h2 id="cores" className="mb-4 text-2xl">Cores</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SWATCHES.map(([token, name]) => (
              <div key={token} className="overflow-hidden rounded-card-sm border border-line bg-card">
                <div className="h-14 border-b border-line" style={{ background: `rgb(var(--${token}))` }} />
                <div className="p-2.5">
                  <p className="text-[13px] font-medium">{name}</p>
                  <p className="text-xs text-muted">{token}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="tipo" className="grid gap-4 md:grid-cols-2">
          <h2 id="tipo" className="sr-only">Tipografia</h2>
          <Card>
            <p className="text-xs uppercase tracking-wider text-muted">Fraunces · títulos e cartas</p>
            <p className="mt-2 font-serif text-3xl font-medium">Olá, Nelson!</p>
            <p className="mt-2 font-serif text-lg leading-relaxed">
              Prezada equipe de recrutamento, é com entusiasmo que me candidato à vaga…
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wider text-muted">Inter · interface</p>
            <p className="mt-2 text-[15px]">Texto normal (400) para a interface do dia a dia.</p>
            <p className="mt-1 text-[15px] font-medium">Texto em destaque (500) para rótulos e botões.</p>
            <p className="mt-3 text-sm text-muted">
              Termos técnicos têm explicação: seu currículo passa no <AtsTerm />?
            </p>
          </Card>
        </section>

        <section aria-labelledby="botoes">
          <h2 id="botoes" className="mb-4 text-2xl">Botões</h2>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            <Button>
              <Sparkles aria-hidden /> Adaptar
            </Button>
            <Button variant="secondary">
              <Mail className="text-terra" aria-hidden /> Entrar com e-mail
            </Button>
            <Button variant="soft">Botão suave</Button>
            <Button variant="ghost">
              <Undo2 aria-hidden /> Desfazer
            </Button>
            <Button variant="linkedin">Entrar com LinkedIn</Button>
            <Button loading>Analisando…</Button>
            <Button variant="link" className="min-h-touch px-2">
              Voltar
            </Button>
          </div>
        </section>

        <section aria-labelledby="form" className="grid gap-4 md:grid-cols-2">
          <h2 id="form" className="sr-only">Formulários</h2>
          <Card>
            <CardTitle>Formulário</CardTitle>
            <CardDescription>Validação inline: deixe vazio ou digite um e-mail incompleto.</CardDescription>
            <form
              className="mt-4 space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                validate()
              }}
            >
              <Field label="Seu e-mail" htmlFor="sg-email" error={error}>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Anotações" htmlFor="sg-notes" hint="Salvo automaticamente enquanto você digita.">
                <Textarea rows={3} placeholder="Ex.: falar com a Ana do RH na sexta" />
              </Field>
              <Button type="submit" block>
                Validar
              </Button>
            </form>
          </Card>

          <Card className="flex flex-col items-center justify-center gap-4 text-center">
            <ScoreRing value={score} />
            <div className="w-full max-w-xs space-y-3 text-left">
              <Progress label="Palavras-chave" value={score - 8} showValue />
              <Progress label="Estrutura" value={score + 10} showValue tone="success" />
              <Progress label="Clareza" value={score - 2} showValue tone="info" />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setScore(Math.floor(40 + Math.random() * 60))}>
              Sortear outra nota
            </Button>
          </Card>
        </section>

        <section aria-labelledby="pilulas">
          <h2 id="pilulas" className="mb-4 text-2xl">Pílulas e cartões</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { company: 'Magalu', role: 'Analista de RH jr', place: 'São Paulo · Híbrido', match: 89 },
              { company: 'Nubank', role: 'Assistente administrativo', place: 'Remoto', match: 71 },
            ].map((j) => (
              <Card key={j.company} className="flex items-start gap-3 p-4">
                <CompanyInitial name={j.company} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{j.role}</p>
                  <p className="text-sm text-muted">
                    {j.company} · {j.place}
                  </p>
                </div>
                <MatchPill value={j.match} />
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="estados" className="grid gap-4 md:grid-cols-2">
          <h2 id="estados" className="sr-only">Estados</h2>
          <EmptyState
            icon={FileText}
            title="Envie seu currículo para começar"
            description="Em poucos segundos você recebe uma nota e dicas para melhorar."
            action={<Button>Enviar currículo</Button>}
          />
          <div className="space-y-3">
            <LoadingCards count={2} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => toast.success('Currículo salvo!')}>
                Toast de sucesso
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  toast.error('Não conseguimos ler esse PDF.', {
                    description: 'Tente exportar de novo ou cole o texto.',
                  })
                }
              >
                Toast de erro
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  toast('Sugestão aplicada', { action: { label: 'Desfazer', onClick: () => toast.info('Desfeito') } })
                }
              >
                Toast com desfazer
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
