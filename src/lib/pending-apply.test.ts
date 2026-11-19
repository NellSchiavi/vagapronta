import { afterEach, describe, expect, it } from 'vitest'
import { clearPendingApply, getPendingApply, MIN_AWAY_MS, setPendingApply, shouldAsk } from './pending-apply'

const base = { applicationId: 'a1', title: 'Biomédica', company: 'Lab X', openedAt: 1_000_000 }

describe('candidatura aberta no site da vaga', () => {
  afterEach(() => clearPendingApply())

  it('só pergunta depois que a pessoa ficou um tempo fora do app', () => {
    setPendingApply(base)
    const p = getPendingApply(base.openedAt + 100)
    expect(shouldAsk(p, base.openedAt + 100)).toBe(false)
    expect(shouldAsk(p, base.openedAt + MIN_AWAY_MS)).toBe(true)
  })

  it('depois de respondida (limpa), não pergunta de novo', () => {
    setPendingApply(base)
    clearPendingApply()
    expect(getPendingApply(base.openedAt + 5000)).toBeNull()
  })

  it('esquece aberturas muito antigas', () => {
    setPendingApply(base)
    expect(getPendingApply(base.openedAt + 13 * 3600_000)).toBeNull()
  })
})
