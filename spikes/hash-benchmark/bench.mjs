// hash-benchmark.js
import fs from "fs";
import { run, bench } from "mitata";

// SHA-256 (built-in crypto)
import crypto from "crypto";

// xxHash3
import xxhash from "xxhash-wasm";

// BLAKE3
import { blake3 } from '@noble/hashes/blake3.js';

// If test file doesn’t exist, generate ~100MB of random data
const MB = 1024 * 1024;
const SIZE = 100 * MB;
console.log(`Generating ${SIZE / MB} MB of random data in memory...`);
const data = crypto.randomBytes(SIZE);

// --- Init xxHash3 ---
const { h64 } = await xxhash();

// --- Benchmarks ---
bench("SHA-256 (crypto)", () => {
  crypto.createHash("sha256").update(data).digest("hex");
});

bench("xxHash3 (64-bit)", () => {
  h64(data.toString());
});

bench("BLAKE3", () => {
  blake3(data);
});

// --- Run all ---
await run();
