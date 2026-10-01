-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: srv1284.hstgr.io    Database: u322092759_PACIFICO
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Blocked_Users`
--

DROP TABLE IF EXISTS `Blocked_Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Blocked_Users_ibfk_1` FOREIGN KEY (`blocked_user_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Blocked_Users`
--

LOCK TABLES `Blocked_Users` WRITE;
/*!40000 ALTER TABLE `Blocked_Users` DISABLE KEYS */;
/*!40000 ALTER TABLE `Blocked_Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Cart`
--

DROP TABLE IF EXISTS `Cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Cart` (
  `cart_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `added_at` timestamp NULL DEFAULT current_timestamp(),
  `quantity` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`cart_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `Cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `Cart_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Cart`
--

LOCK TABLES `Cart` WRITE;
/*!40000 ALTER TABLE `Cart` DISABLE KEYS */;
INSERT INTO `Cart` VALUES (68,6,7,'2025-10-07 16:58:03',1);
/*!40000 ALTER TABLE `Cart` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Chat_Messages`
--

DROP TABLE IF EXISTS `Chat_Messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Chat_Messages_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`),
  CONSTRAINT `Chat_Messages_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`),
  CONSTRAINT `fk_sender` FOREIGN KEY (`sender_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Chat_Messages`
--

LOCK TABLES `Chat_Messages` WRITE;
/*!40000 ALTER TABLE `Chat_Messages` DISABLE KEYS */;
INSERT INTO `Chat_Messages` VALUES (1,2,3,'restaurant',4,'Boa tarde','2025-06-22 21:19:25'),(2,2,3,'restaurant',4,'Meu, caro, como está\'','2025-06-22 21:36:09'),(3,2,3,'restaurant',4,'nrjeoç gferwan  rfwe gre hte €j65tj54wp+o~grew grewht54w+~y5ewy54wºy 54wy54wºpo rewtrew 5tr4wrytre ytrytreyt rete43q t435u try trweyt ewryr ewyt r343y4€','2025-06-22 21:44:12'),(4,2,3,'user',4,'Teste','2025-06-22 22:10:01'),(5,2,3,'user',4,'O que vamos testar?','2025-06-22 22:48:10'),(6,2,3,'user',4,'muito bom','2025-06-22 22:49:33'),(7,2,3,'user',4,'Que ótimo','2025-06-22 23:07:06'),(8,2,3,'user',4,'Olá','2025-06-23 18:44:37'),(9,3,3,'user',4,'Não temos X','2025-06-23 18:47:00'),(10,9,3,'user',6,'Bom dia','2025-09-02 08:47:20'),(11,9,3,'user',6,'como estão','2025-09-02 08:47:45'),(12,9,3,'restaurant',4,'bem','2025-09-02 08:48:07'),(13,9,3,'user',6,'Queria saber quanto tempo vai demorar?','2025-09-02 09:03:55'),(14,9,3,'user',6,'Mais 15mins','2025-09-02 09:48:00'),(15,9,3,'restaurant',4,'Mais 5 dias','2025-09-02 10:14:05'),(16,9,3,'user',6,'Sério?','2025-09-02 10:14:24');
/*!40000 ALTER TABLE `Chat_Messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Coupons`
--

DROP TABLE IF EXISTS `Coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Coupons`
--

LOCK TABLES `Coupons` WRITE;
/*!40000 ALTER TABLE `Coupons` DISABLE KEYS */;
INSERT INTO `Coupons` VALUES (2,'FRIDAY-SPECIAL',5.00,'2025-08-29 00:00:00','2025-09-25 10:27:27','2025-09-25 10:27:27'),(4,'DEVELOPMENT-CODE',13.00,'2025-08-29 00:00:00','2025-09-25 10:27:27','2025-09-25 10:27:27'),(5,'TESTE-PRIMEIRO-UM',50.00,'2025-08-31 00:00:00','2025-09-25 10:27:27','2025-09-25 10:27:27'),(6,'CUPON-MAGINIFICO',10.00,'2025-08-30 00:00:00','2025-09-25 10:27:27','2025-09-25 10:27:27');
/*!40000 ALTER TABLE `Coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Courier_Positions`
--

DROP TABLE IF EXISTS `Courier_Positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Courier_Positions` (
  `position_id` int(11) NOT NULL AUTO_INCREMENT,
  `courier_id` int(11) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp(),
  `speed_kph` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`position_id`),
  KEY `courier_id` (`courier_id`),
  CONSTRAINT `Courier_Positions_ibfk_1` FOREIGN KEY (`courier_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Courier_Positions`
--

LOCK TABLES `Courier_Positions` WRITE;
/*!40000 ALTER TABLE `Courier_Positions` DISABLE KEYS */;
INSERT INTO `Courier_Positions` VALUES (3,12,-8.9078570,13.1614680,'2025-07-04 13:44:22',65.00),(4,8,-8.9078570,13.1614680,'2025-07-04 13:46:17',65.00),(5,8,-8.9078570,13.1614680,'2025-08-29 14:40:43',65.00);
/*!40000 ALTER TABLE `Courier_Positions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Courier_Reallocation_Requests`
--

DROP TABLE IF EXISTS `Courier_Reallocation_Requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Courier_Reallocation_Requests_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`),
  CONSTRAINT `Courier_Reallocation_Requests_ibfk_2` FOREIGN KEY (`courier_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `Courier_Reallocation_Requests_ibfk_3` FOREIGN KEY (`requested_courier_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Courier_Reallocation_Requests`
--

LOCK TABLES `Courier_Reallocation_Requests` WRITE;
/*!40000 ALTER TABLE `Courier_Reallocation_Requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `Courier_Reallocation_Requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Credentials`
--

DROP TABLE IF EXISTS `Credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Credentials` (
  `credential_id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`credential_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Credentials`
--

LOCK TABLES `Credentials` WRITE;
/*!40000 ALTER TABLE `Credentials` DISABLE KEYS */;
INSERT INTO `Credentials` VALUES (1,'madeirensemar@madeirenseangola.com','861ebe4d73f3768de0f04293e247f7734defa1cdc6366a39e73a1d3a370ca7082c1b711de707999ded9b04cc370019aa95ceef814f3df4249c96814b8c7e46f6','2025-05-23 15:23:47'),(2,'estrela@madeirenseangola.com','6a53ab941f2fcbbcc6c743a61b980523961aa7dd994770ebf960f74eb2dbfded69f21ddce12234adac5c03232bd309f7c62e2dad7ef4fbe0e840d8601b60f857','2025-05-25 18:44:16'),(3,'danielasandao@gmail.com','d000fa626f9118a582060d8361e6d7d517d17f2c16202160b71acec56115dce024e3a29af5acaf548c23a582e5bb4e6d76e756f71ee147b2269f55f8e8f8ecab','2025-06-12 11:52:56'),(4,'larrywallpaper@gmail.com','15990ae5665b2cc65f14a5ff9616f77b9eb5b5613eb30954ae7646cf5395019a67ee6969053591fe6e16f32bffc222eb2e210e8904c7579cd8fd38b6fac22d57','2025-06-23 15:31:47'),(5,'geraldo.primeiro@madeirense.com','7a726c0614149d3fc7c1aaec2907481003347e779828e2eeb51b9e7b4a90c4ff4d4a49ecff23914545558a928a91625acbcc14aa1e1ef58601ca6e565dedaa97','2025-06-23 15:41:17'),(6,'rito.manuel@madeirensemar.ao','bf77a05ae540c5a84e0433fbe38e26537a478eb6c4425f38ccc36be2ca16ac61be8b6a97c0eec0f8574d6ba95736709631ad6ff4b9ef668df675882813846fa5','2025-07-04 12:46:28'),(7,'mbala.camuanhe@madeirensemar.ao','260e9e6bbe99cd9bb71dce88f343f6b4ed11686105c9d3adffce8e630c0cce8ef53be8a471f1b9d50bd60b28082105a8a8513345b6a1a0133c7a72f46ce085a8','2025-07-04 13:33:10'),(10,'rcesar221@hotmail.com','496308570eeda710161875c1ccf07c14011d90465908ee7f2e7afe0197c1f1d9d5cc5ea74b26f158fdb158121ba0d9fdc48028e7ce33910456fc0fffe6c01e2a','2025-08-27 13:03:58');
/*!40000 ALTER TABLE `Credentials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Delivery_Locations`
--

DROP TABLE IF EXISTS `Delivery_Locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Delivery_Locations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Delivery_Locations`
--

LOCK TABLES `Delivery_Locations` WRITE;
/*!40000 ALTER TABLE `Delivery_Locations` DISABLE KEYS */;
INSERT INTO `Delivery_Locations` VALUES (2,13,'','Luanda','',0.000000,0.000000,'2025-06-15 22:15:32',NULL,'',NULL,NULL,'Ingombota','Luanda','Angola',0,'2025-09-25 10:28:16'),(4,4,'Rua da Pomobel, Luanda, Angola','Luanda','',-8.907857,13.161468,'2025-06-19 20:15:44',NULL,'Madeirense (Cidade)','','','','Luanda','Angola',0,'2025-09-25 10:28:16'),(6,4,'Rua da Pomobel, Luanda, Angola','Luanda','',-8.907857,13.161468,'2025-06-19 22:39:11',NULL,'Madeirense (Futungo)','','','','Luanda','Angola',0,'2025-09-25 10:28:16'),(7,10,'R. Cónego Manuel das Neves 204, Luanda, Angola','Luanda','',-8.815391,13.246056,'2025-06-23 18:52:56','Rua tem só um sentido','Trabalho','204','Rua Cónego Manuel das Neves','Ingombota','Luanda','Angola',0,'2025-09-25 10:28:16'),(8,13,'','Luanda','',0.000000,0.000000,'2025-08-19 14:34:50',NULL,'',NULL,NULL,'Ingombota','Luanda','Angola',0,'2025-09-25 10:28:16'),(9,4,'Cidade Financeira, Via S8, Luanda, Angola','Luanda','',-8.920260,13.173707,'2025-08-19 14:39:47','','Casa','','Via S8','','Luanda','Angola',1,'2025-09-25 10:28:16'),(10,4,'Casa S/N Fubu, junto, 36MG+7WJ Deskontão, Luanda, Angola','Luanda','',-8.916786,13.227196,'2025-08-19 14:44:37','Dentro do deskontão','Universiade','','','','Luanda','Angola',0,'2025-09-25 10:28:16'),(11,6,'Cidade Financeira, Via S8, Luanda, Angola','Luanda','',-8.920257,13.173707,'2025-08-27 13:51:15','','Trabalho','','Via S8','','Luanda','Angola',0,'2025-09-25 10:28:16'),(12,6,'Cidade Financeira, Via S8, Luanda, Angola','Luanda','',-8.920257,13.173707,'2025-08-27 13:53:34','','Trabalho','','Via S8','','Luanda','Angola',0,'2025-09-25 10:28:16');
/*!40000 ALTER TABLE `Delivery_Locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Favorites`
--

DROP TABLE IF EXISTS `Favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Favorites` (
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `Favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `Favorites_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Favorites`
--

LOCK TABLES `Favorites` WRITE;
/*!40000 ALTER TABLE `Favorites` DISABLE KEYS */;
INSERT INTO `Favorites` VALUES (6,1),(4,9);
/*!40000 ALTER TABLE `Favorites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Global_Settings`
--

DROP TABLE IF EXISTS `Global_Settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Global_Settings` (
  `setting_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_threshold` int(11) NOT NULL DEFAULT 0,
  `avg_ttp` int(11) NOT NULL DEFAULT 20,
  `avg_ttd` int(11) NOT NULL DEFAULT 20,
  `prep_buffer` int(11) NOT NULL DEFAULT 20,
  `auto_assign_driver` tinyint(1) DEFAULT 0,
  `change_version` char(36) NOT NULL DEFAULT uuid(),
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Global_Settings`
--

LOCK TABLES `Global_Settings` WRITE;
/*!40000 ALTER TABLE `Global_Settings` DISABLE KEYS */;
INSERT INTO `Global_Settings` VALUES (1,40,20,20,20,1,'c6f019f1-b1de-462f-b1fd-f10322a0fb31');
/*!40000 ALTER TABLE `Global_Settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Global_Settings_Eligible_Payment_Types`
--

DROP TABLE IF EXISTS `Global_Settings_Eligible_Payment_Types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Global_Settings_Eligible_Payment_Types` (
  `setting_id` int(11) NOT NULL,
  `payment_method` enum('Credit Card','Debit Card','PayPal','Cash','Bank Transfer','Payment Reference','Multicaixa Express','Offer') NOT NULL,
  PRIMARY KEY (`setting_id`,`payment_method`),
  CONSTRAINT `Global_Settings_Eligible_Payment_Types_ibfk_1` FOREIGN KEY (`setting_id`) REFERENCES `Global_Settings` (`setting_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Global_Settings_Eligible_Payment_Types`
--

LOCK TABLES `Global_Settings_Eligible_Payment_Types` WRITE;
/*!40000 ALTER TABLE `Global_Settings_Eligible_Payment_Types` DISABLE KEYS */;
INSERT INTO `Global_Settings_Eligible_Payment_Types` VALUES (1,'Credit Card'),(1,'Debit Card'),(1,'Payment Reference');
/*!40000 ALTER TABLE `Global_Settings_Eligible_Payment_Types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Notifications`
--

DROP TABLE IF EXISTS `Notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  `seen` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`notification_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Notifications`
--

LOCK TABLES `Notifications` WRITE;
/*!40000 ALTER TABLE `Notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `Notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Order_History`
--

DROP TABLE IF EXISTS `Order_History`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Order_History_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`),
  CONSTRAINT `Order_History_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Order_History`
--

LOCK TABLES `Order_History` WRITE;
/*!40000 ALTER TABLE `Order_History` DISABLE KEYS */;
INSERT INTO `Order_History` VALUES (2,2,4,'pending','2025-06-20 15:40:00','Order created'),(3,2,4,'pending','2025-06-22 21:19:26','admin (4) -> Boa tarde (1)'),(4,2,4,'pending','2025-06-22 21:36:10','admin (4) -> Meu, caro, como está\' (2)'),(5,2,4,'pending','2025-06-22 21:44:13','admin (4) -> nrjeoç gferwan  rfwe gre hte €j65tj54wp+o~grew grewht54w+~y5ewy54wºy 54wy54wºpo rewtrew 5tr4wrytre ytrytreyt rete43q t435u try trweyt ewryr ewyt r343y4€ (3)'),(6,2,4,'pending','2025-06-22 22:10:03','admin (4) -> Teste (4)'),(7,2,4,'pending','2025-06-22 22:48:11','(admin:Administrador) Enviou a mensagem no chat -> O que vamos testar?'),(8,2,4,'pending','2025-06-22 22:49:34','admin (Administrador) Enviou mensagem no chat: \"muito bom\"'),(9,2,4,'pending','2025-06-22 23:07:08','admin (Administrador) enviou mensagem no chat: \"Que ótimo\"'),(10,2,4,'confirmed','2025-06-23 12:44:31',''),(11,2,4,'preparing','2025-06-23 12:48:39',''),(12,3,4,'pending','2025-06-23 18:43:11','Order created'),(13,2,4,'preparing','2025-06-23 18:44:39','admin (Administrador) enviou mensagem no chat: \"Olá\"'),(14,3,4,'pending','2025-06-23 18:47:02','admin (Administrador) enviou mensagem no chat: \"Não temos X\"'),(16,4,10,'pending','2025-06-23 18:53:03','Order created'),(27,2,4,'ready','2025-06-28 15:26:12','Pedido saiu de \"Está pronto para entrega\" -> \"A ser entregue\".'),(30,2,4,'ready','2025-06-28 17:16:50','Pedido saiu de \"A ser entregue\" -> \"Entregado\".'),(31,2,4,'ready','2025-06-28 17:16:50','A entrega do pedido foi associada à: Roberto de Carvalho'),(32,2,4,'ready','2025-06-28 17:37:33','Pedido saiu de \"Está pronto para entrega\" -> \"A ser entregue\".'),(33,2,4,'ready','2025-06-28 17:37:33','A entrega do pedido foi associada à: Roberto de Carvalho'),(34,4,4,'cancelled','2025-06-29 11:52:44','Pedido foi cancelado Notes: De momento não temos como fazer esse pedido'),(35,3,4,'pending','2025-06-29 17:39:13','Pedido saiu de \"Pendente\" -> \"Cancelado\".'),(36,3,4,'cancelled','2025-06-29 17:39:13','Pedido foi cancelado pelo restaurante, motivo: \"Fiz o pedido errado\".'),(37,5,4,'pending','2025-07-01 09:40:19','Order created'),(38,5,4,'confirmed','2025-07-01 10:32:43','Pedido saiu de \"Pendente\" -> \"Confirmado\".'),(39,5,4,'preparing','2025-07-01 10:35:30','Pedido saiu de \"Confirmado\" -> \"A preparar\".'),(40,5,4,'ready','2025-07-01 10:40:38','Pedido saiu de \"A preparar\" -> \"Pronto para entrega\".'),(43,2,4,'assigned','2025-07-04 13:39:48','Estafeta Roberto de Carvalho removido da entrega do pedido'),(44,2,4,'assigned','2025-07-04 13:39:48','A entrega do pedido foi associada à: Rito Manuel'),(45,2,4,'assigned','2025-07-04 13:44:17','Estafeta Rito Manuel removido da entrega do pedido'),(46,2,4,'assigned','2025-07-04 13:44:17','A entrega do pedido foi associada à: Mbala Camuanhe'),(47,5,4,'ready','2025-07-04 13:46:13','Pedido saiu de \"Pronto para entrega\" -> \"À caminho\".'),(48,5,4,'ready','2025-07-04 13:46:13','A entrega do pedido foi associada à: Roberto de Carvalho'),(49,6,4,'pending','2025-07-20 06:53:13','Pedido foi criado'),(50,7,4,'pending','2025-07-20 07:10:21','Pedido foi criado'),(51,8,4,'pending','2025-07-22 07:11:15','Pedido foi criado'),(52,5,4,'assigned','2025-08-13 10:52:06','Pedido saiu de \"À caminho\" -> \"Cancelado\".'),(53,5,4,'cancelled','2025-08-13 10:52:06','Pedido foi cancelado pelo restaurante, motivo: \"Demorou muito tempo\".'),(54,2,4,'assigned','2025-08-13 11:04:33','Pedido saiu de \"À caminho\" -> \"Cancelado\".'),(55,2,4,'cancelled','2025-08-13 11:04:33','Pedido foi cancelado pelo restaurante, motivo: \"Demorou muito tempo para entrega\".'),(56,6,4,'pending','2025-08-13 11:28:53','Pedido saiu de \"Pendente\" -> \"Cancelado\".'),(57,6,4,'cancelled','2025-08-13 11:28:53','Pedido foi cancelado pelo restaurante, motivo: \"Não irei para o evento\".'),(58,8,4,'pending','2025-08-13 13:07:14','Pedido saiu de \"Pendente\" -> \"Cancelado\".'),(59,8,4,'cancelled','2025-08-13 13:07:14','Pedido foi cancelado pelo restaurante, motivo: \"Já não vou\".'),(60,7,4,'pending','2025-08-13 13:09:42','Pedido saiu de \"Pendente\" -> \"Cancelado\".'),(61,7,4,'cancelled','2025-08-13 13:09:42','Pedido foi cancelado pelo restaurante, motivo: \"Não quero mais\".'),(62,9,6,'pending','2025-08-27 13:53:40','Pedido foi criado'),(63,9,4,'confirmed','2025-08-27 14:23:39','Pedido saiu de \"Pendente\" -> \"Confirmado\".'),(64,9,4,'preparing','2025-08-27 14:27:11','Pedido saiu de \"Confirmado\" -> \"A preparar\".'),(65,9,4,'ready','2025-08-27 14:47:29','Pedido saiu de \"A preparar\" -> \"Pronto para entrega\".'),(66,9,4,'ready','2025-08-29 14:40:38','Pedido saiu de \"Pronto para entrega\" -> \"À caminho\".'),(67,9,4,'ready','2025-08-29 14:40:38','A entrega do pedido foi associada à: Roberto de Carvalho'),(68,9,6,'assigned','2025-09-02 08:47:21','Roberto de Carvalho (Cliente) enviou mensagem no chat: \"Bom dia\"'),(69,9,6,'assigned','2025-09-02 08:47:46','Roberto de Carvalho (Cliente) enviou mensagem no chat: \"como estão\"'),(70,9,4,'assigned','2025-09-02 08:48:08','Administrador (Administrador) enviou mensagem no chat: \"bem\"'),(71,9,6,'assigned','2025-09-02 09:03:56','Roberto de Carvalho (Cliente) enviou mensagem no chat: \"Queria saber quanto tempo vai demorar?\"'),(72,9,6,'assigned','2025-09-02 09:48:01','Roberto de Carvalho (Cliente) enviou mensagem no chat: \"Mais 15mins\"'),(73,9,4,'assigned','2025-09-02 10:14:07','Administrador (Administrador) enviou mensagem no chat: \"Mais 5 dias\"'),(74,9,6,'assigned','2025-09-02 10:14:26','Roberto de Carvalho (Cliente) enviou mensagem no chat: \"Sério?\"');
/*!40000 ALTER TABLE `Order_History` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Order_Items`
--

DROP TABLE IF EXISTS `Order_Items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Order_Items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `Order_Items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`),
  CONSTRAINT `Order_Items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Order_Items`
--

LOCK TABLES `Order_Items` WRITE;
/*!40000 ALTER TABLE `Order_Items` DISABLE KEYS */;
INSERT INTO `Order_Items` VALUES (2,2,3,1),(3,3,1,1),(4,3,3,1),(5,4,1,1),(6,5,4,1),(7,5,1,1),(8,6,7,2),(9,7,8,1),(10,7,8,1),(11,8,7,1),(12,9,9,1);
/*!40000 ALTER TABLE `Order_Items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Orders`
--

DROP TABLE IF EXISTS `Orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `Orders_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`),
  CONSTRAINT `Orders_ibfk_3` FOREIGN KEY (`delivery_address`) REFERENCES `Delivery_Locations` (`location_id`),
  CONSTRAINT `Orders_ibfk_4` FOREIGN KEY (`event_id`) REFERENCES `Restaurant_Events` (`event_id`),
  CONSTRAINT `fk_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `Coupons` (`coupon_id`),
  CONSTRAINT `fk_courier` FOREIGN KEY (`courier_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Orders`
--

LOCK TABLES `Orders` WRITE;
/*!40000 ALTER TABLE `Orders` DISABLE KEYS */;
INSERT INTO `Orders` VALUES (2,4,3,'cancelled','2025-06-20 15:39:59',3000.00,2,'+244 946697919','',NULL,NULL,NULL,NULL,'2025-08-13 11:04:27'),(3,4,3,'cancelled','2025-06-23 18:43:10',6000.00,2,'+244 946697919','',NULL,NULL,NULL,NULL,'2025-08-11 13:40:31'),(4,10,3,'cancelled','2025-06-23 18:53:01',3000.00,7,'+244 902432143','',NULL,NULL,NULL,NULL,'2025-08-11 13:40:31'),(5,4,3,'cancelled','2025-07-01 09:40:17',27000.00,2,'+244 946697919','',NULL,NULL,NULL,NULL,'2025-08-13 10:52:00'),(6,4,4,'cancelled','2025-07-20 06:53:11',0.00,6,'+244946697919',NULL,NULL,NULL,2,NULL,'2025-08-13 11:28:47'),(7,4,3,'cancelled','2025-07-20 07:10:19',0.00,4,'+244946697919',NULL,NULL,NULL,3,NULL,'2025-08-13 13:09:37'),(8,4,4,'cancelled','2025-07-22 07:11:14',0.00,6,'+244946697919','',NULL,NULL,2,NULL,'2025-08-13 13:07:08'),(9,6,3,'assigned','2025-08-27 13:53:39',25000.00,12,'+244928059211','',NULL,8,NULL,NULL,'2025-08-29 14:40:38');
/*!40000 ALTER TABLE `Orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Payments`
--

DROP TABLE IF EXISTS `Payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`),
  CONSTRAINT `Payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Payments`
--

LOCK TABLES `Payments` WRITE;
/*!40000 ALTER TABLE `Payments` DISABLE KEYS */;
INSERT INTO `Payments` VALUES (1,2,4,3000.00,'Debit Card','refunded','2025-06-20 15:40:02'),(2,3,4,6000.00,'Debit Card','refunded','2025-06-23 18:43:13'),(3,4,10,3000.00,'Multicaixa Express','refunded','2025-06-23 18:53:05'),(4,5,4,27000.00,'Debit Card','refunded','2025-07-01 09:40:21'),(5,6,4,0.00,'Offer','refunded','2025-07-20 06:53:14'),(6,7,4,0.00,'Offer','refunded','2025-07-20 07:10:22'),(7,8,4,0.00,'Offer','refunded','2025-07-22 07:11:16'),(8,9,6,25000.00,'Debit Card','pending','2025-08-27 13:53:41');
/*!40000 ALTER TABLE `Payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Products`
--

DROP TABLE IF EXISTS `Products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Products` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `restaurant_id` int(11) DEFAULT NULL,
  `discount` decimal(5,2) NOT NULL DEFAULT 0.00,
  `thumbnail` varchar(255) DEFAULT NULL,
  `product_type` enum('starter','garnish','main','dessert','beverage','ticket') DEFAULT NULL,
  `product_composition` enum('meat','fish','wheat','vegan','alcoholic','non-alcoholic','mixed','merchandise') DEFAULT NULL,
  `prep_time_minutes` int(11) NOT NULL DEFAULT 0,
  `event_id` int(11) DEFAULT NULL,
  `delisted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`product_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `Products_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`),
  CONSTRAINT `Products_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `Restaurant_Events` (`event_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Products`
--

LOCK TABLES `Products` WRITE;
/*!40000 ALTER TABLE `Products` DISABLE KEYS */;
INSERT INTO `Products` VALUES 
  (1,'BOLO CACAU','Pão Típico da ilha da Madeira , Amassado Com Batata Doce , Cozido a Carvão , Barrado com Manteiga de Alho Caseira',3000.00,NULL,0.00,'https://res.cloudinary.com/lkm/image/upload/w_200,h_220,c_pad/production/4206/2024/03/20240314210557022_411a2adbe7274bc2b345dc5a4fe3ae19_jnxqoi.png','starter','wheat',0,NULL,0,'2025-09-23 13:55:20','2025-10-03 08:27:17'),
  (3,'PRODUTO ERRADO','ERRO',3000.00,NULL,0.00,NULL,'main','meat',0,NULL,1,'2025-09-23 13:55:20','2025-09-23 13:55:28'),
  (4,'OUTRO PRODUTO','QUALQUER COISA DEMIAS',24000.00,NULL,0.00,NULL,'main','meat',0,NULL,1,'2025-09-23 13:55:20','2025-09-23 13:55:28'),
  (5,'UMA BEBIDA','É UMA BEBIDA',1250.00,NULL,0.00,NULL,'beverage','liquid',0,NULL,1,'2025-09-23 13:55:20','2025-09-23 13:55:28'),
  (6,'UMA BEBIDA','É UMA BEBIDA',1250.00,NULL,0.00,NULL,'beverage','liquid',0,NULL,1,'2025-09-23 13:55:20','2025-09-23 13:55:28'),
  (7,'\"Ativação do Aplicativo Madeirense\" Bilhete','Venha comemorar a ativação do aplicativo de encomendas do Madeirense.',0.00,4,0.00,'https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/','ticket','merchandise',0,2,0,'2025-09-23 13:55:20','2025-09-23 13:55:28'),
  (8,'\"Teste testes\" Bilhete','Muitos testes para a melhor do utilizador final',0.00,3,0.00,'https://ucarecdn.com/482019d9-765b-49fd-976c-39bd49abc328/','ticket','merchandise',0,3,0,'2025-09-23 13:55:20','2025-09-23 13:55:28'),
  (9,'Thai Noodles','Fresco e ricoc',25000.00,NULL,10.00,'https://ucarecdn.com/07bbb254-0fce-4870-892c-4232f0b74d29/','main','vegetable',0,NULL,0,'2025-09-23 13:55:20','2025-10-07 16:35:12');
