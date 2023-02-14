extern crate dotenv;

pub mod models;
use crate::schema::*;
use diesel::prelude::*;
use dotenv::dotenv;
use models::{NewBook, Book};
use std::env;

pub fn establish_connection() -> SqliteConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

pub fn books_create(conn: &SqliteConnection, title: &str, author: &str) -> String {
    let new_Book = NewBook { title, author };
    let Book = diesel::insert_into(books::table)
        .values(&new_Book)
        .execute(conn)
        .expect("Error saving new post");
    let Book_json  =serde_json::to_string(&Book).unwrap();
    Book_json
}

pub fn books_list(conn: &SqliteConnection) -> String {
    let all_Books = books::dsl::books
        .load::<Book>(conn)
        .expect("Expect loading posts");
    let serialized = serde_json::to_string(&all_Books).unwrap();
    serialized
}

pub fn books_delete(conn: &SqliteConnection, qid: i32) {
    use books::dsl::{ id};
    let t = books::dsl::books.filter(id.eq(&qid));
    diesel::delete(t)
        .execute(conn)
        .expect("error deleting Book");
}
