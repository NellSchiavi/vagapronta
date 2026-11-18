import { useId } from 'react'
import { PencilLine } from 'lucide-react'
import { Textarea } from '@/components/ui/input'
import { hasGaps, splitGaps } from '@/lib/gaps'

/** Texto com as lacunas ([X], [número…]) destacadas em amarelo suave */
export function GapText({ text }: { text: string }) {
  return (
    <>
      {splitGaps(text).map((p, i) =>
        p.gap ? (
          <mark key={i} className="rounded-[4px] bg-warn-soft px-1 font-medium text-warn">
            {p.text}
            <span className="sr-only"> (lacuna para completar)</span>
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

/**
 * Quando a sugestão tem lacunas: mostra a dica e um campo para completar.
 * Quem usa só deve permitir aplicar quando hasGaps(value) for falso.
 */
export function GapEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId()
  const pending = hasGaps(value)
  return (
    <div className="mt-3 rounded-[10px] border border-warn/30 bg-warn-soft/60 p-3">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-warn">
        <PencilLine className="size-4" aria-hidden /> Complete com o seu número real
      </label>
      <p className="mt-0.5 text-[13px] text-ink/75">
        Troque o que está entre colchetes pelo seu dado verdadeiro, ou apague esse trecho se não souber.
      </p>
      <Textarea
        id={id}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 bg-card text-sm"
        aria-invalid={pending || undefined}
      />
      <p className="mt-1.5 text-[13px] text-warn" aria-live="polite">
        {pending ? 'Ainda há lacunas entre colchetes para completar.' : 'Pronto! Agora você já pode aplicar.'}
      </p>
    </div>
  )
}
