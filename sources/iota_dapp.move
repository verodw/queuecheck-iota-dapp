/*
/// Module: iota_dapp
module iota_dapp::iota_dapp;
*/

// For Move coding conventions, see
// https://docs.iota.org/developer/iota-101/move-overview/conventions


/*
/// Module: iota_dapp
/// Description: Smart Contract for QueueCheck - Decentralized Queue Transparency
*/

module iota_dapp::queuecheck {
    use std::string::{Self, String};
    use iota::object::{Self, UID};
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use iota::clock::{Self, Clock};

    public struct AdminCap has key, store {
        id: UID
    }

    public struct Location has key, store {
        id: UID,
        name: String,           
        description: String,   
        current_queue: u64,     
        estimated_wait: u64,   
        last_update_ms: u64,    
        reporter: address      
    }

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    public entry fun create_location(
        _: &AdminCap,           
        name_bytes: vector<u8>, 
        desc_bytes: vector<u8>, 
        clock: &Clock,          
        ctx: &mut TxContext
    ) {
        let loc = Location {
            id: object::new(ctx),
            name: string::utf8(name_bytes),
            description: string::utf8(desc_bytes),
            current_queue: 0,
            estimated_wait: 0,
            last_update_ms: iota::clock::timestamp_ms(clock),
            reporter: tx_context::sender(ctx)
        };
        transfer::share_object(loc);
    }

    public entry fun update_queue(
        location: &mut Location, 
        new_queue: u64,          
        new_wait: u64,           
        clock: &Clock,           
        ctx: &TxContext
    ) {
        location.current_queue = new_queue;
        location.estimated_wait = new_wait;
        location.last_update_ms = iota::clock::timestamp_ms(clock);
        location.reporter = tx_context::sender(ctx);
    }
}
