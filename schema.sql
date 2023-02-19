CREATE TABLE IF NOT EXISTS `shops`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    price_xpath VARCHAR(20) NOT NULL,
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
    title VARCHAR(1000),
    descr VARCHAR(1000),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `price_changes`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prod_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    prev_amount INTEGER NOT NULL,
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (prod_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `notifications`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    price_id INTEGER NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (price_id) REFERENCES prices(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- insert into shops(name, price_xpath, price_currency, price_thousand_separator, price_decimal_separator, price_remove_chars) values('amazon.fr', "//span[@class='a-price-whole']", '€', ' ', ',', '\s');
-- insert into products(shop_id,url,title) values(1,'https://www.amazon.fr/gp/product/B09MMCJCNJ/','Steelcase Leap Chaise de Bureau et de Jeu Ergonomique');
-- insert into products(shop_id,url,title) values(1,'https://www.amazon.fr/Waterpik-WP-660EU-Dentaire-Hydropulseur-Professional/dp/B073WGYSF9','Waterpik - Hydropulseur Ultra Professional, Jet Dentaire');
-- insert into users(moniker) values('quick-brown-fox'),('lazy-blue-dog');
-- insert into subscriptions(user_id,prod_id,notify_price_increase_percent, notify_price_decrease_percent) values (1,1,null,6),(1,2,6,6);
-- insert into subscriptions(user_id,prod_id,notify_price_increase_percent, notify_price_decrease_percent) values (2,1,7,null),(2,2,7,7);