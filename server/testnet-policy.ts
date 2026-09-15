import { normalizeSuiAddress, normalizeStructTag } from '@mysten/sui/utils'

// Read-only reference. This is never an eligible testnet collection.
export const MAINNET_PRIME_MACHIN_PACKAGE =
  '0x034c162f6b594cb5a1805264dd01ca5d80ce3eca6522e6ee37fd9ebfb9d3ddca'

export const TESTNET_CHAIN_ID = '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD'

export function testnetPolicy(packageId: string | undefined) {
  if (!packageId || !/^0x[0-9a-fA-F]{64}$/.test(packageId)) {
    throw new Error('Configure a verified testnet package ID before enabling claims')
  }
  const id = normalizeSuiAddress(packageId)
  if (id === MAINNET_PRIME_MACHIN_PACKAGE || /^0x0{64}$/.test(id)) {
    throw new Error('A distinct testnet deployment is required')
  }
  return Object.freeze({
    network: 'testnet' as const,
    walletChain: 'sui:testnet' as const,
    rpc: 'https://fullnode.testnet.sui.io:443',
    chainId: TESTNET_CHAIN_ID,
    collectionType: `${id}::factory::PrimeMachin`,
  })
}

export function assertTestnet(
  walletChain: string,
  observedChainId: string,
) {
  if (walletChain !== 'sui:testnet' || observedChainId !== TESTNET_CHAIN_ID) {
    throw new Error('Only the verified Sui testnet is allowed')
  }
}

// Exact type matching is only a prerequisite. It does NOT prove NFT ownership.
export function assertCollectionType(actual: string, expected: string) {
  if (normalizeStructTag(actual) !== normalizeStructTag(expected)) {
    throw new Error('Object is not from the configured collection')
  }
}
