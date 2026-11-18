import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, LogOut, Moon, Sun, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { invokeAi } from '@/lib/ai'
import { useAuth } from '@/lib/auth'
import { exportMyData } from '@/lib/export-data'
import { useTheme } from '@/lib/theme'
import { SectionCard, SwitchRow, type SaveState } from './profile-ui'
import type { ProfileDraft } from './sections'

export function NotificationsSection({ d, set, status }: { d: ProfileDraft; set: (p: Partial<ProfileDraft>) => void; status: SaveState }) {
  return (
    <SectionCard id="notificacoes" title="Notificações" description="O envio por e-mail começa junto com a busca diária de vagas." status={status}>
      <SwitchRow
        id="notif-vagas"
        label="Resumo diário de vagas por e-mail"
        help="Um e-mail por dia com as vagas mais compatíveis."
        checked={d.notify_daily_jobs}
        onChange={(notify_daily_jobs) => set({ notify_daily_jobs })}
      />
      <SwitchRow
        id="notif-retorno"
        label="Lembretes de retorno"
        help="Avisamos no dia de dar um retorno a uma empresa."
        checked={d.notify_follow_up}
        onChange={(notify_follow_up) => set({ notify_follow_up })}
      />
    </SectionCard>
  )
}

export function AccountSection() {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function doExport() {
    setExporting(true)
    try {
      await exportMyData(user!.id)
      toast.success('Seus dados foram baixados.')
    } catch {
      toast.error('Não conseguimos gerar o arquivo agora. Tente de novo.')
    } finally {
      setExporting(false)
    }
  }

  async function doDelete() {
    setDeleting(true)
    try {
      await invokeAi('excluir-conta', { confirm: typed.trim().toUpperCase() })
      await signOut()
      navigate('/entrar', { replace: true })
      toast.success('Sua conta e todos os seus dados foram excluídos.')
    } catch (e) {
      toast.error((e as Error).message)
      setDeleting(false)
    }
  }

  return (
    <SectionCard id="conta" title="Conta">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={toggle}>
          {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          {theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
        </Button>
        <Button variant="secondary" onClick={() => signOut()}>
          <LogOut aria-hidden /> Sair
        </Button>
        <Button variant="secondary" onClick={doExport} loading={exporting}>
          {!exporting && <Download aria-hidden />} Baixar meus dados
        </Button>
      </div>
      <div className="rounded-card-sm border border-danger/25 bg-danger-soft/50 p-4">
        <p className="font-medium">Excluir minha conta</p>
        <p className="mt-0.5 text-sm text-ink/80">Apaga para sempre seus currículos, cartas, vagas, candidaturas, foto e arquivos. Não dá para desfazer.</p>
        <Button variant="ghost" className="mt-2 -ml-3 text-danger hover:text-danger" onClick={() => setConfirmOpen(true)}>
          <Trash2 aria-hidden /> Excluir minha conta…
        </Button>
      </div>

      <Sheet open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setTyped('') }}>
        <SheetContent
          title="Excluir sua conta?"
          description="Tudo será apagado para sempre."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={doDelete} loading={deleting} disabled={typed.trim().toUpperCase() !== 'EXCLUIR'}>
                Excluir para sempre
              </Button>
            </div>
          }
        >
          <p className="text-[15px]">
            Se quiser guardar uma cópia, use antes <strong className="font-medium">Baixar meus dados</strong>.
          </p>
          <Field label="Para confirmar, digite EXCLUIR" htmlFor="confirm-excluir" className="mt-4">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
          </Field>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}
