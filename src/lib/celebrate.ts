/** Confete discreto nas cores do app (desligado para quem prefere menos movimento) */
export async function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#C2622D', '#2F7D5B', '#2E5E8C', '#F8E6DA']
  const shoot = (x: number, angle: number) =>
    confetti({ particleCount: 45, spread: 60, startVelocity: 38, ticks: 160, gravity: 1.1, scalar: 0.85, origin: { x, y: 0.75 }, angle, colors, disableForReducedMotion: true })
  shoot(0.2, 60)
  shoot(0.8, 120)
}
