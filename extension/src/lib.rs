use rusqlite::functions::FunctionFlags;
use rusqlite::{Connection, Error, Result};
use std::os::raw::c_int;

#[no_mangle]
pub unsafe extern "C" fn sqlite3_hamming_init(
    db: *mut rusqlite::ffi::sqlite3,
    _: *mut rusqlite::ffi::sqlite3_api_routines,
) -> c_int {
    let conn = match Connection::from_handle(db) {
        Ok(c) => c,
        Err(_) => return rusqlite::ffi::SQLITE_ERROR,
    };

    // Register the hamming_distance function
    let func = |a: Vec<u8>, b: Vec<u8>| -> Result<i64> {
        if a.len() != b.len() {
            return Err(Error::UserFunctionError(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "BLOBs must be same length",
            ))));
        }
        let mut dist = 0i64;
        for (byte_a, byte_b) in a.iter().zip(b.iter()) {
            dist += (byte_a ^ byte_b).count_ones() as i64;
        }
        Ok(dist)
    };

    if conn
        .create_scalar_function(
            "hamming_distance",
            2,
            FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
            move |ctx| {
                let a: Vec<u8> = ctx.get(0)?;
                let b: Vec<u8> = ctx.get(1)?;
                func(a, b)
            },
        )
        .is_err()
    {
        return rusqlite::ffi::SQLITE_ERROR;
    }

    rusqlite::ffi::SQLITE_OK
}
