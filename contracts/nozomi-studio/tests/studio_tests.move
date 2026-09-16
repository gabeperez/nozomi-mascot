#[test_only]
module nozomistudio::studio_tests;
use nozomistudio::studio::{Self, Studio, TestCharacter};
use sui::test_scenario;
use sui::coin;

fun run(amount: u64, palette: u8, name: vector<u8>, again: bool) {
    let mut s = test_scenario::begin(@0xA);
    studio::init_for_testing(s.ctx());
    s.next_tx(@0xB);
    let mut studio = test_scenario::take_shared<Studio>(&s);
    studio::claim(&mut studio, s.ctx());
    test_scenario::return_shared(studio);
    s.next_tx(@0xB);
    let studio = test_scenario::take_shared<Studio>(&s);
    let mut character = s.take_from_sender<TestCharacter>();
    let payment = coin::mint_for_testing(amount, s.ctx());
    studio::unlock(&studio, &mut character, std::string::utf8(name), palette, payment, s.ctx());
    assert!(studio::unlocked(&character), 99);
    if (again) {
        let payment = coin::mint_for_testing(10000000, s.ctx());
        studio::unlock(&studio, &mut character, std::string::utf8(b"Again"), 0, payment, s.ctx());
    };
    // The unlocked flag remains attached when the character changes hands.
    transfer::public_transfer(character, @0xC);
    test_scenario::return_shared(studio);
    s.next_tx(@0xC);
    let character = s.take_from_sender<TestCharacter>();
    assert!(studio::unlocked(&character), 98);
    test_scenario::return_to_sender(&s, character);
    s.end();
}
#[test]
fun claim_unlock_transfer() { run(10000000, 1, b"Mochi", false) }
#[test, expected_failure(abort_code = 2, location = studio)]
fun wrong_payment() { run(1, 0, b"Mochi", false) }
#[test, expected_failure(abort_code = 4, location = studio)]
fun invalid_palette() { run(10000000, 4, b"Mochi", false) }
#[test, expected_failure(abort_code = 3, location = studio)]
fun empty_name() { run(10000000, 0, b"", false) }
#[test, expected_failure(abort_code = 1, location = studio)]
fun duplicate_unlock() { run(10000000, 0, b"Mochi", true) }
#[test, expected_failure(abort_code = 0, location = studio)]
fun duplicate_claim() {
    let mut s = test_scenario::begin(@0xA);
    studio::init_for_testing(s.ctx());
    s.next_tx(@0xB);
    let mut studio = test_scenario::take_shared<Studio>(&s);
    studio::claim(&mut studio, s.ctx());
    studio::claim(&mut studio, s.ctx());
    test_scenario::return_shared(studio);
    s.end();
}
