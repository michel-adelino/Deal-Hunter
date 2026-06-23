use anyhow::Result;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    info!("DealHunter Rust scrapers starting");

    // Placeholder for actual scraper implementation
    // Will be expanded with price tracker, coupon scraper, and portal scraper workers

    Ok(())
}
