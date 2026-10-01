# Madeirense Mar — Backend API Reference

Fill this in and share it back. Delete any section that doesn't apply, and duplicate
the "Endpoint" block for every additional endpoint you have (menu, categories,
modifiers, restaurant info, etc.) — the more the better, but don't block on
covering everything if you want to start with just the version + menu endpoints.

---

## 1. Versioning strategy

> This is the most important section — it decides the whole caching mechanism.

```sql
CREATE TABLE `Global_Settings` (
  `setting_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_threshold` int(11) NOT NULL DEFAULT 0,
  `avg_ttp` int(11) NOT NULL DEFAULT 20,
  `avg_ttd` int(11) NOT NULL DEFAULT 20,
  `prep_buffer` int(11) NOT NULL DEFAULT 20,
  `auto_assign_driver` tinyint(1) DEFAULT 0,
  `change_version` char(36) NOT NULL, -- This is a UUID
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Is there a single global version, or one per resource?**
  (e.g. one `settingsVersion` for everything, vs. `menuVersion`, `categoriesVersion` separately)

- **What is the version value?** (pick one)
  - [ ] Integer that increments (e.g. `12`, `13`, ...)
  - [ ] Hash / ETag string
  - [ ] Timestamp (`updatedAt`)
  - [x] Other: UUID

- **How do you check the version?**
  - [x] Dedicated lightweight endpoint (e.g. `GET http://localhost:3001/api/v1/global-settings/version`)
  - [ ] It's embedded in the response of a broader "app config" endpoint
  - [ ] Standard HTTP caching (`ETag` / `If-None-Match` → `304 Not Modified`)
  - [ ] Other: ____________

**Person:** I feel as though there are better and more effective ways to do this.

- **Sample response** of whatever returns the version:

```json
/** GET http://localhost:3001/api/v1/global-settings */
{
 "data": {
  "setting_id": 1,
  "order_threshold": 40,
  "avg_ttp": 20,
  "avg_ttd": 20,
  "prep_buffer": 20,
  "auto_assign_driver": true,
  "change_version": "3770e916-ee6d-453a-9267-4d754595a55b",
  "Global_Settings_Eligible_Payment_Types": [
   {
    "payment_method": "Credit_Card"
   },
   {
    "payment_method": "Debit_Card"
   },
   {
    "payment_method": "Payment_Reference"
   }
  ]
 },
 "message": "Fetched settings",
 "success": true
}

/** GET http://localhost:3001/api/v1/global-settings/version */
{
 "data": "3770e916-ee6d-453a-9267-4d754595a55b",
 "message": "Fetched settings version",
 "success": true
}
```

---

## 2. Endpoint

### 1. Menu

- **Method + Path:** `GET http://localhost:3001/api/v1/products`
- **Auth required?:** no
- **Query params / headers used:** none
  - **Params:** `?group=menu`
- **Sample response body:**

