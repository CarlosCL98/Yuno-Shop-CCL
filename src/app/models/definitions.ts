export interface Product {
    id: number;
    name: string;
    price: number;
    description?: string;
    image?: string;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Country {
    isoCode: string;
    name: string;
}

export interface PaymentMethod {
    name: string;
    vaulted_token: string | null;
    description: string;
    type: string;
    category: string;
    icon: string;
    last_successfully_used: string | null;
    last_successfully_used_at: string | null;
    checkout: {
        session: string;
        sdk_required_action: boolean;
        conditions: {
            enabled: boolean;
            rules: any;
        };
    };
    preferred: boolean;
}

export interface PaymentMethodEnrollable {
    name: string;
    description: string;
    type: string;
    category: string;
    icon: string;
    enrollment: {
        session: string;
        sdk_required_action: boolean;
    };
}