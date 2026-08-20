USE madeirense;
/** -------------------------------------------------------------------------------------------------------------------------- */

/** -- PRODUCTS ----------------------------------------------------------------------------- */
CREATE TABLE `Coupons` (
  `coupon_id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `discount` decimal(5,2) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Products` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `restaurant_id` int(11) DEFAULT NULL,
  `discount` decimal(5,2) NOT NULL DEFAULT 0.00,
  `thumbnail` varchar(255) DEFAULT NULL,
  `product_type` enum('starter','garnish','main','dessert','beverage','ticket') DEFAULT NULL,
  `product_composition` enum('meat','fish','vegetable','liquid','mixed') DEFAULT NULL,
  `prep_time_minutes` int(11) NOT NULL DEFAULT 0,
  `event_id` int(11) DEFAULT NULL,
  `delisted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`product_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `Products_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE,
  CONSTRAINT `Products_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `Restaurant_Events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/** ----------------------------------------------------------------------------------------- */


/** -- USERS -------------------------------------------------------------------------------- */
CREATE TABLE `Users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `user_role` enum('Customer','Staff','Admin','Driver','System','Ghost') NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Credentials` (
  `credential_id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`credential_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Blocked_Users` (
  `block_id` int(11) NOT NULL AUTO_INCREMENT,
  `blocked_user_id` int(11) NOT NULL,
  `blocked_by_type` enum('restaurant','admin','user') NOT NULL,
  `blocked_by_id` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `blocked_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`block_id`),
  KEY `blocked_user_id` (`blocked_user_id`),
  CONSTRAINT `Blocked_Users_ibfk_1` FOREIGN KEY (`blocked_user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `User_Reviews` (
  `review_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`review_id`),
  KEY `user_id` (`user_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `User_Reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `User_Reviews_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `User_Comments` (
  `comment_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`comment_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `User_Comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `User_Comments_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Favorites` (
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `Favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Favorites_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Cart` (
  `cart_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `added_at` timestamp NULL DEFAULT current_timestamp(),
  `quantity` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`cart_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `Cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Cart_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  `seen` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`notification_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Push_Notification_Subscriptions` (
  `subscription_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `target_endpoint` varchar(2048) NOT NULL,
  `expiration_time` int(11) NOT NULL,
  `p256dh` varchar(255) DEFAULT NULL,
  `auth` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Push_Notification_Subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/** ----------------------------------------------------------------------------------------- */


/** -- BUSINESS ----------------------------------------------------------------------------- */
/** -- ESTABLISHMENTS ----------------------------------------- */
CREATE TABLE `Resorts` (
  `resort_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`resort_id`),
  KEY `Restaurants_ibfk_1` (`location`),
  CONSTRAINT `DeliveryLocations_ibfk_1` FOREIGN KEY (`location`) REFERENCES `Delivery_Locations` (`location_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Amenities` (
  `amenity_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Bed_Types` (
  `bed_type_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `sleeps` int(11) NOT NULL
);

CREATE TABLE `Resort_Rooms` (
  `room_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `price_per_night` decimal(10,2) NOT NULL,
  `availability` ENUM('Available','Limited','Sold Out') DEFAULT 'Available',
  `quantity` int(11) DEFAULT 1,
  `resort_id` int(11) NOT NULL,
  PRIMARY KEY (`room_id`),
  KEY `Resort_Rooms_ibfk_1` (`resort_id`),
  CONSTRAINT `Resort_Rooms_ibfk_1` FOREIGN KEY (`resort_id`) REFERENCES `Resorts` (`resort_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Room_Bed_Options` (
  `room_id` INT NOT NULL,
  `bed_type_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`room_id`, `bed_type_id`),
  FOREIGN KEY (`room_id`) REFERENCES `Resort_Rooms` (`room_id`) ON DELETE CASCADE,
  FOREIGN KEY (`bed_type_id`) REFERENCES `Resort_Bed_Types` (`bed_type_id`) ON DELETE CASCADE
);

CREATE TABLE `Resort_Room_Amenities` (
  `room_id` INT NOT NULL,
  `amenity_id` INT NOT NULL,
  PRIMARY KEY (`room_id`, `amenity_id`),
  KEY `Resort_Room_Amenities_ibfk_1` (`room_id`),
  KEY `Resort_Room_Amenities_ibfk_2` (`amenity_id`),
  CONSTRAINT `Resort_Room_Amenities_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `Resort_Rooms` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `Resort_Room_Amenities_ibfk_2` FOREIGN KEY (`amenity_id`) REFERENCES `Resort_Amenities` (`amenity_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Rooms_Media` (
  `media_id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `media_url` varchar(255) DEFAULT NULL,
  `media_type` ENUM('Thumbnail','Video') NOT NULL,
  PRIMARY KEY (`media_id`),
  KEY `Resort_Rooms_Media_ibfk_1` (`room_id`),
  CONSTRAINT `Resort_Rooms_Media_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `Resort_Rooms` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Bookings` (
  `booking_id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `room_id` INT(11) NOT NULL,
  `resort_id` INT(11) NOT NULL,
  `payment_id` INT(11) NOT NULL,
  `check_in` DATE NOT NULL,
  `check_out` DATE NOT NULL,
  `guests` INT(11) NOT NULL DEFAULT 1,
  `status` ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`booking_id`),
  KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`),
  KEY `resort_id` (`resort_id`),
  CONSTRAINT `Resort_Bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Resort_Bookings_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `Resort_Rooms` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `Resort_Bookings_ibfk_3` FOREIGN KEY (`resort_id`) REFERENCES `Resorts` (`resort_id`) ON DELETE CASCADE,
  CONSTRAINT `Resort_Bookings_ibfk_4` FOREIGN KEY (`payment_id`) REFERENCES Resort_Booking_Payments (`payment_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Booking_Cancellations`(
  `booking_id` INT NOT NULL PRIMARY KEY,
  `reason_code` ENUM(
    'GUEST_NO_SHOW',
    'BAD_WEATHER',
    'PAYMENT_ISSUE',
    'DOUBLE_BOOKING',
    'PERSONAL_EMERGENCY',
    'TRAVEL_RESTRICTIONS',
    'PROPERTY_MAINTENANCE',
    'OWNER_CANCELLATION'
  ) NOT NULL,
  FOREIGN KEY (`booking_id`) REFERENCES `Resort_Bookings` (`booking_id`) ON DELETE CASCADE
);

CREATE TABLE `Resort_Booking_History` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `booking_id` (`booking_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Resort_Booking_History_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `Resort_Bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `Resort_Booking_History_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Booking_Cancellation_Policies` (
  `policy_id` INT AUTO_INCREMENT PRIMARY KEY,
  `description` VARCHAR(255) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Booking_Payments` (
  `payment_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Credit Card','Debit Card','PayPal','Cash','Bank Transfer','Payment Reference','Multicaixa Express','Offer') NOT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`payment_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Resort_Booking_Payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Resort_Chat_Messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `sender_type` enum('user','resort') NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message_text` text NOT NULL,
  `sent_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  KEY `booking_id` (`booking_id`),
  KEY `fk_sender` (`sender_id`),
  CONSTRAINT `Resort_Chat_Messages_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `Resort_Bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_resort_sender` FOREIGN KEY (`sender_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Restaurants` (
  `restaurant_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `ttp` int(11) NOT NULL,
  `ttd` int(11) NOT NULL,
  PRIMARY KEY (`restaurant_id`),
  KEY `Restaurants_ibfk_1` (`location`),
  CONSTRAINT `Restaurants_ibfk_1` FOREIGN KEY (`location`) REFERENCES `Delivery_Locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Workstations` (
  `workstation_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`workstation_id`),
  UNIQUE KEY `user_id` (`user_id`,`restaurant_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `Workstations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Workstations_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Restaurant_Hours` (
  `hours_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `opening_time` time NOT NULL,
  `closing_time` time NOT NULL,
  `is_closed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`hours_id`),
  UNIQUE KEY `restaurant_id` (`restaurant_id`,`day_of_week`),
  CONSTRAINT `Restaurant_Hours_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Restaurant_Events` (
  `event_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `event_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `spots` int(11) DEFAULT NULL,
  `status` enum('upcoming','cancelled','ongoing','expired') NOT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`event_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `Restaurant_Events_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Tickets_Purchased` (
  `ticket_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `price` decimal(10,2) NOT NULL,
  `purchased_at` datetime DEFAULT current_timestamp(),
  `expiry_date` datetime NOT NULL,
  `expired` tinyint(1) DEFAULT 0,
  `validated_at` datetime DEFAULT NULL,
  `validator_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`ticket_id`),
  KEY `user_id` (`user_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `order_id` (`order_id`),
  KEY `validator_id` (`validator_id`),
  KEY `idx_expired` (`expired`),
  KEY `idx_event_expired` (`event_id`,`expired`),
  CONSTRAINT `Tickets_Purchased_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Tickets_Purchased_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE,
  CONSTRAINT `Tickets_Purchased_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `Tickets_Purchased_ibfk_4` FOREIGN KEY (`event_id`) REFERENCES `Restaurant_Events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `Tickets_Purchased_ibfk_5` FOREIGN KEY (`validator_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/** ----------------------------------------------------------- */

/** -- ORDERS & DELIVERIES ------------------------------------ */
CREATE TABLE `Orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `status` enum('pending','confirmed','preparing','ready','assigned','delivered','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `total_amount` decimal(10,2) NOT NULL,
  `delivery_address` int(11) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `special_instructions` text DEFAULT NULL,
  `coupon_id` int(11) DEFAULT NULL,
  `courier_id` int(11) DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `Orders_ibfk_3` (`delivery_address`),
  KEY `fk_coupon` (`coupon_id`),
  KEY `fk_courier` (`courier_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `Orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Orders_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE,
  CONSTRAINT `Orders_ibfk_3` FOREIGN KEY (`delivery_address`) REFERENCES `Delivery_Locations` (`location_id`) ON DELETE CASCADE,
  CONSTRAINT `Orders_ibfk_4` FOREIGN KEY (`event_id`) REFERENCES `Restaurant_Events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `Coupons` (`coupon_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_courier` FOREIGN KEY (`courier_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Chat_Messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `sender_type` enum('user','restaurant') NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message_text` text NOT NULL,
  `sent_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  KEY `order_id` (`order_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `fk_sender` (`sender_id`),
  CONSTRAINT `Chat_Messages_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `Chat_Messages_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sender` FOREIGN KEY (`sender_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Order_Items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `Order_Items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `Order_Items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Order_History` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('pending','confirmed','preparing','ready','assigned','delivered','cancelled') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Order_History_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `Order_History_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Payments` (
  `payment_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Credit Card','Debit Card','PayPal','Cash','Bank Transfer','Payment Reference','Multicaixa Express','Offer') NOT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`payment_id`),
  KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `Payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Courier_Positions` (
  `position_id` int(11) NOT NULL AUTO_INCREMENT,
  `courier_id` int(11) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp(),
  `speed_kph` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`position_id`),
  KEY `courier_id` (`courier_id`),
  CONSTRAINT `Courier_Positions_ibfk_1` FOREIGN KEY (`courier_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Courier_Reallocation_Requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `courier_id` int(11) NOT NULL,
  `requested_courier_id` int(11) DEFAULT NULL,
  `motive` enum('VEHICLE-ISSUE','UNAVAILABLE','DRIVER-IS-FAR','TARDINESS','BAD-ALLOCATION') NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`request_id`),
  KEY `order_id` (`order_id`),
  KEY `courier_id` (`courier_id`),
  KEY `requested_courier_id` (`requested_courier_id`),
  CONSTRAINT `Courier_Reallocation_Requests_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `Courier_Reallocation_Requests_ibfk_2` FOREIGN KEY (`courier_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `Courier_Reallocation_Requests_ibfk_3` FOREIGN KEY (`requested_courier_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/** ----------------------------------------------------------- */
/** ----------------------------------------------------------------------------------------- */

/** -- MANAGEMENT --------------------------------------------------------------------------- */
CREATE TABLE `Delivery_Locations` (
  `location_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `postal_code` varchar(20) NOT NULL,
  `latitude` decimal(9,6) NOT NULL,
  `longitude` decimal(9,6) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `special_instructions` text DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `street_number` varchar(50) DEFAULT NULL,
  `street_name` varchar(255) DEFAULT NULL,
  `neighborhood` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) NOT NULL,
  `preferred` tinyint(1) DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`location_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Delivery_Locations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Global_Settings` (
  `setting_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_threshold` int(11) NOT NULL DEFAULT 0,
  `avg_ttp` int(11) NOT NULL DEFAULT 20,
  `avg_ttd` int(11) NOT NULL DEFAULT 20,
  `prep_buffer` int(11) NOT NULL DEFAULT 20,
  `auto_assign_driver` tinyint(1) DEFAULT 0,
  `change_version` char(36) NOT NULL,
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Global_Settings_Eligible_Payment_Types` (
  `setting_id` int(11) NOT NULL,
  `payment_method` enum('Credit Card','Debit Card','PayPal','Cash','Bank Transfer','Payment Reference','Multicaixa Express','Offer') NOT NULL,
  PRIMARY KEY (`setting_id`,`payment_method`),
  CONSTRAINT `Global_Settings_Eligible_Payment_Types_ibfk_1` FOREIGN KEY (`setting_id`) REFERENCES `Global_Settings` (`setting_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/** ----------------------------------------------------------------------------------------- */

/** -------------------------------------------------------------------------------------------------------------------------- */