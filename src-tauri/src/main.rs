#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use diesel_migrations::{embed_migrations, EmbedMigrations};

use reqwest::Url;
use tauri::App;
// use schema::todos;
use std::error::Error;
use std::{error, string, sync::Mutex};

// Start of DB example
// use super::db::{};
#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_migrations;
embed_migrations!("./migrations/");

use diesel::prelude::*;
pub mod db;
pub mod schema;

#[tauri::command]
fn books_list(state: tauri::State<AppState>) -> String {
    let con = state.conn.lock().unwrap();
    db::books_list(&con)
}
#[tauri::command]
fn books_create(title: String, author: String, state: tauri::State<AppState>) -> String {
    let conn = state.conn.lock().unwrap();
    db::books_create(&conn, &title, &author).to_string()
}

#[tauri::command]
fn books_delete(id: i32, state: tauri::State<AppState>) -> String {
    let conn = state.conn.lock().unwrap();
    db::books_delete(&conn, id);
    String::from("")
}
// End of DB example

struct AppState {
    count: Mutex<i64>,
    conn: Mutex<SqliteConnection>,
}

// Count Commands
#[tauri::command]
fn get_count(state: tauri::State<AppState>) -> i64 {
    state.count.lock().unwrap().clone()
}

#[tauri::command]
fn update_count(update: i64, state: tauri::State<AppState>) -> i64 {
    let mut cnt = state.count.lock().unwrap();
    *cnt += update;
    cnt.clone()
}

// API commands
#[tauri::command]
async fn get_subreddit(sub: String) -> String {
    println!("{}", sub);
    let url = format!("https://reddit.com/r/{}.json", sub);
    let res = reqwest::get(url);
    let body = res.await;
    if body.is_err() {
        return String::from("");
    }
    let unwrapped = body.unwrap();
    let text = unwrapped.text();
    let body = text.await;
    if body.is_err() {
        return String::from("");
    }
    let return_val = body.unwrap();
    return return_val;
}

fn main() {
    let conn = db::establish_connection();
    let state = AppState {
        count: Default::default(),
        conn: Mutex::new(db::establish_connection()),
    };

    // embedded_migrations::run(&conn);
    diesel_migrations::run_pending_migrations(&conn).expect("Error migrating");
    tauri::Builder::default()
        .setup(|app| Ok(()))
        .plugin(tauri_plugin_persisted_scope::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_count,
            update_count,
            get_subreddit,
            books_list,
            books_create,
            books_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
