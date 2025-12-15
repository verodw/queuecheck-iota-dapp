module pizza_box::pizza {

    public struct Pizza has store {
        pepperoni: u16,
        sausage: u16,
        cheese: u16,
        onion: u16,
        chives: u16
    }

    public struct PizzaBox has key, store {
        id: UID,
        pizzas: vector<Pizza>,
    }

    #[allow(lint(self_transfer))]
    public entry fun cook(
        recipient: address,
        pepperoni_amounts: vector<u16>,
        sausage_amounts: vector<u16>,
        cheese_amounts: vector<u16>,
        onion_amounts: vector<u16>,
        chives_amounts: vector<u16>,
        ctx: &mut tx_context::TxContext
    ) {
        // Ensure all vectors have the same length
        let length = vector::length(&pepperoni_amounts);
        assert!(vector::length(&sausage_amounts) == length, 0);
        assert!(vector::length(&cheese_amounts) == length, 0);
        assert!(vector::length(&onion_amounts) == length, 0);
        assert!(vector::length(&chives_amounts) == length, 0);

        let mut pizzas = vector::empty<Pizza>();
        let mut i = 0;

        while (i < length) {
            let p = Pizza {
                pepperoni: *vector::borrow(&pepperoni_amounts, i),
                sausage: *vector::borrow(&sausage_amounts, i),
                cheese: *vector::borrow(&cheese_amounts, i),
                onion: *vector::borrow(&onion_amounts, i),
                chives: *vector::borrow(&chives_amounts, i),
            };
            vector::push_back(&mut pizzas, p);
            i = i + 1;
        };

        transfer::public_transfer(PizzaBox { id: object::new(ctx), pizzas }, recipient);
    }

    public entry fun eat_at(
    box: &mut PizzaBox,
    index: u64,
    ) {
        let len = vector::length(&box.pizzas);
        assert!(index < len, 0);

        vector::remove(&mut box.pizzas, index);
    }
    
}