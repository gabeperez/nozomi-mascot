import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Mascot } from 'page-mascot'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { TESTNET_CHAIN_ID } from '../server/testnet-policy'
import './style.css'

const packageId = '0x9151f1c9470a02c143153c0cee3daf76085657f14eb79290b00aa2d0fe9fe907'
const assetBase = '../mascots/'

function App() {
  const [status, setStatus] = useState('Ready to check the deployed contract directly on Sui testnet.')
  const [busy, setBusy] = useState(false)
  async function verify() {
    setBusy(true)
    setStatus('Reading Sui testnet…')
    try {
      const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })
      const { response } = await client.ledgerService.getServiceInfo({})
      if (response.chainId !== TESTNET_CHAIN_ID) throw new Error('Unexpected network. Check stopped.')
      const { object } = await client.getObject({ objectId: packageId })
      if (object.type !== 'package') throw new Error('Expected a Move package.')
      const { response: result } = await client.movePackageService.getDatatype({ packageId, moduleName: 'unlock', name: 'Registry' })
      if (!result.datatype) throw new Error('Unlock registry type was not found.')
      setStatus(`Verified on Sui testnet: unlock contract version ${object.version}. Registry type found. No transaction was sent.`)
    } catch (error) {
      setStatus(`Unable to verify right now. ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally { setBusy(false) }
  }
  return <main>
    <header><a href="../">NOZOMI</a><span className="badge">TESTNET LAB</span></header>
    <section className="hero"><div className="mascot"><Mascot directions={assetBase+'nozomi-directions.webp'} reactions={assetBase+'nozomi-reactions.webp'} size={240} label="testnet sample robot"/></div><p className="eyebrow">A LITTLE LIFE, ON SUI</p><h1>The next chapter<br/>starts here.</h1><p>Meet the sample companion and explore our deployed testnet contract.</p></section>
    <section className="panel"><h2>Our export-unlock contract</h2><p>Published on Sui testnet. Local source verification and eight Move unit tests passed.</p><code>{packageId}</code><button onClick={verify} disabled={busy}>{busy ? 'Checking testnet…' : 'Verify live contract'}</button><p className="status" role="status">{status}</p></section>
    <section className="next"><h2>What’s available here</h2><p>The sample mascot follows your cursor and reacts to clicks. The live check above reads the deployed contract directly from Sui.</p><h2>Still being built</h2><p>Wallet connection, test NFT selection, generation, and paid export downloads are not enabled yet. No NFT registry has been configured. This sample is not an ownership-verified NFT.</p><p className="flow">Connect wallet → Choose NFT → Preview → Unlock exports</p></section>
    <footer><a href="https://github.com/gabeperez/nozomi-mascot/tree/main/contracts/nozomi-unlock">Contract source & development notes ↗</a><a href="../">Back to demo</a></footer>
  </main>
}
createRoot(document.getElementById('root')!).render(<App/>)
