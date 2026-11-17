import { cn } from '@/lib/utils'

/**
 * Rodapé presente em todas as páginas (inclusive no login).
 * Usa o mesmo container do header e do conteúdo, alinhado em todas as larguras.
 * No celular, o layout com menu inferior adiciona espaço abaixo
 * para que o rodapé nunca fique coberto.
 */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-auto w-full border-t border-line', className)}>
      <p className="page-container py-5 text-footer text-muted">
        © 2026 NS <span className="text-terra">|</span>{' '}
        <a
          href="https://nellschiavi.github.io/NS-Solucoes-Digitais/contato/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-[3px] hover:text-ink"
        >
          Nelson Schiavi
        </a>{' '}
        Soluções Digitais.
      </p>
    </footer>
  )
}
