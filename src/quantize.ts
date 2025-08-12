type Precision = 'float32' | 'int8' | 'uint8' | 'binary' | 'ubinary'

export function quantizeEmbeddings(
  embeddings: number[][] | Float32Array[],
  precision: Precision,
  ranges?: number[][],
  calibrationEmbeddings?: number[][]
): number[][] | Int8Array[] | Uint8Array[] {
  // Convert Tensor-like objects to arrays (if needed, adjust for your environment)
  // Here we assume embeddings are already numeric arrays

  // Check that embeddings are floats
  if (isTypedIntArray(embeddings)) {
    throw new Error('Embeddings to quantize must be float rather than int8 or uint8.')
  }

  if (precision === 'float32') {
    return embeddings.map((row) => Float32Array.from(row))
  }

  if (precision === 'int8' || precision === 'uint8') {
    // Either use provided ranges, calibration dataset, or provided embeddings
    if (!ranges) {
      const source = calibrationEmbeddings ?? embeddings
      if (embeddings.length < 100 && !calibrationEmbeddings) {
        console.warn(
          `Computing ${precision} quantization buckets based on ${embeddings.length} embedding${embeddings.length !== 1 ? 's' : ''}. ` +
            `${precision} quantization is more stable with ranges from more embeddings or a calibration dataset.`
        )
      }
      const mins = getColumnMin(source)
      const maxs = getColumnMax(source)
      ranges = [mins, maxs]
    }
    const starts = ranges[0]
    const steps = ranges[0].map((min, i) => (ranges![1][i] - min) / 255)

    if (precision === 'uint8') {
      return embeddings.map((row) =>
        Uint8Array.from(row.map((val, i) => Math.round((val - starts[i]) / steps[i])))
      )
    } else {
      return embeddings.map((row) =>
        Int8Array.from(row.map((val, i) => Math.round((val - starts[i]) / steps[i] - 128)))
      )
    }
  }

  if (precision === 'binary') {
    return embeddings.map((row) => {
      const bits = row.map((v) => (v > 0 ? 1 : 0))
      return Int8Array.from(packBits(bits).map((v) => v - 128))
    })
  }

  if (precision === 'ubinary') {
    return embeddings.map((row) => {
      const bits = row.map((v) => (v > 0 ? 1 : 0))
      return Uint8Array.from(packBits(bits))
    })
  }

  throw new Error(`Precision "${precision}" is not supported.`)
}

// ---------- Helpers ----------

function isTypedIntArray(data: any): boolean {
  if (Array.isArray(data) && data.length > 0) {
    const firstRow = Array.isArray(data[0]) ? data[0] : []
    return firstRow instanceof Int8Array || firstRow instanceof Uint8Array
  }
  return false
}

function getColumnMin(data: number[][] | Float32Array[]): number[] {
  const cols = data[0].length
  const mins = Array(cols).fill(Infinity)
  for (const row of data) {
    row.forEach((val, i) => {
      if (val < mins[i]) mins[i] = val
    })
  }
  return mins
}

function getColumnMax(data: number[][] | Float32Array[]): number[] {
  const cols = data[0].length
  const maxs = Array(cols).fill(-Infinity)
  for (const row of data) {
    row.forEach((val, i) => {
      if (val > maxs[i]) maxs[i] = val
    })
  }
  return maxs
}

function packBits(bits: number[]): number[] {
  const packed: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let b = 0; b < 8 && i + b < bits.length; b++) {
      byte |= bits[i + b] << (7 - b)
    }
    packed.push(byte)
  }
  return packed
}
