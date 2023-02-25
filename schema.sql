CREATE TABLE IF NOT EXISTS `shops`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    price_xpaths VARCHAR(2000) NOT NULL, -- JSON array of strings; all the different xpath locators for price
    product_currently_unavailable_xpath VARCHAR(2000) NOT NULL,
    product_currently_unavailable_text VARCHAR(2000) NOT NULL,
    price_locate_timeout INTEGER NOT NULL DEFAULT 3000,
    price_locate_retries INTEGER NOT NULL DEFAULT 3,
    price_currency VARCHAR(20) NOT NULL DEFAULT '$',
    price_thousand_separator VARCHAR(2) NOT NULL,
    price_decimal_separator VARCHAR(2) NOT NULL,
    price_remove_chars VARCHAR(250) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `users`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moniker VARCHAR(200) NOT NULL UNIQUE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `products`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    url VARCHAR(2000) NOT NULL UNIQUE,
    price_xpath VARCHAR(500) NOT NULL, -- one of shop.price_xpaths[]; discovery happens upon first insertion of a new product
    title VARCHAR(1000),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `price_changes`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prod_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL, -- extra
    prev_amount INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    amount_diff INTEGER NOT NULL,
    percent_diff INTEGER NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, prod_id, amount),
    FOREIGN KEY (prod_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `subscriptions`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prod_id INTEGER NOT NULL,
    notify_max_frequency INTEGER NOT NULL DEFAULT 0, -- one of 0=realtime (default), 1=bi-daily, 2=daily, 3=weekly
    notify_price_increase_percent INTEGER DEFAULT 10, -- null means user doesn't care about price increases
    notify_price_decrease_percent INTEGER DEFAULT 10, -- null means user doesn't care about price decreases
    user_descr varchar(500),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, prod_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (prod_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `notifications`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    price_change_id INTEGER NOT NULL, -- extra
    prod_id INTEGER NOT NULL, -- extra
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (price_change_id) REFERENCES prices(id) ON DELETE CASCADE ON UPDATE CASCADE
);

insert into shops(name, price_xpaths, price_currency, price_thousand_separator, price_decimal_separator, price_remove_chars, product_currently_unavailable_xpath, product_currently_unavailable_text) 
    values ('amazon.fr', "[""//span[@class='a-price-whole']"",""//span[@class='a-size-base a-color-price a-color-price']""]", '€', '', ',', '\s', '//span[@class=''a-size-medium a-color-price'']', 'Actuellement indisponible');
insert into shops(name, price_xpaths, price_currency, price_thousand_separator, price_decimal_separator, price_remove_chars, product_currently_unavailable_xpath, product_currently_unavailable_text) 
    values ('amazon.com', "[""//span[@class='a-price-whole']"",""//span[@class='a-size-base a-color-price a-color-price']""]", '$', '', '.', '\s', '//span[@class=''a-size-medium a-color-price'']', 'Currently unavailable');

insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/gp/product/B09MMCJCNJ/','Steelcase Leap Chaise de Bureau et de Jeu Ergonomique');
insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/Waterpik-WP-660EU-Dentaire-Hydropulseur-Professional/dp/B073WGYSF9','Waterpik - Hydropulseur Ultra Professional, Jet Dentaire');
insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/Baby-Einstein-Hape-Jouet-musical/dp/B07QXL2T8Z','Baby Einstein Hape Magic Touch Tablet Jouets musicaux en bois');
insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/gp/product/B07BCNJV9N','Tefal Ice Force Couteau à éplucher 9 cm, Couteau de cuisine');
insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/gp/product/B09641TW4F?th=1&psc=1','Columbia Childrens Firecamp™ Sledder 3 Wp');
insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/Villeroy-Boch-10-4600-2640-Assiette-Porcelaine/dp/B0002X801G','Villeroy & Boch Cellini Assiette petit-déjeuner, 22 cm, Porcelaine Premium, Blanc');
insert into products(shop_id,price_xpath,url,title) values(1,'//span[@class=''a-price-whole'']','https://www.amazon.fr/Leonardo-014791-Puccini-Bourgogne-Transparent/dp/B00ZCKS500','Leonardo 014791 Puccini Set de 6 Verres Bourgogne Verre Transparent');
insert into products(shop_id,price_xpath,url,title) values(2,'//span[@class=''a-size-base a-color-price a-color-price'']','https://www.amazon.com/Ring-Video-Doorbell-Satin-Nickel-2020-Release/dp/B08N5NQ869/','Ring Video Doorbell - 1080p HD video, improved motion detection, easy installation – Satin Nickel');
insert into products(shop_id,price_xpath,url,title) values(2,'//span[@class=''a-size-base a-color-price a-color-price'']','https://www.amazon.com/Random-Access-Memories-10th-Anniversary/dp/B0BVZS2T4Z/','Random Access Memories (10th Anniversary) ');
insert into products(shop_id,price_xpath,url,title) values(2,'//span[@class=''a-size-base a-color-price a-color-price'']','https://www.amazon.com/Very-Hungry-Caterpillar-Eric-Carle/dp/0399226907/','');
insert into products(shop_id,price_xpath,url,title) values(2,'//span[@class=''a-size-base a-color-price a-color-price'']','https://www.amazon.com/Seusss-Beginner-Collection-Green-Socks/dp/0375851569/ref=zg-mw_books_sccl_5/133-1136267-5212801?pd_rd_w=rxAXa&content-id=amzn1.sym.309d45c5-3eba-4f62-9bb2-0acdcf0662e7&pf_rd_p=309d45c5-3eba-4f62-9bb2-0acdcf0662e7&pf_rd_r=WWF54AV4V1Q464CA6WJY&pd_rd_wg=ev5Mx&pd_rd_r=3eb176f9-86fb-4b46-a5c2-5935d55ec871&pd_rd_i=0375851569&psc=1','Dr. Seuss''s Beginner Book Collection (Cat in the Hat, One Fish Two Fish, Green Eggs and Ham, Hop on Pop, Fox in Socks) Hardcover – Box set, September 22, 2009');

insert into users(moniker) values('quick-brown-fox');
insert into users(moniker) values('lazy-blue-dog');

insert into subscriptions(user_id,prod_id,notify_price_increase_percent, notify_price_decrease_percent) values (1,1,null,6);
insert into subscriptions(user_id,prod_id,notify_price_increase_percent, notify_price_decrease_percent) values (1,2,6,6);
insert into subscriptions(user_id,prod_id,notify_price_increase_percent, notify_price_decrease_percent) values (2,1,7,null);
insert into subscriptions(user_id,prod_id,notify_price_increase_percent, notify_price_decrease_percent) values (2,2,7,7);

insert into price_changes(prod_id,prev_amount,amount,amount_diff,percent_diff,shop_id) values(1,0,90,0,0,1); -- assigned price_change_id=1
insert into price_changes(prod_id,prev_amount,amount,amount_diff,percent_diff,shop_id) values(1,90,110,20,20*100/90,1); -- assigned price_change_id=2
insert into price_changes(prod_id,prev_amount,amount,amount_diff,percent_diff,shop_id) values(2,0,1190,0,0,1); -- assigned price_change_id=3
insert into price_changes(prod_id,prev_amount,amount,amount_diff,percent_diff,shop_id) values(2,1190,1100,-90,-90*100/1100,1); -- assigned price_change_id=4
insert into price_changes(prod_id,prev_amount,amount,amount_diff,percent_diff,shop_id) values(2,1100,900,-200,-200*100/900,1); -- assigned price_change_id=5
insert into price_changes(prod_id,prev_amount,amount,amount_diff,percent_diff,shop_id) values(1,110,60,-50,-50*100/110,1); -- assigned price_change_id=6

-- Upon subscription to a product, we create a price_change reconrd but we do not send a notification since user 
-- obviously knows the price. This is why for example the first notification for user 1 subscribed to product 1 
-- is not price_change 1 (creation) but always price_change 2
insert into notifications(user_id, price_change_id, prod_id) values(1,2,1);
insert into notifications(user_id, price_change_id, prod_id) values(2,2,1);
insert into notifications(user_id, price_change_id, prod_id) values(1,4,2);
insert into notifications(user_id, price_change_id, prod_id) values(1,5,2);
-- notifications to be added on next run: 
    -- (user 1, pri_ch 6 for prod 1) 
    -- (user 2, pri_ch 6 for prod 1) and
    -- (user 2, pri_ch 5 for prod 2)
-- NOTE: the notification 
    -- (user 2, pri_ch 4 for prod 2) 
-- should not be sent, since it was missed and we already have a more recent one

-- get the one most recent price change of each products (only with valid amount i.e. >=0)
SELECT * FROM (SELECT price_changes.*,ROW_NUMBER() OVER (PARTITION BY prod_id ORDER BY id DESC) AS rn FROM price_changes WHERE amount>=0) WHERE rn=1;

-- get price_changes for all products
SELECT pc.*, p.title from price_changes pc, products p where pc.prod_id=p.id order by prod_id, id;

-- get user subscriptions
SELECT u.moniker, u.id uid, p.title, p.id pid from subscriptions s, users u, products p where s.user_id=u.id and s.prod_id=p.id;

-- get the one most recent notification received till now by each user for each of their product subscriptions
SELECT notif_created, user_id, moniker, price_change_id, prod_id, notify_max_frequency, 
        notify_price_increase_percent, notify_price_decrease_percent, user_descr
FROM
    (SELECT ROW_NUMBER() OVER (
        PARTITION BY u.moniker,s.prod_id ORDER BY n.created DESC) rn, 
        n.created notif_created, u.id user_id, u.moniker, n.price_change_id, s.prod_id, s.notify_max_frequency, 
        s.notify_price_increase_percent, s.notify_price_decrease_percent, s.user_descr 
    FROM users u, notifications n, subscriptions s
    WHERE n.user_id=u.id 
        AND s.user_id=u.id
        AND s.prod_id=n.prod_id)
WHERE rn=1;