```json
{
 "data": [
  {
   "discount": 10,
   "price": 25000,
   "product_id": 9,
   "name": "Thai Noodles",
   "description": "Fresco e ricoc",
   "restaurant_id": null,
   "thumbnail": "https://ucarecdn.com/07bbb254-0fce-4870-892c-4232f0b74d29/",
   "product_type": "main",
   "prep_time_minutes": 0,
   "event_id": null,
   "delisted": false,
   "created_at": "2025-09-23T14:55:20.000Z",
   "updated_at": "2025-10-07T17:35:12.000Z",
   "product_composition": "vegan",
   "Restaurants": null,
   "_count": {
    "User_Comments": 6,
    "Order_Items": 1
   }
  },
  {
   "discount": 0,
   "price": 12000,
   "product_id": 11,
   "name": "Peixe muito-bom",
   "description": "Um bom peixe, que bom",
   "restaurant_id": null,
   "thumbnail": "https://ucarecdn.com/a78b1fc5-aeea-40df-adb7-565b3c887cc3/",
   "product_type": "main",
   "prep_time_minutes": 20,
   "event_id": null,
   "delisted": false,
   "created_at": "2026-08-20T10:58:56.000Z",
   "updated_at": "2026-08-20T10:58:56.000Z",
   "product_composition": "fish",
   "Restaurants": null,
   "_count": {
    "User_Comments": 0,
    "Order_Items": 0
   }
  },
  {
   "discount": 0,
   "price": 3000,
   "product_id": 1,
   "name": "BOLO CACAU",
   "description": "Pão Típico da ilha da Madeira , Amassado Com Batata Doce , Cozido a Carvão , Barrado com Manteiga de Alho Caseira",
   "restaurant_id": null,
   "thumbnail": "https://res.cloudinary.com/lkm/image/upload/w_200,h_220,c_pad/production/4206/2024/03/20240314210557022_411a2adbe7274bc2b345dc5a4fe3ae19_jnxqoi.png",
   "product_type": "starter",
   "prep_time_minutes": 0,
   "event_id": null,
   "delisted": false,
   "created_at": "2025-09-23T14:55:20.000Z",
   "updated_at": "2025-10-03T09:27:17.000Z",
   "product_composition": "wheat",
   "Restaurants": null,
   "_count": {
    "User_Comments": 1,
    "Order_Items": 3
   }
  },
  {
   "discount": 0,
   "price": 500,
   "product_id": 10,
   "name": "Arroz branco",
   "description": "Arroz branco para acompanhamento",
   "restaurant_id": null,
   "thumbnail": "https://ucarecdn.com/d8c288b7-9f86-4ba0-8281-a70230eabf5e/",
   "product_type": "garnish",
   "prep_time_minutes": 3,
   "event_id": null,
   "delisted": false,
   "created_at": "2026-08-20T10:07:11.000Z",
   "updated_at": "2026-08-20T10:07:11.000Z",
   "product_composition": "vegan",
   "Restaurants": null,
   "_count": {
    "User_Comments": 0,
    "Order_Items": 0
   }
  },
  {
   "discount": 0,
   "price": 25000,
   "product_id": 12,
   "name": "Alcatra",
   "description": "Carne muito boa, sim",
   "restaurant_id": null,
   "thumbnail": "https://ucarecdn.com/4386d29a-f686-4581-b033-0fe09c7a24af/",
   "product_type": "main",
   "prep_time_minutes": 30,
   "event_id": null,
   "delisted": false,
   "created_at": "2026-08-20T11:04:30.000Z",
   "updated_at": "2026-08-20T11:04:30.000Z",
   "product_composition": "meat",
   "Restaurants": null,
   "_count": {
    "User_Comments": 0,
    "Order_Items": 0
   }
  }
 ],
 "message": "Products retrieved successfully",
 "pagination": {
  "page": 1,
  "limit": 10,
  "total": 5,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
 },
 "success": true
}
```

- **Notes** (pagination? nested resources? nullable fields? locale variants?):

---

### 2. Restaurant

- **Method + Path:** `GET http://localhost:3001/api/v1/restaurants`
- **Auth required?:** no
- **Query params / headers used:** none
- **Sample response body:**

