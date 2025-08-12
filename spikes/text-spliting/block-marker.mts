interface FontStyle {
  family: string
  weight: string
  style: string
  size: number
}

interface Line {
  text: string
  font: FontStyle
  bbox: { x: number; y: number; w: number; h: number }
}

interface Block {
  type: string
  bbox: { x: number; y: number; w: number; h: number }
  lines: Line[]
}

export interface StyledBlock {
  text: string
  font: FontStyle
  bbox: { x: number; y: number; w: number; h: number }
}

function fontsAreSimilar(f1: FontStyle, f2: FontStyle): boolean {
  const sizeThreshold = 1
  return (
    f1.family === f2.family &&
    f1.weight === f2.weight &&
    f1.style === f2.style &&
    Math.abs(f1.size - f2.size) <= sizeThreshold
  )
}

function blocksAreCloseVertically(
  b1: { y: number; h: number },
  b2: { y: number; h: number }
): boolean {
  const gap = b2.y - (b1.y + b1.h)
  const avgHeight = (b1.h + b2.h) / 2
  return gap >= 0 && gap <= avgHeight * 1.5
}

function mergeBBoxes(
  b1: { x: number; y: number; w: number; h: number },
  b2: { x: number; y: number; w: number; h: number }
) {
  const x = Math.min(b1.x, b2.x)
  const y = Math.min(b1.y, b2.y)
  const right = Math.max(b1.x + b1.w, b2.x + b2.w)
  const bottom = Math.max(b1.y + b1.h, b2.y + b2.h)
  return { x, y, w: right - x, h: bottom - y }
}

export function groupIntoStyledBlocks(blocks: Block[]): StyledBlock[] {
  // Sort blocks top to bottom
  blocks.sort((a, b) => a.bbox.y - b.bbox.y)

  const styledBlocks: StyledBlock[] = []

  for (const block of blocks) {
    if (block.lines.length === 0) continue // skip empty blocks

    const font = block.lines[0].font
    const text = block.lines.map((line) => line.text).join(' ')

    if (styledBlocks.length === 0) {
      styledBlocks.push({ text, font, bbox: block.bbox })
      continue
    }

    const lastStyled = styledBlocks[styledBlocks.length - 1]

    if (
      fontsAreSimilar(font, lastStyled.font) &&
      blocksAreCloseVertically(lastStyled.bbox, block.bbox)
    ) {
      // Merge text and bbox
      lastStyled.text += ' ' + text
      lastStyled.bbox = mergeBBoxes(lastStyled.bbox, block.bbox)
    } else {
      styledBlocks.push({ text, font, bbox: block.bbox })
    }
  }

  return styledBlocks
}
