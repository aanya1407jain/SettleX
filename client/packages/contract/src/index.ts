import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDTMREWJOMFH5JTY462EWKRGEMAGM7XJ5KXQ54KZPIMPQMG5WU3DNYUD",
  }
} as const

export type DataKey = {tag: "Token", values: void} | {tag: "Deposit", values: readonly [u64]} | {tag: "DepositCount", values: void};


export interface Deposit {
  amount: i128;
  deduction_amount: i128;
  deduction_reason: string;
  landlord: string;
  property_reference: string;
  rental_end_date: u64;
  review_period: u64;
  status: u32;
  tenant: string;
}

export interface Client {
  /**
   * Construct and simulate a lock_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  lock_deposit: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_deposit: ({tenant, landlord, amount, rental_end_date, review_period, property_reference}: {tenant: string, landlord: string, amount: i128, rental_end_date: u64, review_period: u64, property_reference: string}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a accept_full_refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_full_refund: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_deposit_details transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_deposit_details: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Deposit>>

  /**
   * Construct and simulate a propose_full_refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  propose_full_refund: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a accept_partial_deduction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_partial_deduction: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a reject_partial_deduction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  reject_partial_deduction: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a propose_partial_deduction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  propose_partial_deduction: ({deposit_id, deduction_amount, reason}: {deposit_id: u64, deduction_amount: i128, reason: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a claim_refund_after_deadline transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_refund_after_deadline: ({deposit_id}: {deposit_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {token}: {token: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({token}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAAAAAAAAAAABVRva2VuAAAAAAAAAQAAAAAAAAAHRGVwb3NpdAAAAAABAAAABgAAAAAAAAAAAAAADERlcG9zaXRDb3VudA==",
        "AAAAAQAAAAAAAAAAAAAAB0RlcG9zaXQAAAAACQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAABBkZWR1Y3Rpb25fYW1vdW50AAAACwAAAAAAAAAQZGVkdWN0aW9uX3JlYXNvbgAAABAAAAAAAAAACGxhbmRsb3JkAAAAEwAAAAAAAAAScHJvcGVydHlfcmVmZXJlbmNlAAAAAAAQAAAAAAAAAA9yZW50YWxfZW5kX2RhdGUAAAAABgAAAAAAAAANcmV2aWV3X3BlcmlvZAAAAAAAAAYAAAAAAAAABnN0YXR1cwAAAAAABAAAAAAAAAAGdGVuYW50AAAAAAAT",
        "AAAAAAAAAAAAAAAMbG9ja19kZXBvc2l0AAAAAQAAAAAAAAAKZGVwb3NpdF9pZAAAAAAABgAAAAA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABXRva2VuAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAOY3JlYXRlX2RlcG9zaXQAAAAAAAYAAAAAAAAABnRlbmFudAAAAAAAEwAAAAAAAAAIbGFuZGxvcmQAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAD3JlbnRhbF9lbmRfZGF0ZQAAAAAGAAAAAAAAAA1yZXZpZXdfcGVyaW9kAAAAAAAABgAAAAAAAAAScHJvcGVydHlfcmVmZXJlbmNlAAAAAAAQAAAAAQAAAAY=",
        "AAAAAAAAAAAAAAASYWNjZXB0X2Z1bGxfcmVmdW5kAAAAAAABAAAAAAAAAApkZXBvc2l0X2lkAAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAATZ2V0X2RlcG9zaXRfZGV0YWlscwAAAAABAAAAAAAAAApkZXBvc2l0X2lkAAAAAAAGAAAAAQAAB9AAAAAHRGVwb3NpdAA=",
        "AAAAAAAAAAAAAAATcHJvcG9zZV9mdWxsX3JlZnVuZAAAAAABAAAAAAAAAApkZXBvc2l0X2lkAAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAYYWNjZXB0X3BhcnRpYWxfZGVkdWN0aW9uAAAAAQAAAAAAAAAKZGVwb3NpdF9pZAAAAAAABgAAAAA=",
        "AAAAAAAAAAAAAAAYcmVqZWN0X3BhcnRpYWxfZGVkdWN0aW9uAAAAAQAAAAAAAAAKZGVwb3NpdF9pZAAAAAAABgAAAAA=",
        "AAAAAAAAAAAAAAAZcHJvcG9zZV9wYXJ0aWFsX2RlZHVjdGlvbgAAAAAAAAMAAAAAAAAACmRlcG9zaXRfaWQAAAAAAAYAAAAAAAAAEGRlZHVjdGlvbl9hbW91bnQAAAALAAAAAAAAAAZyZWFzb24AAAAAABAAAAAA",
        "AAAAAAAAAAAAAAAbY2xhaW1fcmVmdW5kX2FmdGVyX2RlYWRsaW5lAAAAAAEAAAAAAAAACmRlcG9zaXRfaWQAAAAAAAYAAAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    lock_deposit: this.txFromJSON<null>,
        create_deposit: this.txFromJSON<u64>,
        accept_full_refund: this.txFromJSON<null>,
        get_deposit_details: this.txFromJSON<Deposit>,
        propose_full_refund: this.txFromJSON<null>,
        accept_partial_deduction: this.txFromJSON<null>,
        reject_partial_deduction: this.txFromJSON<null>,
        propose_partial_deduction: this.txFromJSON<null>,
        claim_refund_after_deadline: this.txFromJSON<null>
  }
}