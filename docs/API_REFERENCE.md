# API Reference — DealHunter

Base URL: `http://localhost:8000/api/v1`

All responses are JSON. All timestamps are ISO 8601 UTC.
All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

---

## Authentication

### `POST /auth/register`
```json
{ "email": "user@example.com", "password": "..." }
→ { "user_id": "uuid", "token": "jwt" }
```

### `POST /auth/login`
```json
{ "email": "user@example.com", "password": "..." }
→ { "token": "jwt", "expires_at": "2025-02-01T00:00:00Z" }
```

---

## Hunt

### `POST /hunt`

Start a deal hunt for one or more products.

**Request:**
```json
{
  "products": ["Ray-Ban Meta Smart Glasses Gen 2"],
  "options": {
    "include_portal_comparison": true,
    "include_coupons": true,
    "include_price_history": true
  }
}
```

**Response:**
```json
{
  "hunt_id": "hunt_abc123",
  "status": "running",
  "started_at": "2025-01-20T10:00:00Z",
  "estimated_seconds": 15
}
```

---

### `GET /hunt/{hunt_id}/stream`

Server-Sent Events stream. Connect and receive deal results as each agent completes.

**Event types:**

```
event: price_result
data: {"retailer":"amazon","price":319.00,"confidence":"verified","url":"..."}

event: card_benefit
data: {"card":"apple_card","type":"cashback","rate":0.03,"confidence":"inferred","source_url":"..."}

event: coupon_result
data: {"code":"SAVE15","saves":15.00,"verified":true,"verified_at":"2025-01-20T10:00:15Z"}

event: portal_result
data: {"portal":"capital_one_shopping","rate":0.05,"retailer":"glasses.com","confidence":"inferred"}

event: stacked_deal
data: { ...StackedDeal object... }

event: hunt_complete
data: {"hunt_id":"hunt_abc123","status":"complete","completed_at":"..."}

event: error
data: {"agent":"price_tracker","message":"Keepa API rate limit hit","retrying":true}
```

---

### `GET /hunt/{hunt_id}`

Get the full result of a completed hunt.

**Response:**
```json
{
  "hunt_id": "hunt_abc123",
  "status": "complete",
  "product": {
    "name": "Ray-Ban Meta Smart Glasses (Gen 2)",
    "canonical_name": "Ray-Ban Meta Smart Glasses (Gen 2)",
    "category": "wearables"
  },
  "prices": [
    {
      "retailer": "glasses.com",
      "url": "https://www.glasses.com/...",
      "current_price": 327.00,
      "price_30d_low": 299.00,
      "price_90d_low": 289.00,
      "predicted_drop_date": null,
      "drop_confidence": 0.2,
      "confidence": "verified",
      "captured_at": "2025-01-20T10:00:05Z"
    }
  ],
  "card_benefits": [
    {
      "card_type": "capital_one_venture",
      "card_label": "My Capital One",
      "benefit_type": "portal_cashback",
      "rate": 0.46,
      "merchant": "glasses.com",
      "source_url": "https://capitaloneshopping.com/...",
      "confidence": "inferred",
      "expires_at": null
    },
    {
      "card_type": "amex_platinum",
      "card_label": "My Amex",
      "benefit_type": "credit",
      "amount": 40.00,
      "merchant": "glasses.com",
      "confidence": "user_entered",
      "expires_at": "2025-12-31"
    }
  ],
  "coupons": [
    {
      "code": "SAVE15",
      "discount_type": "fixed",
      "discount_value": 15.00,
      "source": "couponfollow",
      "verified": true,
      "verified_at": "2025-01-20T10:00:12Z",
      "stacks_with_portal": null
    }
  ],
  "portal_offers": [
    {
      "portal_name": "capital_one_shopping",
      "cashback_rate": 0.46,
      "retailer": "glasses.com",
      "scraped_at": "2025-01-19T02:00:00Z",
      "confidence": "inferred"
    }
  ],
  "stacked_deal": {
    "steps": [
      {
        "order": 1,
        "action": "Shop via Capital One Shopping portal",
        "type": "portal_cashback",
        "saves": 150.42,
        "confidence": "inferred"
      },
      {
        "order": 2,
        "action": "Apply coupon code SAVE15",
        "type": "coupon",
        "saves": 15.00,
        "confidence": "verified"
      },
      {
        "order": 3,
        "action": "Amex $40 glasses.com credit (check your Amex app to confirm)",
        "type": "credit",
        "saves": 40.00,
        "confidence": "user_entered"
      }
    ],
    "original_price": 327.00,
    "final_net_price": 121.58,
    "total_savings": 205.42,
    "caveats": [
      "⚠️ The Amex $40 credit is based on what you told us — verify it's active in your Amex app before purchasing.",
      "⚠️ Capital One Shopping cashback rate of 46% is unusually high — confirm the current rate in the portal before purchasing."
    ]
  }
}
```

---

## Cards

### `GET /cards`

Get the user's card portfolio.

### `PUT /cards`

Replace the user's card portfolio.

**Request:**
```json
{
  "cards": [
    {
      "card_type": "amex_platinum",
      "label": "My Amex",
      "manual_offers": [
        {
          "merchant": "glasses.com",
          "amount": 40.00,
          "description": "$40 glasses.com statement credit",
          "expires_at": "2025-12-31"
        }
      ]
    },
    {
      "card_type": "capital_one_venture",
      "label": "My Capital One",
      "manual_offers": []
    },
    {
      "card_type": "chase_sapphire_preferred",
      "label": "Chase Sapphire",
      "manual_offers": []
    },
    {
      "card_type": "apple_card",
      "label": "Apple Card",
      "manual_offers": []
    }
  ]
}
```

### Card type enum values
```
amex_platinum, amex_gold, amex_blue_cash_preferred, amex_blue_cash_everyday,
chase_sapphire_reserve, chase_sapphire_preferred, chase_freedom_flex,
chase_freedom_unlimited, capital_one_venture, capital_one_venture_x,
capital_one_quicksilver, apple_card, citi_double_cash, citi_custom_cash,
discover_it
```

---

## Alerts

### `GET /alerts`
List all active alerts.

### `POST /alerts`
```json
{
  "product_name": "AirPods Pro 2",
  "alert_type": "price_drop",
  "threshold_price": 200.00
}
```
or
```json
{
  "product_name": "any",
  "alert_type": "card_credit_expiry",
  "days_before": 7
}
```

### `DELETE /alerts/{alert_id}`

---

## Prices

### `GET /prices/{product_id}/history`

Returns price history for chart rendering.

**Response:**
```json
{
  "product_id": "...",
  "retailer": "amazon",
  "history": [
    { "date": "2024-10-01", "price": 349.00 },
    { "date": "2024-11-01", "price": 327.00 },
    { "date": "2024-12-26", "price": 299.00 }
  ]
}
```

---

## Error Responses

All errors follow:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Keepa API limit hit. Price data may be up to 6 hours old.",
  "fallback_used": "camelcamelcamel",
  "retry_after": 3600
}
```

HTTP status codes:
- `400` — bad request (validation error)
- `401` — not authenticated
- `404` — hunt/product not found
- `429` — rate limited
- `503` — upstream data source unavailable (hunt will retry automatically)
