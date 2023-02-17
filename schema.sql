CREATE TABLE IF NOT EXISTS `products`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url VARCHAR(2000) UNIQUE NOT NULL,
    descr VARCHAR(1000),
    cron VARCHAR(50) NOT NULL,
    price_element_locator VARCHAR(20) NOT NULL,
    price_locate_timeout INTEGER NOT NULL,
    price_locate_retries INTEGER NOT NULL,
    price_currency VARCHAR(20) NOT NULL,
    price_thousand_separator VARCHAR(2) NOT NULL,
    price_decimal_separator VARCHAR(2) NOT NULL,
    price_remove_chars_regex VARCHAR(50) NOT NULL,
    notify_price_increase_percent VARCHAR(5), -- allow null => don't care about increases
    notify_price_decrease_percent VARCHAR(5), -- allow null => don't care about increases
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, url)
);

CREATE TABLE IF NOT EXISTS `prices`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount VARCHAR(30) NOT NULL,
    prod_id INTEGER NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prod_id) REFERENCES product(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `price_changes`(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prod_id INTEGER NOT NULL,
    from_amount VARCHAR(30) NOT NULL,
    to_amount VARCHAR(30) NOT NULL,
    amount_diff VARCHAR(30) NOT NULL,
    percent_diff VARCHAR(30) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prod_id) REFERENCES product(id) ON DELETE CASCADE ON UPDATE CASCADE
);
