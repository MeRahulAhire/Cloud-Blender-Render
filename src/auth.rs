use axum::{
    response::{IntoResponse, Response, Redirect},
    Json,
    http::StatusCode,
    extract::{Query, Request},
    middleware::Next
};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use nanoid::nanoid;
use serde_json::json;
use serde::Deserialize;

use crate::db;

/// POST /create_auth
pub async fn set_auth(jar: CookieJar) -> Response {
    // 1️⃣ Check if auth is already enabled
    let is_protected = db::get_data("password.is_protected");
    if is_protected == "true" {
        let err = json!({ "message": "auth is already enabled" });
        return (StatusCode::BAD_REQUEST, Json(err)).into_response();
    }

    // 2️⃣ Generate a new 10-character nanoid token
    let token = nanoid!(10);

    // 3️⃣ Update Redis schema
    let update_data = json!({
        "password": {
            "is_protected": true,
            "key": token
        }
    });
    if let Err(err) = db::update(update_data) {
        let err = json!({ "message": format!("failed to set auth: {}", err) });
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(err)).into_response();
    }

    // 4️⃣ Build HTTP-only cookie
    let base = Cookie::new("key", token.clone());
    let cookie = Cookie::build(base)
        .http_only(true)
        .same_site(cookie::SameSite::Lax)
        .path("/")
        .build();

    // 5️⃣ Return 200 + cookie + success JSON
    let body = Json(json!({ "message": "Authentication enabled" }));
    (StatusCode::OK, jar.add(cookie), body).into_response()
}


pub async fn delete_auth(jar: CookieJar) -> Response {
    // 1️⃣ Check if auth is already disabled
    let is_protected = db::get_data("password.is_protected");
    if is_protected == "false" {
        let err = json!({ "message": "Authentication is already disabled" });
        return (StatusCode::BAD_REQUEST, Json(err)).into_response();
    }

    // 2️⃣ Look for the "key" cookie
    let Some(cookie) = jar.get("key") else {
        let err = json!({ "message": "Authentication cookie not found" });
        return (StatusCode::UNAUTHORIZED, Json(err)).into_response();
    };
    let token = cookie.value();

    // 3️⃣ Compare with what's in Redis
    let stored = db::get_data("password.key");
    if token != stored {
        let err = json!({ "message": "Invalid authentication token" });
        return (StatusCode::FORBIDDEN, Json(err)).into_response();
    }

    // 4️⃣ Everything checks out — disable auth in Redis
    let update_data = json!({
        "password": {
            "is_protected": false,
            "key": ""
        }
    });
    if let Err(err) = db::update(update_data) {
        let err = json!({ "message": format!("failed to disable auth: {}", err) });
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(err)).into_response();
    }

    // 5️⃣ Remove the cookie client-side
    let remove_cookie = Cookie::build("key");
    let jar = jar.remove(remove_cookie);

    // 6️⃣ Respond success
    let body = Json(json!({ "message": "Authentication disabled" }));
    (StatusCode::OK, jar, body).into_response()
}

#[derive(Deserialize)]
pub struct ShareParams {
    pub key: String,
}

pub async fn share_auth(
    jar: CookieJar,
    Query(params): Query<ShareParams>,
) -> Response {
    // 1️⃣ Make sure auth is enabled
    let is_protected = db::get_data("password.is_protected");
    if is_protected == "false" {
        let err = json!({ "message": "Authentication is already disabled" });
        return (StatusCode::BAD_REQUEST, Json(err)).into_response();
    }

    // 2️⃣ Compare query-key against stored key
    let stored = db::get_data("password.key");
    if params.key != stored {
        let err = json!({ "message": "Invalid key token" });
        return (StatusCode::FORBIDDEN, Json(err)).into_response();
    }

    // 3️⃣ Valid token: re-set HTTP-only cookie
    let base = Cookie::new("key", params.key.clone());
    let cookie = Cookie::build(base)
        .http_only(true)
        .same_site(cookie::SameSite::Lax)
        .path("/")
        .build();
    let jar = jar.add(cookie);

    // 4️⃣ Redirect to "/" (your SPA entrypoint)
    (jar, Redirect::to("/")).into_response()
}


pub async fn middleware_auth(
    jar: CookieJar,
    request: Request,
    next: Next,
) -> Response {
    // 1️⃣ Check if authentication is enabled
    let is_protected = db::get_data("password.is_protected");
    
    // If auth is disabled, allow all requests through
    if is_protected == "false" {
        return next.run(request).await;
    }

    // 2️⃣ Auth is enabled - check for valid cookie
    let Some(cookie) = jar.get("key") else {
        let err = json!({ "message": "Authentication required. Please contact the administrator" });
        return (StatusCode::UNAUTHORIZED, Json(err)).into_response();
    };

    // 3️⃣ Validate the token against stored value
    let token = cookie.value();
    let stored_key = db::get_data("password.key");
    
    if token != stored_key || stored_key.is_empty() {
        let err = json!({ "message": "Invalid authentication token" });
        return (StatusCode::FORBIDDEN, Json(err)).into_response();
    }

    // 4️⃣ Valid authentication - proceed with request
    next.run(request).await
}