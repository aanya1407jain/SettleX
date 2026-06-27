#![cfg(test)]
#![allow(deprecated)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Address, Env, String};

#[test]
fn test_create_deposit() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Studio Unit 7"),
    );
    assert_eq!(deposit_id, 1);
    let deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.amount, 1_000_000_000);
    assert_eq!(deposit.status, 0); // Created
    assert_eq!(
        deposit.property_reference,
        String::from_str(&env, "Studio Unit 7")
    );
}

#[test]
fn test_full_refund_workflow() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Apt 3B"),
    );
    client.lock_deposit(&deposit_id);
    let mut deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 1); // Active

    // Landlord proposes full refund
    client.propose_full_refund(&deposit_id);
    deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 2); // FullRefundProposed

    // Tenant accepts
    client.accept_full_refund(&deposit_id);
    deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 5); // Settled
}

#[test]
fn test_partial_deduction_accept_workflow() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Apt 3B"),
    );
    client.lock_deposit(&deposit_id);

    // Landlord proposes partial deduction
    client.propose_partial_deduction(
        &deposit_id,
        &300_000_000,
        &String::from_str(&env, "Unpaid utility bills"),
    );
    let mut deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 3); // PartialDeductionProposed
    assert_eq!(deposit.deduction_amount, 300_000_000);
    assert_eq!(
        deposit.deduction_reason,
        String::from_str(&env, "Unpaid utility bills")
    );

    // Tenant accepts
    client.accept_partial_deduction(&deposit_id);
    deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 5); // Settled
}

#[test]
fn test_partial_deduction_reject_workflow() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Apt 3B"),
    );
    client.lock_deposit(&deposit_id);

    // Landlord proposes partial deduction
    client.propose_partial_deduction(
        &deposit_id,
        &500_000_000,
        &String::from_str(&env, "Damage repair"),
    );

    // Tenant rejects
    client.reject_partial_deduction(&deposit_id);
    let deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 1); // Back to Active
    assert_eq!(deposit.deduction_amount, 0);
}

#[test]
fn test_claim_refund_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    // Set initial timestamp
    env.ledger().set_timestamp(1000);
    let rental_end = 2000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Downtown Apt 3B"),
    );
    client.lock_deposit(&deposit_id);

    // Try to claim before deadline - should fail
    env.ledger().set_timestamp(2000);
    let result = client.try_claim_refund_after_deadline(&deposit_id);
    assert!(result.is_err());

    // Move past deadline (deadline = 2000 + 500 = 2500)
    env.ledger().set_timestamp(3000);
    client.claim_refund_after_deadline(&deposit_id);
    let deposit = client.get_deposit_details(&deposit_id);
    assert_eq!(deposit.status, 5); // Settled
}

#[test]
#[should_panic(expected = "deposit is not in Created status")]
fn test_lock_invalid_status() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Test"),
    );
    client.lock_deposit(&deposit_id);
    // Second lock should fail
    client.lock_deposit(&deposit_id);
}

#[test]
#[should_panic(expected = "deposit is not Active")]
fn test_claim_refund_not_active() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &(env.ledger().timestamp() + 1000),
        &500,
        &String::from_str(&env, "Test"),
    );
    env.ledger().set_timestamp(10000);
    client.claim_refund_after_deadline(&deposit_id);
}

#[test]
#[should_panic(expected = "deduction exceeds deposit amount")]
fn test_deduction_exceeds_deposit() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let deposit_id = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Test"),
    );
    client.lock_deposit(&deposit_id);
    client.propose_partial_deduction(
        &deposit_id,
        &2_000_000_000,
        &String::from_str(&env, "Too much"),
    );
}

#[test]
fn test_deposit_counter_increments() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;
    let id1 = client.create_deposit(
        &tenant,
        &landlord,
        &1_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Apt 1"),
    );
    let id2 = client.create_deposit(
        &Address::generate(&env),
        &Address::generate(&env),
        &500_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Apt 2"),
    );
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn test_multiple_deposits_independent() {
    let env = Env::default();
    env.mock_all_auths();
    let token = env.register_stellar_asset_contract(Address::generate(&env));
    let contract_id = env.register(Contract, (&token,));
    let client = ContractClient::new(&env, &contract_id);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token).mint(&tenant, &100_000_000_000);

    let rental_end = env.ledger().timestamp() + 1000;
    let review = 500;

    let id1 = client.create_deposit(
        &tenant,
        &landlord,
        &2_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Property A"),
    );
    let id2 = client.create_deposit(
        &tenant,
        &landlord,
        &3_000_000_000,
        &rental_end,
        &review,
        &String::from_str(&env, "Property B"),
    );

    client.lock_deposit(&id1);
    let dep1 = client.get_deposit_details(&id1);
    assert_eq!(dep1.status, 1);
    assert_eq!(
        dep1.property_reference,
        String::from_str(&env, "Property A")
    );

    let dep2 = client.get_deposit_details(&id2);
    assert_eq!(dep2.status, 0);
    assert_eq!(
        dep2.property_reference,
        String::from_str(&env, "Property B")
    );
}