/*!40000 ALTER TABLE `Products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Push_Notification_Subscriptions`
--

DROP TABLE IF EXISTS `Push_Notification_Subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Push_Notification_Subscriptions` (
  `subscription_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `target_endpoint` varchar(2048) NOT NULL,
  `expiration_time` int(11) NOT NULL,
  `p256dh` varchar(255) DEFAULT NULL,
  `auth` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Push_Notification_Subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Push_Notification_Subscriptions`
--

LOCK TABLES `Push_Notification_Subscriptions` WRITE;
/*!40000 ALTER TABLE `Push_Notification_Subscriptions` DISABLE KEYS */;
INSERT INTO `Push_Notification_Subscriptions` VALUES (4,6,'https://wns2-par02p.notify.windows.com/w/?token=BQYAAADvvfIWxIAxKj6OyX1KlXJwxIunmI1meUI4iFIY0kgejAN3vYe5%2fbiB63q48GmqXIVH2EZP7GrJeW2BbEWUWUHGU7JWIRlMRR9RLBL7YnSqb4VwTEMairZDHHJHeFjSZxJWnNxsw20ruuDqA7PpLzzixKFXeDvWYi4a2PdOqcAfRVXrhGoX11FviiZnHYwgu%2fak7Fu8shy%2fJPZ057Mhufr8emqHDX16xgRQUDHGGdWpIKddWpDIGdQYFNzCACabjZ8gw5RYT%2b8L4OxCeHMNGBINYVdt%2b%2beRHwQP4mSVWZ%2bObMg5e1q9goDtpzYAXRhSz98%3d',0,'BEpwbmYCmawawvkKerT-dXOEYBLz221LRCcjJ5peYov6Xeubi6E9O3qbLhjjGZBAPfue6tbuQ3BE_thLcNDthuw','zaxF8ojv-JwwWRD3Xr02Vg');
/*!40000 ALTER TABLE `Push_Notification_Subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Restaurant_Events`
--

DROP TABLE IF EXISTS `Restaurant_Events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Restaurant_Events_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Restaurant_Events`
--

LOCK TABLES `Restaurant_Events` WRITE;
/*!40000 ALTER TABLE `Restaurant_Events` DISABLE KEYS */;
INSERT INTO `Restaurant_Events` VALUES (2,4,'Ativação do Aplicativo Madeirense','Venha comemorar a ativação do aplicativo de encomendas do Madeirense.','2025-07-23','14:00:00','22:59:00',0.00,'https://ucarecdn.com/13fb2700-92e1-4144-ab5d-9f1e6cde7cf0/','https://ucarecdn.com/fcb34e33-fe88-4f26-8e9a-41700a54101c/video.mp4','2025-07-16 14:42:09',NULL,'upcoming','2025-09-23 13:56:14'),(3,3,'Teste testes','Muitos testes para a melhor do utilizador final','2025-07-23','14:59:00','15:00:00',0.00,'https://ucarecdn.com/482019d9-765b-49fd-976c-39bd49abc328/','https://ucarecdn.com/115a30a5-2e6e-4b35-a690-1de9d743d211/video.mp4','2025-07-16 15:00:02',NULL,'upcoming','2025-09-23 13:56:14');
/*!40000 ALTER TABLE `Restaurant_Events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Restaurant_Hours`
--

DROP TABLE IF EXISTS `Restaurant_Hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Restaurant_Hours` (
  `hours_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `opening_time` time NOT NULL,
  `closing_time` time NOT NULL,
  `is_closed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`hours_id`),
  UNIQUE KEY `restaurant_id` (`restaurant_id`,`day_of_week`),
  CONSTRAINT `Restaurant_Hours_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Restaurant_Hours`
--

LOCK TABLES `Restaurant_Hours` WRITE;
/*!40000 ALTER TABLE `Restaurant_Hours` DISABLE KEYS */;
INSERT INTO `Restaurant_Hours` VALUES (1,3,'Sunday','07:00:00','21:00:00',0),(2,3,'Monday','07:00:00','21:00:00',0),(3,3,'Tuesday','07:00:00','21:00:00',0),(4,3,'Wednesday','07:00:00','21:00:00',0),(5,3,'Thursday','07:00:00','21:00:00',0),(6,3,'Friday','07:00:00','21:00:00',0),(7,3,'Saturday','07:00:00','21:00:00',0),(8,4,'Sunday','08:00:00','18:00:00',0),(9,4,'Monday','07:00:00','21:00:00',0),(10,4,'Tuesday','07:00:00','21:00:00',0),(11,4,'Wednesday','07:00:00','21:00:00',0),(12,4,'Thursday','07:00:00','21:00:00',0),(13,4,'Friday','07:00:00','21:00:00',0),(14,4,'Saturday','07:00:00','21:00:00',0);
/*!40000 ALTER TABLE `Restaurant_Hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Restaurants`
--

DROP TABLE IF EXISTS `Restaurants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Restaurants`
--

LOCK TABLES `Restaurants` WRITE;
/*!40000 ALTER TABLE `Restaurants` DISABLE KEYS */;
INSERT INTO `Restaurants` VALUES (3,'Madeirense (Cidade)',4,'2025-06-19 20:15:46','2025-08-22 13:41:37','https://www.madeirenseangola.com/images/DSC01729.jpg',25,20),(4,'Madeirense Mar',6,'2025-06-19 22:39:14','2025-08-22 13:41:37','https://www.madeirenseangola.com/images/DSC05940.jpg',25,20);
/*!40000 ALTER TABLE `Restaurants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Tickets_Purchased`
--

DROP TABLE IF EXISTS `Tickets_Purchased`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `Tickets_Purchased_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `Tickets_Purchased_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`),
  CONSTRAINT `Tickets_Purchased_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`),
  CONSTRAINT `Tickets_Purchased_ibfk_4` FOREIGN KEY (`event_id`) REFERENCES `Restaurant_Events` (`event_id`),
  CONSTRAINT `Tickets_Purchased_ibfk_5` FOREIGN KEY (`validator_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Tickets_Purchased`
--

LOCK TABLES `Tickets_Purchased` WRITE;
/*!40000 ALTER TABLE `Tickets_Purchased` DISABLE KEYS */;
INSERT INTO `Tickets_Purchased` VALUES (1,4,4,6,2,2,0.00,'2025-07-20 06:53:16','2025-07-23 00:00:00',0,'2025-07-20 06:53:16',13),(2,4,3,7,3,1,0.00,'2025-07-20 07:10:28','2025-07-23 00:00:00',0,'2025-07-20 07:10:28',13),(3,4,3,7,3,1,0.00,'2025-07-20 07:10:28','2025-07-23 00:00:00',0,'2025-07-20 07:10:28',13),(4,4,4,8,2,1,0.00,'2025-07-22 07:11:21','2025-07-23 00:00:00',0,'2025-07-22 07:11:21',13);
/*!40000 ALTER TABLE `Tickets_Purchased` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User_Comments`
--

DROP TABLE IF EXISTS `User_Comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User_Comments` (
  `comment_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`comment_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `User_Comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `User_Comments_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User_Comments`
--

LOCK TABLES `User_Comments` WRITE;
/*!40000 ALTER TABLE `User_Comments` DISABLE KEYS */;
INSERT INTO `User_Comments` VALUES (1,4,1,'Muito bom','2025-06-05 11:55:48'),(2,4,9,'Muito bom','2025-08-04 08:58:24'),(3,4,9,'Perfeito','2025-08-04 09:07:52'),(4,4,9,'Olá','2025-08-04 09:10:18'),(5,4,9,'A','2025-08-04 09:25:19'),(6,4,9,'B','2025-08-04 09:25:22'),(7,4,9,'C','2025-08-04 09:25:24');
/*!40000 ALTER TABLE `User_Comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User_Reviews`
--

DROP TABLE IF EXISTS `User_Reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `User_Reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `User_Reviews_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User_Reviews`
--

LOCK TABLES `User_Reviews` WRITE;
/*!40000 ALTER TABLE `User_Reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `User_Reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (4,'Administrador','madeirensemar@madeirenseangola.com','+244946697919','https://ucarecdn.com/b89be171-0247-4643-8894-1816ec5daeff/-/format/jpeg/','Admin'),(5,'Estrela','estrela@madeirenseangola.com','+244 943265743','','Customer'),(6,'Roberto de Carvalho','rcesar221@hotmail.com','','https://lh3.googleusercontent.com/a/ACg8ocK3GCDjn89xFfpCvVoeRzkjLAqMhpyvgs5G0-3GtJfY00pBGEKR=s96-c','Customer'),(7,'Daniela Sandão','danielasandao@gmail.com','+244 943265743','','Customer'),(8,'Roberto de Carvalho','larrywallpaper@gmail.com','+244 928059211','','Driver'),(9,'Geraldo Primeiro','geraldo.primeiro@madeirense.com','+244 923455677','','Staff'),(10,'Sandão de Carvalho','sandaodecarvalho@gmail.com','','https://lh3.googleusercontent.com/a/ACg8ocJZ1zKuHbXdI3o5CTTBpwi8absTdH2iTxOSiIz2U1eKXe8h8Hc=s96-c','Customer'),(11,'Rito Manuel','rito.manuel@madeirensemar.ao','+244 923000111','','Driver'),(12,'Mbala Camuanhe','mbala.camuanhe@madeirensemar.ao','+244 999888777','','Driver'),(13,'MADEIRENSE-X-PLATFORM','system@madeirenseangola.com','+244 900000000',NULL,'System'),(14,'FANTASMA_#ea50c82f-7fea-4676-92eb-12aba47b0890','ea50c82f-7fea-4676-92eb-12aba47b0890@madeirenseangola.com','1591090',NULL,'Ghost'),(15,'FANTASMA_#4af198e2-24b4-41de-8370-983eb6f5c240','4af198e2-24b4-41de-8370-983eb6f5c240@madeirenseangola.com','485430118',NULL,'Ghost');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Workstations`
--

DROP TABLE IF EXISTS `Workstations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Workstations` (
  `workstation_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`workstation_id`),
  UNIQUE KEY `user_id` (`user_id`,`restaurant_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `Workstations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `Workstations_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `Restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Workstations`
--

LOCK TABLES `Workstations` WRITE;
/*!40000 ALTER TABLE `Workstations` DISABLE KEYS */;
INSERT INTO `Workstations` VALUES (1,8,3,'2025-06-23 15:31:48'),(2,9,3,'2025-06-23 15:41:18'),(3,11,3,'2025-07-04 12:46:29'),(4,12,3,'2025-07-04 13:33:11');
/*!40000 ALTER TABLE `Workstations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'u322092759_PACIFICO'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-10 10:26:15
