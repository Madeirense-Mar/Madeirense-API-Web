# Madeirense Mar — Backend API Reference

Fill this in and share it back. Delete any section that doesn't apply, and duplicate
the "Endpoint" block for every additional endpoint you have (menu, categories,
modifiers, restaurant info, etc.) — the more the better, but don't block on
covering everything if you want to start with just the version + menu endpoints.

---

## 1. Endpoints

> All of the following routes are authenticated via header authentication JWT token

### Validations and constants

```ts
export const API_MIN_CART_ITEMS_FOR_REMOVAL = 1; 
export const API_MAX_CART_ITEMS_FOR_REMOVAL = 100; 

export const API_MIN_ID_NUMBER = 1; 

export const API_MAX_RATING_NUMBER = 5; 
export const API_MIN_RATING_NUMBER = 1; 

// At it's core, this is how pagination requests are validate
export const pagination = [
    query('page').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Page must be a positive integer'),
    query('limit').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

export declare enum Carts {
    "delivery" = "delivery",
    "event" = "event",
    "resort" = "resort"
}

const cartTypeValidation = [
    param('type').notEmpty().isIn(["all", ...Object.values(Carts)]).withMessage(`Only ${["all", ...Object.values(Carts)].join(', ')} cart types are accepted`)
];
```

### Add

- **Method + Path:** `POST http://localhost:3001/api/v1/cart/add`

- **Sample request body:**

```typescript
v1.post(
    '/add',
    [
        body('product_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid product ID is required'),
        body('quantity').optional({ values: 'falsy' }).isInt({ min: API_MIN_CART_ITEMS_FOR_REMOVAL, max: API_MAX_CART_ITEMS_FOR_REMOVAL }).withMessage(`Product quantities are to be defined within ${API_MIN_CART_ITEMS_FOR_REMOVAL} - ${API_MAX_CART_ITEMS_FOR_REMOVAL}.`),
        Validate.Handle.error
    ],
    controller.addToCart as any
);
```

- **Sample response body:**

```json
{
 "success": true,
 "message": "Item added to cart successfully",
 "data": {
  "cart_id": 89,
  "user_id": 4,
  "product_id": 1,
  "added_at": "2026-09-04T11:03:32.000Z",
  "quantity": 1,
  "Products": {
   "product_id": 1,
   "name": "BOLO CACAU",
   "description": "Pão Típico da ilha da Madeira , Amassado Com Batata Doce , Cozido a Carvão , Barrado com Manteiga de Alho Caseira",
   "price": "3000",
   "restaurant_id": null,
   "discount": "0",
   "thumbnail": "https://res.cloudinary.com/lkm/image/upload/w_200,h_220,c_pad/production/4206/2024/03/20240314210557022_411a2adbe7274bc2b345dc5a4fe3ae19_jnxqoi.png",
   "product_type": "starter",
   "prep_time_minutes": 0,
   "event_id": null,
   "delisted": false,
   "created_at": "2025-09-23T14:55:20.000Z",
   "updated_at": "2025-10-03T09:27:17.000Z",
   "product_composition": "wheat",
   "Restaurants": null,
   "quantity": 1
  }
 }
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Clear

- **Method + Path:** `DELETE http://localhost:3001/api/v1/cart/clear/:type`

- **Sample request body:**

```typescript
v1.delete(
    '/clear/:type',
    [
        ...cartTypeValidation,
        Validate.Handle.error
    ],
    controller.clearCart as any
);
```

- **Sample response body:**

```json
{
 "data": {
  "deletedCount": 1
 },
 "message": "Cart cleared successfully. 1 items removed.",
 "success": true
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Mine

- **Method + Path:** `GET http://localhost:3001/api/v1/cart/mine`

- **Sample request body:**

```typescript
v1.get(
    '/mine',
    validatePagination,
    controller.getUserCart as any
);
```

- **Sample response body:**

