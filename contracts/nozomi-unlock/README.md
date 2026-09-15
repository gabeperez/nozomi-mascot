# Nozomi export unlock — testnet prototype

This is our own contract. It does not modify, upgrade or administer Prime Machin.

## Published deployment

- Network: Sui testnet only
- Package: `0x9151f1c9470a02c143153c0cee3daf76085657f14eb79290b00aa2d0fe9fe907`
- Transaction: `Fvy6k8FLkVabACpRRVprfLZb6nFzMFaMjN3WUWRsdEa9`
- Development wallet: `0xdc6e04a664adad691e35f5c1a85d14b005f8465bacc57b2f413948ccfb880ebb`
- Initial faucet grant: 1 test SUI. Net publication gas: 0.01871788 test SUI.
- Local source verification against the published testnet package succeeded.
- AdminCap and UpgradeCap remain owned by the development wallet.

## Current behavior

The admin creates a registry for one exact Move type and a fixed treasury. For each NFT, the admin prepares an immutable 32-byte manifest hash and contribution amount in MIST. This is an attestation that an export is ready; the chain does not verify AI generation or file availability.

The current NFT controller can pay the exact amount using either a directly owned NFT or the correct KioskOwnerCap. Directly owned NFTs return to the sender in the same transaction; Kiosk items remain in the Kiosk. The registry records the unlock against the NFT ID and emits an event. Repeated unlocks abort atomically rather than charging twice. Service code must detect existing unlocks before prompting for payment.

This first prototype supports one immutable bundle per NFT. There is no renewal, repricing, refund, pause, asset-version replacement, or quote-expiry mechanism. No registry has been created yet: an actual testnet NFT type is still needed. Nothing is wired to the production website or a payment backend. Personal Kiosk and locked-item integration still require end-to-end tests. Eight unit tests cover direct ownership, Kiosk preservation, wrong capability, wrong collection, duplicate payments, readiness and exact contribution amounts.

This is testnet development code, not an audited production payment system.

## Local credentials

Credentials are stored outside the repository at `/Users/gabe/.config/nozomi-mascot/testnet/` with owner-only permissions. `wallet.key` holds the private key and `sui.keystore` supports the CLI. `client.yaml` selects only testnet. Never print these secret files or commit them. The user's global Sui configuration is unchanged.

CLI commands must specify the isolated config:

```sh
sui client --client.config /Users/gabe/.config/nozomi-mascot/testnet/client.yaml --client.env testnet active-address
```

Development checks:

```sh
sui move test --path contracts/nozomi-unlock --build-env testnet
bun test server
bun run typecheck
bun run build
```

Wallet creation script is idempotent and uses a cryptographically generated Ed25519 key. It prints only the public address and credential directory.
