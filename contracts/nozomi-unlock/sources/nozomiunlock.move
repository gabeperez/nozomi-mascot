module nozomiunlock::unlock;

use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::event;

const EWrongCollection: u64 = 0;
const ENotReady: u64 = 1;
const EAlreadyUnlocked: u64 = 2;
const EWrongAmount: u64 = 3;
const EInvalidHash: u64 = 4;
const EAlreadyPrepared: u64 = 5;

public struct AdminCap has key { id: UID }
public struct Asset has store {
    manifest_hash: vector<u8>,
    price_mist: u64,
    unlocked: bool,
}
public struct Registry has key {
    id: UID,
    collection: TypeName,
    treasury: address,
    assets: Table<ID, Asset>,
}
public struct Unlocked has copy, drop {
    registry_id: ID,
    nft_id: ID,
    payer: address,
    manifest_hash: vector<u8>,
    amount_mist: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

public fun create_registry<T: key + store>(
    _: &AdminCap, treasury: address, ctx: &mut TxContext,
) {
    transfer::share_object(Registry {
        id: object::new(ctx), collection: type_name::with_original_ids<T>(),
        treasury, assets: table::new(ctx),
    });
}

// Only the service may register a completed, immutable export bundle.
// This prototype supports one bundle per NFT; no repricing or replacement.
public fun prepare(
    _: &AdminCap, registry: &mut Registry, nft_id: ID,
    manifest_hash: vector<u8>, price_mist: u64,
) {
    assert!(manifest_hash.length() == 32, EInvalidHash);
    assert!(!registry.assets.contains(nft_id), EAlreadyPrepared);
    registry.assets.add(nft_id, Asset { manifest_hash, price_mist, unlocked: false });
}

// By-value input excludes shared objects and does not leave custody with us.
public fun unlock_owned<T: key + store>(
    registry: &mut Registry, nft: T, payment: Coin<SUI>, ctx: &mut TxContext,
) {
    pay<T>(registry, object::id(&nft), payment, ctx);
    transfer::public_transfer(nft, ctx.sender());
}

// Kiosk authority is checked by the Sui framework, including locked assets.
public fun unlock_kiosk<T: key + store>(
    registry: &mut Registry, kiosk: &Kiosk, cap: &KioskOwnerCap,
    nft_id: ID, payment: Coin<SUI>, ctx: &mut TxContext,
) {
    let nft = kiosk::borrow<T>(kiosk, cap, nft_id);
    pay<T>(registry, object::id(nft), payment, ctx);
}

fun pay<T: key + store>(
    registry: &mut Registry, nft_id: ID, payment: Coin<SUI>, ctx: &TxContext,
) {
    assert!(registry.collection == type_name::with_original_ids<T>(), EWrongCollection);
    assert!(registry.assets.contains(nft_id), ENotReady);
    let registry_id = object::id(registry);
    let asset = &mut registry.assets[nft_id];
    assert!(!asset.unlocked, EAlreadyUnlocked);
    assert!(coin::value(&payment) == asset.price_mist, EWrongAmount);
    asset.unlocked = true;
    event::emit(Unlocked {
        registry_id, nft_id, payer: ctx.sender(), manifest_hash: asset.manifest_hash,
        amount_mist: asset.price_mist,
    });
    transfer::public_transfer(payment, registry.treasury);
}

public fun is_unlocked(registry: &Registry, nft_id: ID): bool {
    registry.assets.contains(nft_id) && registry.assets[nft_id].unlocked
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
