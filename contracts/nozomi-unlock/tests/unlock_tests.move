#[test_only]
module nozomiunlock::unlock_tests;

use nozomiunlock::unlock::{Self, AdminCap, Registry};
use sui::test_scenario;
use sui::coin;
use sui::kiosk::{Self, KioskOwnerCap};

public struct Fixture has key, store { id: UID }
public struct Impostor has key, store { id: UID }

fun run(amount: u64, ready: bool, duplicate: bool, impostor: bool) {
    let sender = @0xA;
    let mut s = test_scenario::begin(sender);
    unlock::init_for_testing(s.ctx());
    let nft = Fixture { id: object::new(s.ctx()) };
    let nft_id = object::id(&nft);
    transfer::public_transfer(nft, sender);
    s.next_tx(sender);
    let admin = s.take_from_sender<AdminCap>();
    unlock::create_registry<Fixture>(&admin, @0xB, s.ctx());
    test_scenario::return_to_sender(&s, admin);
    s.next_tx(sender);
    let mut registry = test_scenario::take_shared<Registry>(&s);
    if (ready) {
        let admin = s.take_from_sender<AdminCap>();
        unlock::prepare(&admin, &mut registry, nft_id, b"01234567890123456789012345678901", 10);
        test_scenario::return_to_sender(&s, admin);
    };
    let payment = coin::mint_for_testing(amount, s.ctx());
    if (impostor) {
        let fake = Impostor { id: object::new(s.ctx()) };
        unlock::unlock_owned(&mut registry, fake, payment, s.ctx());
    } else {
        let nft = s.take_from_sender<Fixture>();
        unlock::unlock_owned(&mut registry, nft, payment, s.ctx());
    };
    assert!(unlock::is_unlocked(&registry, nft_id), 99);
    test_scenario::return_shared(registry);
    s.next_tx(sender);
    // Original asset is returned to its owner by the same transaction.
    let nft = s.take_from_sender<Fixture>();
    assert!(object::id(&nft) == nft_id, 98);
    if (duplicate) {
        let mut registry = test_scenario::take_shared<Registry>(&s);
        let payment = coin::mint_for_testing(10, s.ctx());
        unlock::unlock_owned(&mut registry, nft, payment, s.ctx());
        test_scenario::return_shared(registry);
    } else { test_scenario::return_to_sender(&s, nft) };
    s.end();
}

#[test]
fun unlock_returns_nft() { run(10, true, false, false) }
#[test, expected_failure(abort_code = 3, location = unlock)]
fun underpayment_rejected() { run(9, true, false, false) }
#[test, expected_failure(abort_code = 3, location = unlock)]
fun overpayment_rejected() { run(11, true, false, false) }
#[test, expected_failure(abort_code = 1, location = unlock)]
fun unfinished_asset_rejected() { run(10, false, false, false) }
#[test, expected_failure(abort_code = 2, location = unlock)]
fun duplicate_payment_rejected() { run(10, true, true, false) }
#[test, expected_failure(abort_code = 0, location = unlock)]
fun fake_collection_rejected() { run(10, true, false, true) }

fun run_kiosk(wrong_cap: bool) {
    let sender = @0xA;
    let mut s = test_scenario::begin(sender);
    unlock::init_for_testing(s.ctx());
    s.next_tx(sender);
    let admin = s.take_from_sender<AdminCap>();
    unlock::create_registry<Fixture>(&admin, @0xB, s.ctx());
    test_scenario::return_to_sender(&s, admin);
    s.next_tx(sender);
    let mut registry = test_scenario::take_shared<Registry>(&s);
    let admin = s.take_from_sender<AdminCap>();
    let nft = Fixture { id: object::new(s.ctx()) };
    let nft_id = object::id(&nft);
    unlock::prepare(&admin, &mut registry, nft_id, b"01234567890123456789012345678901", 10);
    let (mut k, cap) = kiosk::new(s.ctx());
    kiosk::place(&mut k, &cap, nft);
    let payment = coin::mint_for_testing(10, s.ctx());
    if (wrong_cap) {
        let (other, wrong) = kiosk::new(s.ctx());
        unlock::unlock_kiosk<Fixture>(&mut registry, &k, &wrong, nft_id, payment, s.ctx());
        transfer::public_share_object(other);
        transfer::public_transfer(wrong, sender);
    } else {
        unlock::unlock_kiosk<Fixture>(&mut registry, &k, &cap, nft_id, payment, s.ctx());
    };
    assert!(unlock::is_unlocked(&registry, nft_id), 99);
    assert!(object::id(kiosk::borrow<Fixture>(&k, &cap, nft_id)) == nft_id, 98);
    transfer::public_share_object(k);
    transfer::public_transfer<KioskOwnerCap>(cap, sender);
    test_scenario::return_to_sender(&s, admin);
    test_scenario::return_shared(registry);
    s.end();
}

#[test]
fun kiosk_unlock_preserves_custody() { run_kiosk(false) }
#[test, expected_failure(abort_code = 0, location = sui::kiosk)]
fun wrong_kiosk_cap_rejected() { run_kiosk(true) }
