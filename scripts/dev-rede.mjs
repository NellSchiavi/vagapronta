/**
 * npm run dev:rede
 * Sobe o app aberto para a rede de casa (Wi-Fi) e mostra os endereços
 * para abrir no celular. Uso apenas em rede doméstica de confiança.
 */
import { spawn } from 'node:child_process'
import os from 'node:os'

const PORT = 5173

/** IPs IPv4 da máquina, com as redes domésticas (192.168.x.x) primeiro */
function lanAddresses() {
  const list = []
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue
      // ignora redes virtuais do WSL/Hyper-V/Docker
      if (/vEthernet|WSL|Hyper-V|Docker|VirtualBox|VMware/i.test(name)) continue
      list.push({ name, address: a.address })
    }
  }
  const score = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2)
  return list.sort((a, b) => score(a.address) - score(b.address))
}

const ips = lanAddresses()
const line = '─'.repeat(60)
console.log(`\n${line}`)
if (!ips.length) {
  console.log('  Não encontrei o PC numa rede. Confira se o Wi-Fi está conectado.')
} else {
  const main = ips[0].address
  console.log('  VagaPronta na rede de casa\n')
  console.log(`  📱 Abra no celular:        http://${main}:${PORT}`)
  console.log(`  ✉️  Códigos de acesso (PC): http://${main}:54324`)
  if (ips.length > 1) {
    console.log('\n  Outros endereços deste PC (use se o de cima não abrir):')
    for (const ip of ips.slice(1)) console.log(`     http://${ip.address}:${PORT}   (${ip.name})`)
  }
  console.log('\n  O celular precisa estar no MESMO Wi-Fi do computador.')
  console.log('  Dúvidas: README → "Testar no celular".')
}
console.log(`${line}\n`)

const child = spawn(`npx vite --host 0.0.0.0 --port ${PORT} --strictPort`, {
  stdio: 'inherit',
  shell: true,
})
child.on('exit', (code) => process.exit(code ?? 0))
