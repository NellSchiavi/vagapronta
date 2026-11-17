import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Digite seu nome para a gente saber como te chamar.').max(120, 'Use no máximo 120 letras.'),
  desired_role: z
    .string()
    .trim()
    .min(2, 'Conte qual cargo você procura. Ex.: Analista de RH.')
    .max(120, 'Use no máximo 120 letras.'),
  city: z.string().trim().min(2, 'Digite sua cidade. Ex.: São Paulo, SP.').max(120, 'Use no máximo 120 letras.'),
})
export type AboutValues = z.infer<typeof schema>

interface Props {
  defaultValues: AboutValues
  onChange: (v: AboutValues) => void
  onSubmit: (v: AboutValues) => Promise<void>
}

export function AboutStep({ defaultValues, onChange, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AboutValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })

  // salva o rascunho enquanto a pessoa digita
  useEffect(() => {
    const sub = watch((v) => onChange({ full_name: v.full_name ?? '', desired_role: v.desired_role ?? '', city: v.city ?? '' }))
    return () => sub.unsubscribe()
  }, [watch, onChange])

  return (
    <Card className="p-5 sm:p-8">
      <h1 id="onboarding-title" className="text-[28px] leading-tight sm:text-[32px]">
        Que bom ter você aqui!
      </h1>
      <p className="mt-2 text-muted">Confirme alguns dados para a gente encontrar as vagas certas para você.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-5">
        <Field label="Seu nome" htmlFor="ob-name" error={errors.full_name?.message}>
          <Input autoComplete="name" placeholder="Ex.: Maria Silva" {...register('full_name')} />
        </Field>
        <Field
          label="Cargo que você procura"
          htmlFor="ob-role"
          hint="Pode ser mais de um, separados por vírgula."
          error={errors.desired_role?.message}
        >
          <Input autoComplete="organization-title" placeholder="Ex.: Analista de RH, Assistente administrativo" {...register('desired_role')} />
        </Field>
        <Field label="Sua cidade" htmlFor="ob-city" error={errors.city?.message}>
          <Input autoComplete="address-level2" placeholder="Ex.: Campinas, SP" {...register('city')} />
        </Field>

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 sm:self-end">
          Continuar {!isSubmitting && <ArrowRight aria-hidden />}
        </Button>
      </form>
    </Card>
  )
}
