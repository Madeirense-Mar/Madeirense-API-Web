import env from "env";

import {
    API$Enumerators
} from "@Madeirense/shared";

import products from "./inputs/addProducts.json";

import type { createProductInputType } from "controllers/product";

const endpoint = `${env.API_URL}/api/v1/products/batch`;

async function main() {
    console.log("> API: ", endpoint);
    console.log("> Sending products...");
    
    console.log("");

    console.log("> ================================================ ");
    console.log(products);
    console.log("> ================================================ ");

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.SCRIPT_BEARER_TOKEN}`,
                [API$Enumerators.Headers.platform]: API$Enumerators.Platforms.service
            },
            body: JSON.stringify({
                products
            } as { products: Omit<createProductInputType, "restaurant_id">[] })
        });

        console.log((await response.json()));
    } catch (error) {
        console.log((error as Error).cause);
    }
};

main();