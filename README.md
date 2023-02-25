# price-snitch

Headless selenium crawls product pages, keeps track of prices and notifies upon detecting significant changes

## Invalid price change

Means we failed to locate the price and also if "Currently unavailable", so we add a price change with amount == -1.

## Currently unavailable price change

We found the product is no longer available, so we add a price change with amount == 0.
