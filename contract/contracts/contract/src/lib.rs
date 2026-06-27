#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Deposit {
    pub tenant: Address,
    pub landlord: Address,
    pub amount: i128,
    pub rental_end_date: u64,
    pub review_period: u64,
    pub property_reference: String,
    pub status: u32,
    pub deduction_amount: i128,
    pub deduction_reason: String,
}

#[contracttype]
pub enum DataKey {
    Token,
    Deposit(u64),
    DepositCount,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::DepositCount, &0u64);
    }

    pub fn create_deposit(
        env: Env,
        tenant: Address,
        landlord: Address,
        amount: i128,
        rental_end_date: u64,
        review_period: u64,
        property_reference: String,
    ) -> u64 {
        tenant.require_auth();
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DepositCount)
            .unwrap();
        count += 1;
        let deposit = Deposit {
            tenant: tenant.clone(),
            landlord,
            amount,
            rental_end_date,
            review_period,
            property_reference,
            status: 0, // Created
            deduction_amount: 0,
            deduction_reason: String::from_str(&env, ""),
        };
        env.storage()
            .instance()
            .set(&DataKey::Deposit(count), &deposit);
        env.storage()
            .instance()
            .set(&DataKey::DepositCount, &count);
        env.events().publish(
            (Symbol::new(&env, "DepositCreated"),),
            (count, deposit.tenant, deposit.amount),
        );
        count
    }

    pub fn lock_deposit(env: Env, deposit_id: u64) {
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let mut deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(deposit.status, 0, "deposit is not in Created status");
        deposit.tenant.require_auth();
        token::Client::new(&env, &token).transfer(
            &deposit.tenant,
            &env.current_contract_address(),
            &deposit.amount,
        );
        deposit.status = 1; // Active
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &deposit);
        env.events().publish(
            (Symbol::new(&env, "DepositFunded"),),
            (deposit_id, deposit.amount),
        );
    }

    pub fn propose_full_refund(env: Env, deposit_id: u64) {
        let mut deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(deposit.status, 1, "deposit is not Active");
        deposit.landlord.require_auth();
        deposit.status = 2; // FullRefundProposed
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &deposit);
        env.events().publish(
            (Symbol::new(&env, "FullRefundProposed"),),
            (deposit_id,),
        );
    }

    pub fn propose_partial_deduction(
        env: Env,
        deposit_id: u64,
        deduction_amount: i128,
        reason: String,
    ) {
        let mut deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(deposit.status, 1, "deposit is not Active");
        assert!(
            deduction_amount <= deposit.amount,
            "deduction exceeds deposit amount"
        );
        deposit.landlord.require_auth();
        deposit.status = 3; // PartialDeductionProposed
        deposit.deduction_amount = deduction_amount;
        deposit.deduction_reason = reason;
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &deposit);
        env.events().publish(
            (Symbol::new(&env, "PartialDeductionProposed"),),
            (deposit_id, deduction_amount),
        );
    }

    pub fn accept_full_refund(env: Env, deposit_id: u64) {
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(deposit.status, 2, "full refund has not been proposed");
        deposit.tenant.require_auth();
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &deposit.tenant,
            &deposit.amount,
        );
        let mut updated = deposit.clone();
        updated.status = 5; // Settled
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &updated);
        env.events().publish(
            (Symbol::new(&env, "TenantRefunded"),),
            (deposit_id, deposit.amount),
        );
    }

    pub fn accept_partial_deduction(env: Env, deposit_id: u64) {
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(
            deposit.status, 3,
            "partial deduction has not been proposed"
        );
        deposit.tenant.require_auth();
        let deduction = deposit.deduction_amount;
        let remainder = deposit.amount - deduction;
        if deduction > 0 {
            token::Client::new(&env, &token).transfer(
                &env.current_contract_address(),
                &deposit.landlord,
                &deduction,
            );
        }
        if remainder > 0 {
            token::Client::new(&env, &token).transfer(
                &env.current_contract_address(),
                &deposit.tenant,
                &remainder,
            );
        }
        let mut updated = deposit.clone();
        updated.status = 5; // Settled
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &updated);
        env.events().publish(
            (Symbol::new(&env, "PartialDeductionAccepted"),),
            (deposit_id, deduction, remainder),
        );
        if deduction > 0 {
            env.events().publish(
                (Symbol::new(&env, "LandlordPaid"),),
                (deposit_id, deposit.landlord, deduction),
            );
        }
    }

    pub fn reject_partial_deduction(env: Env, deposit_id: u64) {
        let mut deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(
            deposit.status, 3,
            "partial deduction has not been proposed"
        );
        deposit.tenant.require_auth();
        deposit.status = 1; // Back to Active
        deposit.deduction_amount = 0;
        deposit.deduction_reason = String::from_str(&env, "");
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &deposit);
    }

    pub fn claim_refund_after_deadline(env: Env, deposit_id: u64) {
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let deposit: Deposit = env
            .storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap();
        assert_eq!(deposit.status, 1, "deposit is not Active");
        let current = env.ledger().timestamp();
        let deadline = deposit.rental_end_date + deposit.review_period;
        assert!(current > deadline, "deadline has not passed yet");
        deposit.tenant.require_auth();
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &deposit.tenant,
            &deposit.amount,
        );
        let mut updated = deposit.clone();
        updated.status = 5; // Settled
        env.storage()
            .instance()
            .set(&DataKey::Deposit(deposit_id), &updated);
        env.events().publish(
            (Symbol::new(&env, "DeadlineRefundClaimed"),),
            (deposit_id, deposit.amount),
        );
    }

    pub fn get_deposit_details(env: Env, deposit_id: u64) -> Deposit {
        env.storage()
            .instance()
            .get(&DataKey::Deposit(deposit_id))
            .unwrap()
    }
}

mod test;
