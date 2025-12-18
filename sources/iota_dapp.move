// For Move coding conventions, see
// https://docs.iota.org/developer/iota-101/move-overview/conventions

module queuecheck::queuecheck {
    use iota::object::{Self, UID};
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use iota::clock::{Self, Clock};
    use iota::coin::{Self, Coin}; 
    use iota::balance::{Self, Balance};
    use std::string::{Self, String};
    use std::option;

    public struct QUEUECHECK has drop {}

    public struct AdminCap has key { id: UID }

    public struct Location has key, store {
        id: UID,
        name: String,
        description: String,
        current_queue: u64,
        estimated_wait: u64,
        last_update_ms: u64,
        reporter: address
    }

    public struct RewardPool has key {
        id: UID,
        balance: Balance<QUEUECHECK>
    }
    
    fun init(witness: QUEUECHECK, ctx: &mut TxContext) {
        let (mut treasury, metadata) = coin::create_currency(
            witness, 
            0, 
            b"QUEUE", 
            b"QueueCheck Coin", 
            b"Reward token for reporting queue status", 
            option::none(), 
            ctx
        );
        let initial_supply = coin::mint_balance(&mut treasury, 1000000);

        let pool = RewardPool {
            id: object::new(ctx),
            balance: initial_supply
        };
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx)); 
        transfer::share_object(pool); 
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    public entry fun create_location(_: &AdminCap, name: vector<u8>, description: vector<u8>, ctx: &mut TxContext) {
        let location = Location {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            current_queue: 0,
            estimated_wait: 0,
            last_update_ms: 0,
            reporter: @0x0
        };
        transfer::share_object(location);
    }
    public entry fun update_queue(
        location: &mut Location, 
        pool: &mut RewardPool,
        new_queue: u64, 
        new_wait: u64, 
        clock: &Clock, 
        ctx: &mut TxContext
    ) {
        location.current_queue = new_queue;
        location.estimated_wait = new_wait;
        location.last_update_ms = clock::timestamp_ms(clock);
        location.reporter = tx_context::sender(ctx);

        if (balance::value(&pool.balance) > 0) {
            let reward_coin = coin::take(&mut pool.balance, 1, ctx);
            transfer::public_transfer(reward_coin, tx_context::sender(ctx));
        }
    }
}