```json
{
 "data": [
  {
   "restaurant_id": 3,
   "name": "Madeirense (Cidade)",
   "location": 4,
   "created_at": "2025-06-19T21:15:46.000Z",
   "updated_at": "2025-08-22T14:41:37.000Z",
   "thumbnail_url": "https://www.madeirenseangola.com/images/DSC01729.jpg",
   "ttp": 25,
   "ttd": 20,
   "Products": [
    {
     "product_id": 8,
     "name": "\"Teste testes\" Bilhete",
     "price": "0",
     "discount": "0"
    }
   ],
   "Delivery_Locations": {
    "location_id": 4,
    "address": "Rua da Pomobel, Luanda, Angola",
    "latitude": "-8.907857",
    "longitude": "13.161468"
   },
   "Restaurant_Hours": [
    {
     "hours_id": 1,
     "day_of_week": "Sunday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 2,
     "day_of_week": "Monday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 3,
     "day_of_week": "Tuesday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 4,
     "day_of_week": "Wednesday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 5,
     "day_of_week": "Thursday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 6,
     "day_of_week": "Friday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 7,
     "day_of_week": "Saturday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    }
   ],
   "_count": {
    "Orders": 7,
    "Products": 1
   }
  },
  {
   "restaurant_id": 4,
   "name": "Madeirense Mar",
   "location": 6,
   "created_at": "2025-06-19T23:39:14.000Z",
   "updated_at": "2025-08-22T14:41:37.000Z",
   "thumbnail_url": "https://www.madeirenseangola.com/images/DSC05940.jpg",
   "ttp": 25,
   "ttd": 20,
   "Products": [
    {
     "product_id": 7,
     "name": "\"Ativação do Aplicativo Madeirense\" Bilhete",
     "price": "0",
     "discount": "0"
    }
   ],
   "Delivery_Locations": {
    "location_id": 6,
    "address": "Rua da Pomobel, Luanda, Angola",
    "latitude": "-8.907857",
    "longitude": "13.161468"
   },
   "Restaurant_Hours": [
    {
     "hours_id": 8,
     "day_of_week": "Sunday",
     "is_closed": false,
     "opening_time": "1970-01-01T08:00:00.000Z",
     "closing_time": "1970-01-01T18:00:00.000Z"
    },
    {
     "hours_id": 9,
     "day_of_week": "Monday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 10,
     "day_of_week": "Tuesday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 11,
     "day_of_week": "Wednesday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 12,
     "day_of_week": "Thursday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 13,
     "day_of_week": "Friday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    },
    {
     "hours_id": 14,
     "day_of_week": "Saturday",
     "is_closed": false,
     "opening_time": "1970-01-01T07:00:00.000Z",
     "closing_time": "1970-01-01T21:00:00.000Z"
    }
   ],
   "_count": {
    "Orders": 2,
    "Products": 1
   }
  }
 ],
 "message": "Restaurants retrieved successfully",
 "pagination": {
  "page": 1,
  "limit": 10,
  "total": 2,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
 },
 "success": true
}
```

- **Notes:**

---

### 3. Restaurant event

- **Method + Path:** `GET http://localhost:3001/api/v1/restaurant-events`
- **Auth required?:** no
- **Query params / headers used:** none
- **Sample response body:**

```json
{
 "data": [
  {
   "price": 0,
   "event_id": 2,
   "restaurant_id": 4,
   "name": "Ativação do Aplicativo Madeirense",
   "description": "Venha comemorar a ativação do aplicativo de encomendas do Madeirense.",
   "event_date": "2025-07-23T00:00:00.000Z",
   "start_time": "1970-01-01T14:00:00.000Z",
   "end_time": "1970-01-01T22:59:00.000Z",
   "thumbnail_url": "https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/",
   "video_url": "https://ucarecdn.com/fcb34e33-fe88-4f26-8e9a-41700a54101c/video.mp4",
   "created_at": "2025-07-16T15:42:09.000Z",
   "spots": null,
   "status": "upcoming",
   "updated_at": "2025-09-23T14:56:14.000Z",
   "Restaurants": {
    "restaurant_id": 4,
    "name": "Madeirense Mar",
    "location": 6
   },
   "Products": [
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
     "product_composition": "merchandise"
    }
   ],
   "_count": {
    "Products": 1,
    "Tickets_Purchased": 2
   }
  },
  {
   "price": 0,
   "event_id": 3,
   "restaurant_id": 3,
   "name": "Teste testes",
   "description": "Muitos testes para a melhor do utilizador final",
   "event_date": "2025-07-23T00:00:00.000Z",
   "start_time": "1970-01-01T14:59:00.000Z",
   "end_time": "1970-01-01T15:00:00.000Z",
   "thumbnail_url": "https://ucarecdn.com/482019d9-765b-49fd-976c-39bd49abc328/",
   "video_url": "https://ucarecdn.com/115a30a5-2e6e-4b35-a690-1de9d743d211/video.mp4",
   "created_at": "2025-07-16T16:00:02.000Z",
   "spots": null,
   "status": "upcoming",
   "updated_at": "2025-09-23T14:56:14.000Z",
   "Restaurants": {
    "restaurant_id": 3,
    "name": "Madeirense (Cidade)",
    "location": 4
   },
   "Products": [
    {
     "product_id": 8,
     "name": "\"Teste testes\" Bilhete",
     "description": "Muitos testes para a melhor do utilizador final",
     "price": "0",
     "restaurant_id": 3,
     "discount": "0",
     "thumbnail": "https://ucarecdn.com/482019d9-765b-49fd-976c-39bd49abc328/",
     "product_type": "ticket",
     "prep_time_minutes": 0,
     "event_id": 3,
     "delisted": false,
     "created_at": "2025-09-23T14:55:20.000Z",
     "updated_at": "2025-09-23T14:55:28.000Z",
     "product_composition": "merchandise"
    }
   ],
   "_count": {
    "Products": 1,
    "Tickets_Purchased": 2
   }
  }
 ],
 "message": "Restaurant events retrieved successfully",
 "pagination": {
  "page": 1,
  "limit": 10,
  "total": 2,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
 },
 "success": true
}
```

