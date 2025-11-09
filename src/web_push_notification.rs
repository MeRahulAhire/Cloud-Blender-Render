use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;
use web_push::{
    ContentEncoding, SubscriptionInfo, VapidSignatureBuilder, WebPushMessageBuilder, 
    IsahcWebPushClient, WebPushClient,
};

// Hardcoded VAPID keys
// const VAPID_PUBLIC_KEY: &str = "BGdqGpTMThGXR1oAau7FddChScYzNwObQZfPNudix3uoSiwurNbx-8WdmLbhMekyalvnXZaV0tzA2kyWYNuoSbA";
const VAPID_PRIVATE_KEY: &str = "g3Ypc9h_VGmarp2HsEB0EyePe7rI-ZMGlgrMqYN2fc4";

// Global subscription storage
lazy_static::lazy_static! {
    static ref SUBSCRIPTIONS: Arc<RwLock<Vec<StoredSubscription>>> = Arc::new(RwLock::new(Vec::new()));
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushSubscription {
    pub endpoint: String,
    pub keys: PushKeys,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredSubscription {
    pub endpoint: String,
    pub keys: PushKeys,
    pub origin: String,
}

#[derive(Debug, Deserialize)]
pub struct SubscriptionRequest {
    pub subscription: PushSubscription,
    pub origin: String, // Domain sent from frontend
}

#[derive(Debug, Serialize)]
pub struct SubscriptionResponse {
    pub success: bool,
    pub message: String,
}

// Activate push notification - subscribe endpoint
pub async fn activate_push_notification(
    Json(payload): Json<SubscriptionRequest>,
) -> impl IntoResponse {
    let mut subs = SUBSCRIPTIONS.write().await;

    // Check if subscription already exists
    if subs.iter().any(|s| s.endpoint == payload.subscription.endpoint) {
        return (
            StatusCode::OK,
            Json(SubscriptionResponse {
                success: true,
                message: "Subscription already exists".to_string(),
            }),
        );
    }

    // Create subscription with origin
    let new_subscription = StoredSubscription {
        endpoint: payload.subscription.endpoint,
        keys: payload.subscription.keys,
        origin: payload.origin,
    };

    // Add new subscription
    subs.push(new_subscription);

    println!("🔔 New push notification subscription added. Total subscriptions: {}", subs.len());

    (
        StatusCode::OK,
        Json(SubscriptionResponse {
            success: true,
            message: "Push notification activated successfully".to_string(),
        }),
    )
}

// Deactivate push notification - unsubscribe endpoint
pub async fn deactivate_push_notification(
    Json(payload): Json<SubscriptionRequest>,
) -> impl IntoResponse {
    let mut subs = SUBSCRIPTIONS.write().await;

    let initial_len = subs.len();
    subs.retain(|s| s.endpoint != payload.subscription.endpoint);

    if subs.len() < initial_len {
        println!("✅ Push notification subscription removed. Total subscriptions: {}", subs.len());
        (
            StatusCode::OK,
            Json(SubscriptionResponse {
                success: true,
                message: "Push notification deactivated successfully".to_string(),
            }),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(SubscriptionResponse {
                success: false,
                message: "Subscription not found".to_string(),
            }),
        )
    }
}

// Get subscription status
pub async fn get_subscription_status() -> impl IntoResponse {
    let subs = SUBSCRIPTIONS.read().await;
    let count = subs.len();

    (
        StatusCode::OK,
        Json(json!({
            "subscribed": count > 0,
            "count": count
        })),
    )
}

// Send push notification to all subscribers
pub async fn send_push_notification(event_type: &str) {
    let subs = SUBSCRIPTIONS.read().await;

    if subs.is_empty() {
        println!("⚠️  No push notification subscriptions found");
        return;
    }

    println!("📤 Sending push notifications to {} subscriber(s)", subs.len());

    let client = IsahcWebPushClient::new().expect("Failed to create WebPush client");

    // Simple payload - just the event type
    // Service worker will handle the actual notification display
    let notification_payload = json!({
        "type": event_type
    });

    let payload_string = notification_payload.to_string();

    for subscription in subs.iter() {
        let result = send_to_subscriber(&client, subscription, &payload_string).await;
        
        match result {
            Ok(_) => println!("✅ Push notification sent successfully to client side"),
            Err(e) => eprintln!("❌ Failed to send push notification: {:?}", e),
        }
    }
}



async fn send_to_subscriber(
    client: &IsahcWebPushClient,
    subscription: &StoredSubscription,
    payload: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // Create subscription info
    let subscription_info = SubscriptionInfo::new(
        &subscription.endpoint,
        &subscription.keys.p256dh,
        &subscription.keys.auth,
    );

    // Build VAPID signature
    let mut builder = VapidSignatureBuilder::from_base64(
        VAPID_PRIVATE_KEY,
        &subscription_info,
    )?;

    // Derive push service origin (this is what "aud" must match)
    let endpoint_url = url::Url::parse(&subscription.endpoint)?;
    let push_service_origin = format!(
        "{}://{}",
        endpoint_url.scheme(),
        endpoint_url.host_str().unwrap_or("example.com")
    );

    // Derive your own domain/email for the "sub" claim
    let origin_url = url::Url::parse(&subscription.origin)?;
    let app_host = origin_url.host_str().unwrap_or("yourdomain.com");

    builder.add_claim("sub", format!("mailto:admin@{}", app_host));
    builder.add_claim("aud", push_service_origin);

    let signature = builder.build()?;

    // Build and send the message
    let mut message_builder = WebPushMessageBuilder::new(&subscription_info);
    message_builder.set_payload(ContentEncoding::Aes128Gcm, payload.as_bytes());
    message_builder.set_vapid_signature(signature);

    let message = message_builder.build()?;
    client.send(message).await?;

    Ok(())
}


// Helper function to be called from process_blend_file.rs
pub async fn notify_render_complete() {
    send_push_notification("render_complete").await;
}

