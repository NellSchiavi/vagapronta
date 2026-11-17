import { cn } from '@/lib/utils'

/**
 * Rodapé presente em todas as páginas (inclusive no login).
 * No celular, o layout com menu inferior adiciona espaço abaixo
 * para que o rodapé nunca fique coberto.
 */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-auto w-full', className)}>
      <div className="border-t border-line" />
      <p className="px-4 py-5 text-center text-footer text-muted">
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