- **Notes:**

---

## 3. Data model notes

- Does a menu item embed its category, or reference it by ID?
- Any modifiers/variants/options nested under an item?
- Any fields that change frequently vs. ones that are effectively static (e.g. prices vs. descriptions)?
  - For products, the name, price, discount, description and thumbnail may change. But that's about it.
- Any localization (pt/en) baked into the response, or separate endpoints per locale?
  - No localization in the API. That's done directly in the API.

---

## 4. Existing Flutter data layer (optional but helpful)

Paste (or summarize) your current:

- Repository/service interface for fetching menu data

```dart
import 'package:dio/dio.dart';
import 'package:madeirense_mar/core/network/api_client.dart';
import 'package:madeirense_mar/core/network/api_exception.dart';
import 'package:madeirense_mar/data/models/api/api_response.dart';
import 'package:madeirense_mar/data/models/product/product.dart';

abstract class ProductRepository {
  Future<List<Product>> getMenu();
}

class ProductRepositoryImplementation implements ProductRepository {
  final APIClient client;

  ProductRepositoryImplementation(this.client);

  @override
  Future<List<Product>> getMenu() async {
    try {
      final response = await client.dio.get(
        '/v1/products',
        queryParameters: {'group': 'menu'},
      );

      final apiResponse = APIResponse<List<Product>>.fromJson(
        response.data, 
        (json) => (json as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList()
      );

      if (!apiResponse.success || apiResponse.data == null) {
        throw APIException(
          apiResponse.message,
          code: apiResponse.code,
          errors: apiResponse.errors,
        );
      }

      return apiResponse.data!;
    } on DioException catch (e) {
      throw APIException.fromDioException(e);
    }
  }
}
```

- The Riverpod provider(s) that expose it

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../core/network/api_client_provider.dart';
import 'product_repository.dart';


part 'product_repository_provider.g.dart';

@Riverpod(keepAlive: true)
ProductRepositoryImplementation productRepository(Ref ref){
  return ProductRepositoryImplementation(ref.watch(apiClientProvider));
}
```

- Your current `json_serializable` model(s) for a menu item / category

```dart
```

**Person**: I'll share the ones I have.

```dart
import 'package:json_annotation/json_annotation.dart';
import 'package:madeirense_mar/data/models/product/product_composition.dart';
import 'package:madeirense_mar/data/models/product/product_type.dart';

part 'product.g.dart';

@JsonSerializable()
class Product {
  final int product_id;
  final String name;
  final String description;
  final int price;
  final int? restaurant_id;
  final int? prep_time_minutes;
  final int? discount;
  final String? thumbnail;
  @JsonKey(unknownEnumValue: ProductComposition.unknown)
  final ProductComposition product_composition;
  @JsonKey(unknownEnumValue: ProductType.unknown)
  final ProductType product_type;

  Product({
    required this.product_id,
    required this.name,
    required this.description,
    required this.price,
    required this.restaurant_id,
    required this.prep_time_minutes,
    required this.discount,
    required this.thumbnail,
    required this.product_composition,
    required this.product_type
  });

  factory Product.fromJson(Map<String, dynamic> json) =>
      _$ProductFromJson(json);

  Map<String, dynamic> toJson() => _$ProductToJson(this);
}
```
