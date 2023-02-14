use crate::schema::books;
use serde::{Serialize, Deserialize};

#[derive(Queryable, Serialize, Debug)]
pub struct Book {
    pub id: i32,
    pub title: String,
    pub author: String,
}


#[derive(Insertable, Serialize, Debug, Clone)]
#[table_name = "books"]
pub struct NewBook<'a> {
    pub title: &'a str,
    pub author: &'a str,
}