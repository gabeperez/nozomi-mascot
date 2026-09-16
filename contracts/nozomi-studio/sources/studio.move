module nozomistudio::studio;

use std::string::{Self, String};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::event;

const EAlreadyClaimed: u64 = 0;
const EAlreadyUnlocked: u64 = 1;
const EWrongAmount: u64 = 2;
const EInvalidName: u64 = 3;
const EInvalidPalette: u64 = 4;
const EWrongStudio: u64 = 5;

public struct Studio has key {
    id: UID,
    treasury: address,
    price_mist: u64,
    claimed: Table<address, bool>,
}

// This is explicitly our test collection, never an original Prime Machin.
public struct TestCharacter has key, store {
    id: UID,
    studio_id: ID,
    name: String,
    palette: u8,
    unlocked: bool,
    template_version: u64,
}

public struct Claimed has copy, drop { character_id: ID, holder: address }
public struct Unlocked has copy, drop {
    character_id: ID, holder: address, name: String, palette: u8,
    amount_mist: u64, template_version: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(Studio {
        id: object::new(ctx), treasury: ctx.sender(), price_mist: 10000000,
        claimed: table::new(ctx),
    });
}

fun new_character(studio: &mut Studio, ctx: &mut TxContext): TestCharacter {
    let holder = ctx.sender();
    assert!(!studio.claimed.contains(holder), EAlreadyClaimed);
    studio.claimed.add(holder, true);
    let character = TestCharacter {
        id: object::new(ctx), studio_id: object::id(studio),
        name: string::utf8(b"My Nozomi"), palette: 0,
        unlocked: false, template_version: 1,
    };
    event::emit(Claimed { character_id: object::id(&character), holder });
    character
}

public fun claim(studio: &mut Studio, ctx: &mut TxContext) {
    let character = new_character(studio, ctx);
    transfer::public_transfer(character, ctx.sender());
}

// One confirmation can create and personalize the character atomically.
public fun create(studio: &mut Studio, name: String, palette: u8, payment: Coin<SUI>, ctx: &mut TxContext) {
    let mut character = new_character(studio, ctx);
    unlock(studio, &mut character, name, palette, payment, ctx);
    transfer::public_transfer(character, ctx.sender());
}

public fun unlock(
    studio: &Studio, character: &mut TestCharacter,
    name: String, palette: u8, payment: Coin<SUI>, ctx: &TxContext,
) {
    assert!(character.studio_id == object::id(studio), EWrongStudio);
    assert!(!character.unlocked, EAlreadyUnlocked);
    assert!(coin::value(&payment) == studio.price_mist, EWrongAmount);
    assert!(name.length() > 0 && name.length() <= 40, EInvalidName);
    assert!(palette < 4, EInvalidPalette);
    character.name = name;
    character.palette = palette;
    character.unlocked = true;
    event::emit(Unlocked {
        character_id: object::id(character), holder: ctx.sender(),
        name, palette, amount_mist: studio.price_mist, template_version: 1,
    });
    transfer::public_transfer(payment, studio.treasury);
}

public fun unlocked(character: &TestCharacter): bool { character.unlocked }
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