```json
{
 "data": [
  {
   "product_id": 1,
   "name": "BOLO CACAU",
   "description": "Pão Típico da ilha da Madeira , Amassado Com Batata Doce , Cozido a Carvão , Barrado com Manteiga de Alho Caseira",
   "price": "3000",
   "restaurant_id": null,
   "discount": "0",
   "thumbnail": "https://res.cloudinary.com/lkm/image/upload/w_200,h_220,c_pad/production/4206/2024/03/20240314210557022_411a2adbe7274bc2b345dc5a4fe3ae19_jnxqoi.png",
   "product_type": "starter",
   "prep_time_minutes": 0,
   "event_id": null,
   "delisted": false,
   "created_at": "2025-09-23T14:55:20.000Z",
   "updated_at": "2025-10-03T09:27:17.000Z",
   "product_composition": "wheat",
   "Restaurants": null,
   "quantity": 1
  },
  {
   "product_id": 7,
   "name": "\"Ativação do Aplicativo Madeirense\" Bilhete",
   "description": "Venha comemorar a ativação do aplicativo de encomendas do Madeirense.",
   "price": "0",
   "restaurant_id": 4,
   "discount": "0",
   "thumbnail": "https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/",
   "product_type": "ticket",
   "prep_time_minutes": 0,
   "event_id": 2,
   "delisted": false,
   "created_at": "2025-09-23T14:55:20.000Z",
   "updated_at": "2025-09-23T14:55:28.000Z",
   "product_composition": "merchandise",
   "Restaurants": {
    "restaurant_id": 4,
    "name": "Madeirense Mar",
    "location": 6
   },
   "quantity": 1
  }
 ],
 "success": true,
 "message": "Cart items retrieved successfully",
 "pagination": {
  "page": 1,
  "limit": 10,
  "total": 2,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
 }
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Summary

- **Method + Path:** `GET http://localhost:3001/api/v1/cart/mine/summary`

- **Sample request body:**

```typescript
v1.get(
    '/mine/:type/summary',
    [
        ...cartTypeValidation,
        Validate.Handle.error
    ],
    controller.getCartSummary as any
);
```

- **Sample response body:**

```json
{
 "data": {
  "totalItems": 1,
  "originalPrice": 3000,
  "totalDiscount": 0,
  "totalPrice": 3000
 },
 "message": "Cart (delivery) summary retrieved successfully",
 "success": true
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Remove product items

- **Method + Path:** `PATCH http://localhost:3001/api/v1/cart/product/remove-items`

- **Sample request body:**

```typescript
v1.patch(
    '/product/remove-items',
    [
        body('product_ids').isArray({
            min: API_MIN_CART_ITEMS_FOR_REMOVAL,
            max: API_MAX_CART_ITEMS_FOR_REMOVAL
        }).notEmpty().withMessage(`Must provide ${API_MIN_CART_ITEMS_FOR_REMOVAL} - ${API_MAX_CART_ITEMS_FOR_REMOVAL} product ids to be removed from the cart.`),
        body('product_ids.*').isInt({
            min: API_MIN_ID_NUMBER
        }).withMessage('Valid product ID is required'),
        Validate.Handle.error
    ],
    controller.removeFromCartByProducts as any
);
```

- **Sample response body:**

```json
{
 "message": "Cart items removed successfully",
 "success": true
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Remove all product_id items

- **Method + Path:** `DELETE http://localhost:3001/api/v1/cart/product/:id`

- **Sample request body:**

```typescript
v1.delete(
    '/product/:id',
    [
        ...Validate.Parameters.id,
        query('quantity').optional({ values: 'falsy' }).isInt({
            min: API_MIN_CART_ITEMS_FOR_REMOVAL,
            max: API_MAX_CART_ITEMS_FOR_REMOVAL
        }).withMessage(`Must provide ${API_MIN_CART_ITEMS_FOR_REMOVAL} - ${API_MAX_CART_ITEMS_FOR_REMOVAL} product ids to be removed from the cart.`),
        Validate.Handle.error
    ],
    controller.removeFromCartByProduct as any
);
```

- **Sample response body:**

```json
{
 "message": "Item removed from cart successfully",
 "success": true
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Get cart

- **Method + Path:** `GET http://localhost:3001/api/v1/cart`

- **Sample request body:**

```typescript
v1.get(
    '/',
    validatePagination,
    controller.getAllCartItems as any
);
```

- **Sample response body:**

