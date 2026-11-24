/** Traduz erros técnicos em mensagens que dizem o que fazer */
export function friendlyAuthError(error: unknown): string {
  const e = error as { message?: string; status?: number; code?: string } | undefined
  const msg = (e?.message ?? String(error ?? '')).toLowerCase()
  const code = e?.code ?? ''

  if (e?.status === 429 || code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('security purposes'))
    return 'Você pediu vários links seguidos. Espere um minuto e tente de novo.'
  if (code === 'otp_expired' || msg.includes('expired') || (msg.includes('invalid') && msg.includes('token')))
    return 'Código incorreto ou vencido. Confira o e-mail mais recente e tente de novo.'
  if (msg.includes('signups not allowed') || code === 'signup_disabled')
    return 'Novos cadastros estão desligados no momento. Fale com o Nelson.'
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider'))
    return 'O login com LinkedIn está indisponível agora. Use o e-mail e tente o LinkedIn mais tarde.'
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed'))
    return 'Sem conexão com o servidor. Confira sua internet e tente de novo.'
  if (msg.includes('access_denied') || msg.includes('user cancelled') || msg.includes('canceled'))
    return 'O login foi cancelado. Quando quiser, é só tentar de novo.'
  return 'Algo não saiu como esperado. Tente de novo em instantes.'
}

export function friendlyDataError(error: unknown, fallback = 'Não conseguimos salvar agora.'): string {
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase()
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return 'Sem conexão com o servidor. Confira sua internet e tente de novo.'
  if (msg.includes('jwt') || msg.includes('not authenticated'))
    return 'Sua sessão expirou. Entre de novo para continuar.'
  return `${fallback} Tente de novo em instantes.`
}
