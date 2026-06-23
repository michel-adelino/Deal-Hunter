# Rust Scraper Workers — DealHunter

The Rust workers handle all high-frequency HTTP fetching: price polling, portal rate scraping, and coupon code verification. They publish results to Redis streams that Python agents consume.

---

## Why Rust

- **Concurrency:** tokio async runtime can handle thousands of concurrent requests with minimal memory overhead vs. Python threads
- **Speed:** Rust is 10–50× faster for HTML parsing than Python equivalents (BeautifulSoup)
- **Reliability:** Memory safety eliminates a class of long-running worker bugs
- **Proxy rotation:** Low-latency per-request proxy switching is easier to reason about in Rust

---

## Project Structure

```
backend/scrapers/
├── Cargo.toml
├── src/
│   ├── main.rs              # Worker entry point, Redis listener
│   ├── workers/
│   │   ├── mod.rs
│   │   ├── price.rs         # Price polling worker
│   │   ├── coupon.rs        # Coupon verification worker
│   │   └── portal.rs        # Shopping portal rate scraper
│   ├── extractors/
│   │   ├── mod.rs
│   │   ├── amazon.rs        # Amazon product page extractor
│   │   ├── glasses_com.rs   # glasses.com extractor
│   │   ├── bestbuy.rs
│   │   └── target.rs
│   ├── proxy.rs             # Proxy rotation pool
│   ├── redis.rs             # Redis publish/subscribe
│   └── types.rs             # Shared types (mirrors Python Pydantic models)
```

---

## Cargo.toml

```toml
[package]
name = "dealhunter-scrapers"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.35", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "cookies"] }
scraper = "0.18"          # CSS selector HTML parsing
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
redis = { version = "0.24", features = ["tokio-comp"] }
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
tokio-stream = "0.1"
futures = "0.3"
```

---

## Types

`src/types.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum DealConfidence {
    Verified,
    Inferred,
    UserEntered,
    Expired,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceResult {
    pub retailer: String,
    pub url: String,
    pub current_price: f64,
    pub currency: String,
    pub captured_at: String,       // ISO 8601
    pub confidence: DealConfidence,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CouponVerifyResult {
    pub code: String,
    pub retailer: String,
    pub verified: bool,
    pub discount_type: Option<String>,
    pub discount_value: Option<f64>,
    pub verified_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortalRate {
    pub portal_name: String,
    pub retailer: String,
    pub retailer_url: String,
    pub cashback_rate: f64,
    pub source_url: String,
    pub scraped_at: String,
}

// Tasks dispatched from Python via Redis
#[derive(Debug, Deserialize)]
#[serde(tag = "task_type")]
pub enum ScraperTask {
    FetchPrice { product_url: String, retailer: String, hunt_id: String },
    VerifyCoupon { retailer: String, coupon_code: String, product_url: String },
    ScrapePortalRates { portal: String },
}
```

---

## Main Entry Point

`src/main.rs`

```rust
use redis::AsyncCommands;
use tokio::task;
use tracing::info;

mod proxy;
mod redis as redis_client;
mod types;
mod workers;
mod extractors;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());

    info!("Starting DealHunter scraper workers");

    let client = redis::Client::open(redis_url)?;
    let mut con = client.get_async_connection().await?;

    // Listen for tasks on the scraper:tasks stream
    loop {
        let result: redis::RedisResult<Vec<(String, Vec<(String, String)>)>> = con
            .xread(&["scraper:tasks"], &["$"])
            .await;

        if let Ok(messages) = result {
            for (_stream, entries) in messages {
                for (_id, fields) in entries {
                    let payload = fields.iter()
                        .find(|(k, _)| k == "payload")
                        .map(|(_, v)| v.clone());

                    if let Some(payload) = payload {
                        let con_clone = client.get_async_connection().await?;
                        task::spawn(async move {
                            if let Err(e) = workers::dispatch(payload, con_clone).await {
                                tracing::error!("Worker error: {e}");
                            }
                        });
                    }
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }
}
```

---

## Price Worker

`src/workers/price.rs`

