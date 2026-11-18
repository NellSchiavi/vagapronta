import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KanbanSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button, type ButtonProps } from '@/components/ui/button'
import { friendlyDataError } from '@/lib/errors'
import { addApplicationForJob } from '@/lib/queries/applications'

interface Props extends Omit<ButtonProps, 'onClick'> {
  jobId: string | null
  resumeId?: string | null
  letterId?: string | null
  /** quando não há vaga salva: preenche o formulário com o que se sabe */
  fallback?: { company?: string; role?: string }
  label?: string
}

/**
 * "Adicionar às candidaturas": cria (ou completa) a candidatura com o que o
 * app já sabe — empresa, cargo, link, versão do currículo e carta.
 */
export function AddToApplicationsButton({ jobId, resumeId, letterId, fallback, label = 'Adicionar às candidaturas', ...btn }: Props) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!jobId) {
      const q = new URLSearchParams({ nova: '1' })
      if (fallback?.company) q.set('empresa', fallback.company)
      if (fallback?.role) q.set('cargo', fallback.role)
      if (letterId) q.set('carta', letterId)
      if (resumeId) q.set('curriculo', resumeId)
      navigate(`/candidaturas?${q.toString()}`)
      return
    }
    setBusy(true)
    try {
      const { id, created } = await addApplicationForJob({ jobId, resumeId, letterId })
      toast.success(created ? 'Adicionada às candidaturas, em Preparação.' : 'A candidatura desta vaga foi atualizada.', {
        action: { label: 'Ver', onClick: () => navigate(`/candidaturas?id=${id}`) },
      })
    } catch (e) {
      toast.error(friendlyDataError(e, 'Não conseguimos adicionar às candidaturas.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button onClick={add} loading={busy} {...btn}>
      {!busy && <KanbanSquare aria-hidden />} {label}
    </Button>
  )
}
