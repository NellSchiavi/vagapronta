import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { friendlyAuthError } from '@/lib/errors'
import { appUrl, supabase } from '@/lib/supabase'

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Digite seu e-mail para receber o link.')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Esse e-mail parece incompleto. Confira e tente de novo.'),
})
type FormValues = z.infer<typeof schema>

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: appUrl(), shouldCreateUser: true },
  })
  if (error) throw error
}

interface Props {
  defaultEmail?: string
  onBack: () => void
  onSent: (email: string) => void
}

export function EmailLoginForm({ defaultEmail = '', onBack, onSent }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  async function onSubmit({ email }: FormValues) {
    try {
      await sendMagicLink(email)
      onSent(email)
    } catch (err) {
      toast.error(friendlyAuthError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Field label="Seu e-mail" htmlFor="login-email" error={errors.email?.message}>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="voce@example.com"
          autoFocus
          className="min-h-[48px]"
          {...register('email')}
        />
      </Field>

      <Button type="submit" size="lg" block loading={isSubmitting}>
        {!isSubmitting && <Send aria-hidden />}
        Enviar link de acesso
      </Button>

      <Button type="button" variant="ghost" onClick={onBack} className="self-center text-muted">
        <ArrowLeft aria-hidden />
        Voltar
      </Button>
    </form>
  )
}
