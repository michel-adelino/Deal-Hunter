// HTML extractors for different retailers
// Each retailer gets a custom extractor to handle their specific HTML structure

pub mod amazon;
pub mod bestbuy;
pub mod generic;

pub use amazon::extract_amazon_price;
pub use bestbuy::extract_bestbuy_price;
