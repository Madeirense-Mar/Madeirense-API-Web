import type { $Enums } from "@Madeirense/database/browser";

// ***************************************************************************************************************

type labelType = (
    | $Enums.Payments_payment_method
    | $Enums.Payments_status
    | $Enums.Products_product_composition
    | $Enums.Products_product_type
    | $Enums.Orders_status
    | $Enums.Users_user_role
    | $Enums.Restaurant_Events_status
);

type descriptionType = (
    | $Enums.Courier_Reallocation_Requests_motive
);

export function getDescription<T>(label: T): string {
    switch (label as descriptionType) {
        // Reallocation request motives
        case "BAD_ALLOCATION": return "Vou atrasar-me, peçam outro estafeta";
        case "DRIVER_IS_FAR": return "Ainda não estou no restaurante";
        case "TARDINESS": return "Vou atrasar-me, peçam outro estafeta";
        case "UNAVAILABLE": return "Não estou disponível para entregar o pedido";
        case "VEHICLE_ISSUE": return "Estou com um problema na mota/carro";

        default: return "";
    }
};

export function getLabel<T>(label: T): string {
    switch (label as labelType) {
        // Order status
        case "assigned": return "À caminho";
        case "cancelled": return "Cancelado";
        case "confirmed": return "Confirmado";
        case "delivered": return "Entregue";
        case "pending": return "Pendente";
        case "preparing": return "A preparar";
        case "ready": return "Pronto para entrega";

        // Payment status
        case "completed": return "Pago";
        case "failed": return "Rejeitado";
        case "refunded": return "Devolvido";

        //Payment types
        case "Bank_Transfer": return "Transferência bancária";
        case "Cash": return "Dinheiro (em mão)";
        case "Credit_Card": return "Cartão de crédito (VISA/Mastercard)";
        case "Debit_Card": return "TPA (Cartão de débito)";
        case "Multicaixa_Express": return "Multicaixa Express";
        case "PayPal": return "PayPal";
        case "Payment_Reference": return "Pagamento por referência";
        case "Offer": return "Oferta (Grátis)";

        //Product compositions
        case "alcoholic": return "Bebidas alcóolicas";
        case "fish": return "Peixe";
        case "meat": return "Carne";
        case "merchandise": return "Merchandise";
        case "mixed": return "Mistura";
        case "non_alcoholic": return "Bebidas";
        case "vegan": return "Vegetariano";
        case "wheat": return "Farináceos";

        //Product types
        case "beverage": return "Bebidas";
        case "garnish": return "Guarnições";
        case "dessert": return "Sobremesas";
        case "main": return "Principal";
        case "starter": return "Entradas";
        case "ticket": return "Ingressos (Bilhetaria)";

        //User roles
        case "Admin": return "Administrador";
        case "Customer": return "Cliente";
        case "Driver": return "Estafeta";
        case "Ghost": return "Fantasma";
        case "Staff": return "Gerente";
        case "System": return "Sistema (automático)";

        //Events status
        case "expired": return "Expirado";
        case "ongoing": return "A decorrer";
        case "upcoming": return "Brevemente";

        default: return "";
    }
};

export function getNextOrderStatus(status: ($Enums.Order_History_status | $Enums.Orders_status)): ($Enums.Order_History_status | $Enums.Orders_status) {
    switch (status) {
        case "pending": return "confirmed";
        case "confirmed": return "preparing";
        case "preparing": return "ready";
        case "ready": return "assigned";
        case "assigned": return "delivered";

        default: return "pending";
    }
};

export function getOrderStatusActionLabel(status: ($Enums.Order_History_status | $Enums.Orders_status)): string {
    switch (status) {
        case "pending": return "Confirmar pedido";
        case "confirmed": return "Está a ser preparado";
        case "preparing": return "Pronto para entrega";
        case "ready": return "Saiu para entrega";

        default: return "";
    }
};