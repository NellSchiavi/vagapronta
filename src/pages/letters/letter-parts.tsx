import { useId, useLayoutEffect, useRef } from 'react'
import { PencilLine } from 'lucide-react'
import { GapText } from '@/components/ai/gap-text'
import type { LetterPdfData } from '@/components/pdf/letter-pdf'
import { useProfile } from '@/lib/profile'
import { countGaps, hasGaps } from '@/lib/gaps'
import { useResumes } from '@/lib/queries/resumes'
import { TONE_HELP, TONE_LABEL, type LetterTone } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Dados do remetente (nome, cargo, contato) para a folha e o PDF */
export function useSender() {
  const { data: profile } = useProfile()
  const { data: resumes } = useResumes()
  const principal = resumes?.find((r) => r.is_principal) ?? resumes?.[0]
  const c = principal?.content.sections?.contato ?? {}
  return {
    name: profile?.full_name?.trim() || 'Seu nome',
    role: profile?.desired_role ?? undefined,
    contact: [c.email || profile?.email, c.telefone, c.linkedin].filter(Boolean) as string[],
    place: c.cidade || profile?.city || undefined,
  }
}

export function pdfData(sender: ReturnType<typeof useSender>, body: string, company?: string | null): LetterPdfData {
  return {
    ...sender,
    date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
    recipient: company ? `Para: ${company}` : undefined,
    body,
  }
}

/** Escolha do tom: formal, caloroso ou direto */
export function ToneSelector({ value, onChange }: { value: LetterTone; onChange: (t: LetterTone) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Tom da carta</legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(['formal', 'caloroso', 'direto'] as const).map((t) => (
          <label
            key={t}
            className={cn(
              'flex min-h-touch cursor-pointer flex-col rounded-card-sm border bg-card px-3.5 py-2.5 transition-colors',
              'focus-within:ring-2 focus-within:ring-terra/40',
              value === t ? 'border-terra bg-terra-soft/50' : 'border-line-strong hover:border-terra/60',
            )}
          >
            <input type="radio" name="tone" value={t} checked={value === t} onChange={() => onChange(t)} className="sr-only" />
            <span className="font-medium">{TONE_LABEL[t]}</span>
            <span className="text-[13px] leading-snug text-muted">{TONE_HELP[t]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface SheetProps {
  value: string
  onChange: (v: string) => void
  sender: ReturnType<typeof useSender>
  company?: string | null
}

/**
 * A carta como uma folha de papel: cabeçalho com nome e contato,
 * e o texto em Fraunces, editável direto na tela.
 */
export function LetterSheet({ value, onChange, sender, company }: SheetProps) {
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 4}px`
  }, [value])
  const date = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="rounded-card border border-line bg-card shadow-soft">
      <div className="px-5 pb-4 pt-6 sm:px-10 sm:pt-9">
        <p className="font-serif text-[26px] font-medium leading-tight">{sender.name}</p>
        {sender.role && <p className="mt-0.5 text-sm text-muted">{sender.role}</p>}
        {sender.contact.length > 0 && <p className="mt-1.5 break-words text-[13px] text-muted">{sender.contact.join('  ·  ')}</p>}
        <div className="mt-4 h-0.5 w-12 bg-terra" aria-hidden />
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-[13px] text-muted">
          <span>{company ? `Para: ${company}` : ''}</span>
          <span>{[sender.place, date].filter(Boolean).join(', ')}</span>
        </div>
      </div>
      <div className="px-3 pb-6 sm:px-8 sm:pb-9">
        <label htmlFor={id} className="sr-only">
          Texto da carta
        </label>
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
          lang="pt-BR"
          className="block w-full resize-none overflow-hidden rounded-field border border-transparent bg-transparent px-2 py-2 font-serif text-[17px] leading-[1.7] text-ink transition-colors hover:border-line focus-visible:border-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/25"
        />
        <p className="mt-1 flex items-center gap-1.5 px-2 text-[13px] text-muted">
          <PencilLine className="size-3.5" aria-hidden /> Toque no texto para editar.
        </p>
      </div>
    </div>
  )
}

/** Aviso de lacunas na carta (não dá para baixar o PDF com lacunas) */
export function LetterGapsNotice({ text }: { text: string }) {
  if (!hasGaps(text)) return null
  const n = countGaps(text)
  const lines = text.split('\n').filter((l) => hasGaps(l))
  return (
    <div role="status" className="rounded-card-sm border border-warn/30 bg-warn-soft/60 p-4 text-sm">
      <p className="font-medium text-warn">
        {n === 1 ? 'Há 1 lacuna' : `Há ${n} lacunas`} entre colchetes para completar com o seu dado real
      </p>
      <ul className="mt-2 space-y-1.5">
        {lines.slice(0, 4).map((l, i) => (
          <li key={i} className="font-serif text-[15px] leading-relaxed">
            <GapText text={l.trim()} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-ink/75">Edite no texto da carta. O PDF fica disponível quando não houver mais lacunas.</p>
    </div>
  )
}