```rust
use scraper::{Html, Selector};
use crate::types::{PriceResult, DealConfidence};
use crate::proxy::ProxyPool;

pub async fn fetch_price(
    product_url: &str,
    retailer: &str,
    proxy_pool: &ProxyPool,
) -> anyhow::Result<PriceResult> {
    let proxy = proxy_pool.next();
    let client = reqwest::Client::builder()
        .proxy(reqwest::Proxy::all(&proxy)?)
        .user_agent("Mozilla/5.0 (compatible; price-check/1.0)")
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let response = client.get(product_url).send().await?;
    let html = response.text().await?;
    let document = Html::parse_document(&html);

    let price = match retailer {
        "glasses.com" => extract_glasses_com_price(&document)?,
        "amazon" => extract_amazon_price(&document)?,
        "bestbuy" => extract_bestbuy_price(&document)?,
        "target" => extract_target_price(&document)?,
        _ => return Err(anyhow::anyhow!("Unknown retailer: {retailer}")),
    };

    Ok(PriceResult {
        retailer: retailer.to_string(),
        url: product_url.to_string(),
        current_price: price,
        currency: "USD".to_string(),
        captured_at: chrono::Utc::now().to_rfc3339(),
        confidence: DealConfidence::Verified,
    })
}
```

---

## Coupon Verification Worker

`src/workers/coupon.rs`

This worker simulates adding a product to a cart and applying a coupon code. This is only done for retailers whose ToS permit automated price checks. Check `ALLOWED_COUPON_VERIFY_RETAILERS` before adding new retailers.

```rust
/// Retailers that explicitly permit or do not prohibit automated cart interactions
/// in their ToS. Review before adding new entries.
const ALLOWED_COUPON_VERIFY_RETAILERS: &[&str] = &[
    "glasses.com",
    // "amazon" — Amazon ToS prohibits automated cart interactions; use Keepa instead
    // "bestbuy" — ToS unclear; disabled until legal review
];

pub async fn verify_coupon(
    retailer: &str,
    coupon_code: &str,
    product_url: &str,
) -> anyhow::Result<CouponVerifyResult> {
    if !ALLOWED_COUPON_VERIFY_RETAILERS.contains(&retailer) {
        return Ok(CouponVerifyResult {
            code: coupon_code.to_string(),
            retailer: retailer.to_string(),
            verified: false,
            discount_type: None,
            discount_value: None,
            verified_at: None,
        });
    }

    // Retailer-specific cart + coupon flow
    // Returns whether the coupon was accepted and the discount applied
    // ... implementation per retailer
}
```

---

## Portal Rate Scraper

`src/workers/portal.rs`

Runs once per week (Sunday 2am, triggered by Celery beat). Scrapes public portal pages (no login required) and writes rates to PostgreSQL via Redis.

```rust
pub async fn scrape_capital_one_shopping() -> anyhow::Result<Vec<PortalRate>> {
    // Capital One Shopping's public store page lists cashback rates per retailer
    // URL: https://capitaloneshopping.com/stores
    // This page is publicly accessible without authentication

    let client = reqwest::Client::new();
    let html = client
        .get("https://capitaloneshopping.com/stores")
        .send()
        .await?
        .text()
        .await?;

    let document = Html::parse_document(&html);
    // CSS selectors to extract retailer name + cashback rate
    // ... parse and return Vec<PortalRate>
}
```

---

## Proxy Pool

`src/proxy.rs`

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

pub struct ProxyPool {
    proxies: Vec<String>,
    counter: Arc<AtomicUsize>,
}

impl ProxyPool {
    pub fn from_env() -> Self {
        let raw = std::env::var("PROXY_LIST")
            .unwrap_or_default();
        let proxies: Vec<String> = raw.split(',')
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();
        Self { proxies, counter: Arc::new(AtomicUsize::new(0)) }
    }

    pub fn next(&self) -> String {
        if self.proxies.is_empty() {
            return String::new(); // no proxy — use direct
        }
        let idx = self.counter.fetch_add(1, Ordering::Relaxed) % self.proxies.len();
        self.proxies[idx].clone()
    }
}
```

---

## Running the Workers

```bash
# Development
cd backend/scrapers
cargo run

# Production (release build)
cargo build --release
./target/release/dealhunter-scrapers

# Environment variables needed
REDIS_URL=redis://localhost:6379
PROXY_LIST=http://proxy1:port,http://proxy2:port   # optional
DATABASE_URL=postgres://...                         # for writing portal rates
```