```json
{
 "data": [
  {
   "cart_id": 90,
   "user_id": 4,
   "product_id": 1,
   "added_at": "2026-09-04T11:15:50.000Z",
   "quantity": 3,
   "Products": {
    "product_id": 1,
    "name": "BOLO CACAU",
    "description": "Pão Típico da ilha da Madeira , Amassado Com Batata Doce , Cozido a Carvão , Barrado com Manteiga de Alho Caseira",
    "price": "3000",
    "restaurant_id": null,
    "discount": "0",
    "thumbnail": "https://res.cloudinary.com/lkm/image/upload/w_200,h_220,c_pad/production/4206/2024/03/20240314210557022_411a2adbe7274bc2b345dc5a4fe3ae19_jnxqoi.png",
    "product_type": "starter",
    "prep_time_minutes": 0,
    "event_id": null,
    "delisted": false,
    "created_at": "2025-09-23T14:55:20.000Z",
    "updated_at": "2025-10-03T09:27:17.000Z",
    "product_composition": "wheat",
    "Restaurants": null
   },
   "Users": {
    "user_id": 4,
    "name": "Administrador",
    "email": "madeirensemar@madeirenseangola.com"
   }
  },
  {
   "cart_id": 86,
   "user_id": 4,
   "product_id": 7,
   "added_at": "2026-09-02T14:04:01.000Z",
   "quantity": 1,
   "Products": {
    "product_id": 7,
    "name": "\"Ativação do Aplicativo Madeirense\" Bilhete",
    "description": "Venha comemorar a ativação do aplicativo de encomendas do Madeirense.",
    "price": "0",
    "restaurant_id": 4,
    "discount": "0",
    "thumbnail": "https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/",
    "product_type": "ticket",
    "prep_time_minutes": 0,
    "event_id": 2,
    "delisted": false,
    "created_at": "2025-09-23T14:55:20.000Z",
    "updated_at": "2025-09-23T14:55:28.000Z",
    "product_composition": "merchandise",
    "Restaurants": {
     "restaurant_id": 4,
     "name": "Madeirense Mar",
     "location": 6
    }
   },
   "Users": {
    "user_id": 4,
    "name": "Administrador",
    "email": "madeirensemar@madeirenseangola.com"
   }
  },
  {
   "cart_id": 68,
   "user_id": 6,
   "product_id": 7,
   "added_at": "2025-10-07T17:58:03.000Z",
   "quantity": 1,
   "Products": {
    "product_id": 7,
    "name": "\"Ativação do Aplicativo Madeirense\" Bilhete",
    "description": "Venha comemorar a ativação do aplicativo de encomendas do Madeirense.",
    "price": "0",
    "restaurant_id": 4,
    "discount": "0",
    "thumbnail": "https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/",
    "product_type": "ticket",
    "prep_time_minutes": 0,
    "event_id": 2,
    "delisted": false,
    "created_at": "2025-09-23T14:55:20.000Z",
    "updated_at": "2025-09-23T14:55:28.000Z",
    "product_composition": "merchandise",
    "Restaurants": {
     "restaurant_id": 4,
     "name": "Madeirense Mar",
     "location": 6
    }
   },
   "Users": {
    "user_id": 6,
    "name": "Roberto de Carvalho",
    "email": "rcesar221@hotmail.com"
   }
  }
 ],
 "success": true,
 "message": "All cart items retrieved successfully",
 "pagination": {
  "page": 1,
  "limit": 10,
  "total": 3,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
 }
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Get cart item

- **Method + Path:** `GET http://localhost:3001/api/v1/cart/:id`

- **Sample request body:**

```typescript
v1.get(
    '/:id',
    validateId,
    controller.getCartItemById as any
);
```

- **Sample response body:**

```json
{
 "data": {
  "cart_id": 68,
  "user_id": 6,
  "product_id": 7,
  "added_at": "2025-10-07T17:58:03.000Z",
  "quantity": 1,
  "Products": {
   "product_id": 7,
   "name": "\"Ativação do Aplicativo Madeirense\" Bilhete",
   "description": "Venha comemorar a ativação do aplicativo de encomendas do Madeirense.",
   "price": "0",
   "restaurant_id": 4,
   "discount": "0",
   "thumbnail": "https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/",
   "product_type": "ticket",
   "prep_time_minutes": 0,
   "event_id": 2,
   "delisted": false,
   "created_at": "2025-09-23T14:55:20.000Z",
   "updated_at": "2025-09-23T14:55:28.000Z",
   "product_composition": "merchandise",
   "Restaurants": {
    "restaurant_id": 4,
    "name": "Madeirense Mar",
    "location": 6
   }
  },
  "Users": {
   "user_id": 6,
   "name": "Roberto de Carvalho",
   "email": "rcesar221@hotmail.com"
  }
 },
 "success": true,
 "message": "Cart item retrieved successfully"
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### Remove cart item

- **Method + Path:** `DELETE http://localhost:3001/api/v1/cart/:id`

- **Sample request body:**

```typescript
v1.delete(
    '/:id',
    validateId,
    controller.removeFromCart as any
);
```

- **Sample response body:**

```json
{
 "message": "Item removed from cart successfully",
 "success": true
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---
