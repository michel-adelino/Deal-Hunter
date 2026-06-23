use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct BestBuyPrice {
    pub current_price: f64,
    pub currency: String,
    pub product_title: String,
}

pub fn extract_bestbuy_price(html: &str) -> Option<BestBuyPrice> {
    // Placeholder for Best Buy price extraction logic
    None
}
