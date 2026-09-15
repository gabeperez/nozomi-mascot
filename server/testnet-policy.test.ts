import { describe, expect, test } from 'bun:test'
import { assertCollectionType, assertTestnet, MAINNET_PRIME_MACHIN_PACKAGE, TESTNET_CHAIN_ID, testnetPolicy } from './testnet-policy'

const fixtureId = '0x' + 'a'.repeat(64) // Unit-test input only; not a deployed package.

describe('testnet boundaries', () => {
  test('missing and malformed IDs cannot enable claims', () => {
    for (const id of [undefined, '', '0x123', 'prime-machin']) {
      expect(() => testnetPolicy(id)).toThrow()
    }
  })
  test('mainnet and zero IDs cannot act as testnet defaults', () => {
    expect(() => testnetPolicy(MAINNET_PRIME_MACHIN_PACKAGE)).toThrow()
    expect(() => testnetPolicy('0x' + '0'.repeat(64))).toThrow()
  })
  test('wallet and RPC must both identify testnet', () => {
    expect(() => assertTestnet('sui:mainnet', TESTNET_CHAIN_ID)).toThrow()
    expect(() => assertTestnet('sui:testnet', 'different-genesis')).toThrow()
    expect(() => assertTestnet('sui:testnet', TESTNET_CHAIN_ID)).not.toThrow()
  })
  test('same NFT name from another package is rejected', () => {
    const policy = testnetPolicy(fixtureId)
    expect(() => assertCollectionType(`${MAINNET_PRIME_MACHIN_PACKAGE}::factory::PrimeMachin`, policy.collectionType)).toThrow()
    expect(() => assertCollectionType(policy.collectionType, policy.collectionType)).not.toThrow()
  })
  test('other type in the same package is rejected', () => {
    const policy = testnetPolicy(fixtureId)
    expect(() => assertCollectionType(`${fixtureId}::factory::Factory`, policy.collectionType)).toThrow()
  })
})
