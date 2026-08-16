/**
 * A baseline JPEG encoder that takes the image a band at a time.
 *
 * `canvas.toBlob` is all-or-nothing: it wants the entire image resident, which
 * is what puts a hard ceiling on how large an export a phone can finish. A
 * baseline JPEG does not need that. With 4:2:0 subsampling its unit of work is
 * a 16-pixel-tall MCU row that depends on nothing above or below it, so the
 * image can be rendered, encoded, and discarded sixteen rows at a time. Peak
 * memory stops scaling with the output and becomes a function of its width.
 *
 * Everything here is baseline sequential DCT (ITU-T T.81), with the example
 * quantization and Huffman tables from Annex K — the same ones libjpeg ships
 * as its defaults, which is why any decoder will read what comes out.
 */

/** Natural (row-major) position of each coefficient in zig-zag order. */
const ZIGZAG = new Int32Array([
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40,
  48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29,
  22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54,
  47, 55, 62, 63,
]);

/** Annex K.1 luminance table, natural order. */
const LUMA_QUANT = new Int32Array([
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16,
  24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109,
  103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
]);

/** Annex K.1 chrominance table, natural order. */
const CHROMA_QUANT = new Int32Array([
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56,
  99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99,
]);

/**
 * Scale factors for the AAN forward DCT. The transform leaves each coefficient
 * multiplied by these, so they are folded into the reciprocal quantizers below
 * and cost nothing at encode time.
 */
const AAN_SCALE = [
  1.0, 1.387039845, 1.306562965, 1.175875602, 1.0, 0.785694958, 0.5411961,
  0.275899379,
];

// Annex K.3 Huffman specifications: counts of codes of each length 1..16,
// followed by the symbols those codes are assigned to, shortest code first.
const DC_LUMA_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const DC_LUMA_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const DC_CHROMA_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const DC_CHROMA_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const AC_LUMA_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const AC_LUMA_VALUES = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13,
  0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42,
  0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a,
  0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
  0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a,
  0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67,
  0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84,
  0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
  0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3,
  0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7,
  0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1,
  0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
  0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
];

const AC_CHROMA_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const AC_CHROMA_VALUES = [
  0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51,
  0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1,
  0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24,
  0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a,
  0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
  0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66,
  0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82,
  0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96,
  0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa,
  0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
  0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9,
  0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4,
  0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
];

interface HuffmanTable {
  codes: Uint16Array;
  sizes: Uint8Array;
}

function buildHuffmanTable(bits: number[], values: number[]): HuffmanTable {
  const codes = new Uint16Array(256);
  const sizes = new Uint8Array(256);
  let code = 0;
  let k = 0;
  for (let length = 1; length <= 16; length++) {
    for (let i = 0; i < bits[length - 1]!; i++) {
      const symbol = values[k++]!;
      codes[symbol] = code;
      sizes[symbol] = length;
      code++;
    }
    code <<= 1;
  }
  return { codes, sizes };
}

const DC_LUMA = buildHuffmanTable(DC_LUMA_BITS, DC_LUMA_VALUES);
const AC_LUMA = buildHuffmanTable(AC_LUMA_BITS, AC_LUMA_VALUES);
const DC_CHROMA = buildHuffmanTable(DC_CHROMA_BITS, DC_CHROMA_VALUES);
const AC_CHROMA = buildHuffmanTable(AC_CHROMA_BITS, AC_CHROMA_VALUES);

/**
 * Annex K quality scaling, as libjpeg does it: below 50 the tables grow
 * hyperbolically, above 50 they shrink linearly to nothing at 100.
 */
function quantizerFor(base: Int32Array, quality: number): Int32Array {
  const clamped = Math.min(100, Math.max(1, Math.round(quality)));
  const scale = clamped < 50 ? 5000 / clamped : 200 - clamped * 2;
  const table = new Int32Array(64);
  for (let i = 0; i < 64; i++) {
    table[i] = Math.min(255, Math.max(1, Math.round((base[i]! * scale + 50) / 100)));
  }
  return table;
}

/** Reciprocals with the AAN scaling and the transform's /8 folded in. */
function divisorsFor(quant: Int32Array): Float32Array {
  const divisors = new Float32Array(64);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const i = row * 8 + col;
      divisors[i] = 1 / (quant[i]! * AAN_SCALE[row]! * AAN_SCALE[col]! * 8);
    }
  }
  return divisors;
}

/**
 * Arai–Agui–Nakajima forward DCT, in place over a natural-order 8×8 block.
 * Five multiplies per 1-D pass instead of the sixty-four a direct evaluation
 * would need — at a megapixel a second that difference is the whole feature.
 */
function forwardDct(block: Float32Array): void {
  for (let i = 0; i < 8; i++) {
    const offset = i * 8;
    const d0 = block[offset]!;
    const d1 = block[offset + 1]!;
    const d2 = block[offset + 2]!;
    const d3 = block[offset + 3]!;
    const d4 = block[offset + 4]!;
    const d5 = block[offset + 5]!;
    const d6 = block[offset + 6]!;
    const d7 = block[offset + 7]!;

    const t0 = d0 + d7;
    const t7 = d0 - d7;
    const t1 = d1 + d6;
    const t6 = d1 - d6;
    const t2 = d2 + d5;
    const t5 = d2 - d5;
    const t3 = d3 + d4;
    const t4 = d3 - d4;

    let t10 = t0 + t3;
    const t13 = t0 - t3;
    let t11 = t1 + t2;
    const t12 = t1 - t2;

    block[offset] = t10 + t11;
    block[offset + 4] = t10 - t11;

    const z1 = (t12 + t13) * 0.707106781;
    block[offset + 2] = t13 + z1;
    block[offset + 6] = t13 - z1;

    t10 = t4 + t5;
    t11 = t5 + t6;
    const t12b = t6 + t7;

    const z5 = (t10 - t12b) * 0.382683433;
    const z2 = 0.5411961 * t10 + z5;
    const z4 = 1.306562965 * t12b + z5;
    const z3 = t11 * 0.707106781;
    const z11 = t7 + z3;
    const z13 = t7 - z3;

    block[offset + 5] = z13 + z2;
    block[offset + 3] = z13 - z2;
    block[offset + 1] = z11 + z4;
    block[offset + 7] = z11 - z4;
  }

  for (let i = 0; i < 8; i++) {
    const d0 = block[i]!;
    const d1 = block[i + 8]!;
    const d2 = block[i + 16]!;
    const d3 = block[i + 24]!;
    const d4 = block[i + 32]!;
    const d5 = block[i + 40]!;
    const d6 = block[i + 48]!;
    const d7 = block[i + 56]!;

    const t0 = d0 + d7;
    const t7 = d0 - d7;
    const t1 = d1 + d6;
    const t6 = d1 - d6;
    const t2 = d2 + d5;
    const t5 = d2 - d5;
    const t3 = d3 + d4;
    const t4 = d3 - d4;

    let t10 = t0 + t3;
    const t13 = t0 - t3;
    let t11 = t1 + t2;
    const t12 = t1 - t2;

    block[i] = t10 + t11;
    block[i + 32] = t10 - t11;

    const z1 = (t12 + t13) * 0.707106781;
    block[i + 16] = t13 + z1;
    block[i + 48] = t13 - z1;

    t10 = t4 + t5;
    t11 = t5 + t6;
    const t12b = t6 + t7;

    const z5 = (t10 - t12b) * 0.382683433;
    const z2 = 0.5411961 * t10 + z5;
    const z4 = 1.306562965 * t12b + z5;
    const z3 = t11 * 0.707106781;
    const z11 = t7 + z3;
    const z13 = t7 - z3;

    block[i + 40] = z13 + z2;
    block[i + 24] = z13 - z2;
    block[i + 8] = z11 + z4;
    block[i + 56] = z11 - z4;
  }
}

/** Bits needed to carry `value`, which is its JPEG magnitude category. */
function magnitudeCategory(value: number): number {
  let magnitude = value < 0 ? -value : value;
  let bits = 0;
  while (magnitude > 0) {
    bits++;
    magnitude >>= 1;
  }
  return bits;
}

export interface BandedJpegOptions {
  width: number;
  height: number;
  /** 0–1, matching ExportOptions.quality. */
  quality: number;
}

/**
 * Feed it rows from the top down, in any sized chunks; it holds at most one
 * 16-row MCU strip at a time.
 */
export class BandedJpegEncoder {
  private readonly width: number;
  private readonly height: number;
  private readonly paddedWidth: number;
  private readonly lumaQuant: Int32Array;
  private readonly chromaQuant: Int32Array;
  private readonly lumaDivisors: Float32Array;
  private readonly chromaDivisors: Float32Array;

  private out: Uint8Array;
  private length = 0;
  private bitBuffer = 0;
  private bitCount = 0;

  /** One MCU strip: 16 rows of RGBA at the MCU-padded width. */
  private readonly strip: Uint8Array;
  private stripRows = 0;
  private rowsTaken = 0;
  private finished = false;

  private dcY = 0;
  private dcCb = 0;
  private dcCr = 0;

  private readonly luma = new Float32Array(256);
  private readonly cb = new Float32Array(64);
  private readonly cr = new Float32Array(64);
  private readonly block = new Float32Array(64);

  constructor(options: BandedJpegOptions) {
    if (!Number.isInteger(options.width) || options.width < 1) {
      throw new RangeError("JPEG width must be a positive integer");
    }
    if (!Number.isInteger(options.height) || options.height < 1) {
      throw new RangeError("JPEG height must be a positive integer");
    }
    this.width = options.width;
    this.height = options.height;
    this.paddedWidth = Math.ceil(options.width / 16) * 16;
    this.lumaQuant = quantizerFor(LUMA_QUANT, options.quality * 100);
    this.chromaQuant = quantizerFor(CHROMA_QUANT, options.quality * 100);
    this.lumaDivisors = divisorsFor(this.lumaQuant);
    this.chromaDivisors = divisorsFor(this.chromaQuant);
    this.strip = new Uint8Array(this.paddedWidth * 16 * 4);
    // Rough starting guess; grows geometrically from here.
    this.out = new Uint8Array(Math.min(1 << 22, this.width * this.height + 4096));
    this.writeHeader();
  }

  /** Rows still owed before {@link finish} produces a complete image. */
  get remainingRows(): number {
    return this.height - this.rowsTaken;
  }

  /**
   * Takes `rows` rows of RGBA, top-down. Alpha is ignored — JPEG has no
   * transparency and the renderer has already composited over white.
   */
  addRows(rgba: Uint8Array | Uint8ClampedArray, rows: number): void {
    if (this.finished) throw new Error("Encoder already finished");
    for (let row = 0; row < rows && this.rowsTaken < this.height; row++) {
      this.takeRow(rgba, row * this.width * 4);
    }
  }

  private takeRow(rgba: Uint8Array | Uint8ClampedArray, sourceOffset: number) {
    const target = this.stripRows * this.paddedWidth * 4;
    const bytes = this.width * 4;
    this.strip.set(rgba.subarray(sourceOffset, sourceOffset + bytes), target);
    // Replicate the last real pixel across the MCU padding, so the padding
    // costs almost nothing to encode and cannot bleed an edge artefact back
    // into the visible pixels.
    for (let x = this.width; x < this.paddedWidth; x++) {
      const from = target + (this.width - 1) * 4;
      const to = target + x * 4;
      this.strip[to] = this.strip[from]!;
      this.strip[to + 1] = this.strip[from + 1]!;
      this.strip[to + 2] = this.strip[from + 2]!;
    }
    this.stripRows++;
    this.rowsTaken++;
    if (this.stripRows === 16) this.flushStrip();
  }

  /** Completes the image and returns the JPEG bytes. */
  finish(): Uint8Array {
    if (this.finished) throw new Error("Encoder already finished");
    // A caller that stopped short still gets a valid image: the last row it
    // did provide is repeated down to the declared height.
    while (this.rowsTaken < this.height) {
      const last = Math.max(0, this.stripRows - 1) * this.paddedWidth * 4;
      this.strip.copyWithin(this.stripRows * this.paddedWidth * 4, last, last + this.paddedWidth * 4);
      this.stripRows++;
      this.rowsTaken++;
      if (this.stripRows === 16) this.flushStrip();
    }
    if (this.stripRows > 0) {
      const last = (this.stripRows - 1) * this.paddedWidth * 4;
      while (this.stripRows < 16) {
        this.strip.copyWithin(this.stripRows * this.paddedWidth * 4, last, last + this.paddedWidth * 4);
        this.stripRows++;
      }
      this.flushStrip();
    }
    this.flushBits();
    this.writeMarker(0xd9); // EOI
    this.finished = true;
    return this.out.subarray(0, this.length);
  }

  private flushStrip(): void {
    const mcus = this.paddedWidth / 16;
    for (let mcu = 0; mcu < mcus; mcu++) {
      this.readMcu(mcu * 16);
      this.encodeBlock(this.luma, 0, 16, true);
      this.encodeBlock(this.luma, 8, 16, true);
      this.encodeBlock(this.luma, 128, 16, true);
      this.encodeBlock(this.luma, 136, 16, true);
      this.encodeBlock(this.cb, 0, 8, false);
      this.encodeBlock(this.cr, 0, 8, false);
    }
    this.stripRows = 0;
  }

  /** Colour-converts one 16×16 MCU out of the strip, subsampling chroma 2×2. */
  private readMcu(startX: number): void {
    this.cb.fill(0);
    this.cr.fill(0);
    for (let y = 0; y < 16; y++) {
      const rowStart = (y * this.paddedWidth + startX) * 4;
      for (let x = 0; x < 16; x++) {
        const i = rowStart + x * 4;
        const r = this.strip[i]!;
        const g = this.strip[i + 1]!;
        const b = this.strip[i + 2]!;
        this.luma[y * 16 + x] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
        const chromaIndex = (y >> 1) * 8 + (x >> 1);
        this.cb[chromaIndex]! +=
          (-0.168736 * r - 0.331264 * g + 0.5 * b) * 0.25;
        this.cr[chromaIndex]! +=
          (0.5 * r - 0.418688 * g - 0.081312 * b) * 0.25;
      }
    }
  }

  private encodeBlock(
    plane: Float32Array,
    offset: number,
    stride: number,
    isLuma: boolean,
  ): void {
    const block = this.block;
    for (let row = 0; row < 8; row++) {
      const from = offset + row * stride;
      for (let col = 0; col < 8; col++) {
        block[row * 8 + col] = plane[from + col]!;
      }
    }
    forwardDct(block);

    const divisors = isLuma ? this.lumaDivisors : this.chromaDivisors;
    const dcTable = isLuma ? DC_LUMA : DC_CHROMA;
    const acTable = isLuma ? AC_LUMA : AC_CHROMA;

    const dc = Math.round(block[0]! * divisors[0]!);
    // DC is coded as a difference from the previous block of the same
    // component, so each component carries its own predictor.
    const previousDc = isLuma
      ? this.dcY
      : plane === this.cb
        ? this.dcCb
        : this.dcCr;
    const diff = dc - previousDc;
    if (isLuma) this.dcY = dc;
    else if (plane === this.cb) this.dcCb = dc;
    else this.dcCr = dc;

    const dcCategory = magnitudeCategory(diff);
    this.writeHuffman(dcTable, dcCategory);
    if (dcCategory > 0) this.writeValue(diff, dcCategory);

    let runLength = 0;
    for (let k = 1; k < 64; k++) {
      const index = ZIGZAG[k]!;
      const coefficient = Math.round(block[index]! * divisors[index]!);
      if (coefficient === 0) {
        runLength++;
        continue;
      }
      while (runLength > 15) {
        this.writeHuffman(acTable, 0xf0); // ZRL: sixteen zeroes
        runLength -= 16;
      }
      const category = magnitudeCategory(coefficient);
      this.writeHuffman(acTable, (runLength << 4) | category);
      this.writeValue(coefficient, category);
      runLength = 0;
    }
    if (runLength > 0) this.writeHuffman(acTable, 0x00); // EOB
  }

  private writeHuffman(table: HuffmanTable, symbol: number): void {
    const size = table.sizes[symbol]!;
    if (size === 0) throw new Error(`No Huffman code for symbol ${symbol}`);
    this.writeBits(table.codes[symbol]!, size);
  }

  /** The magnitude bits: negatives are stored as their one's complement. */
  private writeValue(value: number, category: number): void {
    const encoded = value < 0 ? value + (1 << category) - 1 : value;
    this.writeBits(encoded & ((1 << category) - 1), category);
  }

  private writeBits(code: number, size: number): void {
    this.bitBuffer = (this.bitBuffer << size) | code;
    this.bitCount += size;
    while (this.bitCount >= 8) {
      const byte = (this.bitBuffer >> (this.bitCount - 8)) & 0xff;
      this.push(byte);
      // Byte stuffing: a literal 0xFF in the entropy stream would otherwise
      // read as the start of a marker.
      if (byte === 0xff) this.push(0x00);
      this.bitCount -= 8;
    }
    this.bitBuffer &= (1 << this.bitCount) - 1;
  }

  private flushBits(): void {
    if (this.bitCount > 0) {
      // Pad to the byte boundary with 1s, per T.81 F.1.2.3.
      this.writeBits((1 << (8 - this.bitCount)) - 1, 8 - this.bitCount);
    }
  }

  private writeHeader(): void {
    this.writeMarker(0xd8); // SOI

    this.writeMarker(0xe0); // APP0 / JFIF
    this.writeUint16(16);
    this.pushAll([0x4a, 0x46, 0x49, 0x46, 0x00]); // "JFIF\0"
    this.pushAll([1, 1, 0]); // version 1.1, no density units
    this.writeUint16(1); // x density
    this.writeUint16(1); // y density
    this.pushAll([0, 0]); // no thumbnail

    this.writeMarker(0xdb); // DQT
    this.writeUint16(132);
    this.push(0x00);
    for (let k = 0; k < 64; k++) this.push(this.lumaQuant[ZIGZAG[k]!]!);
    this.push(0x01);
    for (let k = 0; k < 64; k++) this.push(this.chromaQuant[ZIGZAG[k]!]!);

    this.writeMarker(0xc0); // SOF0, baseline
    this.writeUint16(17);
    this.push(8); // 8-bit samples
    this.writeUint16(this.height);
    this.writeUint16(this.width);
    this.push(3); // three components
    this.pushAll([1, 0x22, 0]); // Y, 2×2 sampling, quant table 0
    this.pushAll([2, 0x11, 1]); // Cb, 1×1, quant table 1
    this.pushAll([3, 0x11, 1]); // Cr, 1×1, quant table 1

    this.writeHuffmanTable(0x00, DC_LUMA_BITS, DC_LUMA_VALUES);
    this.writeHuffmanTable(0x10, AC_LUMA_BITS, AC_LUMA_VALUES);
    this.writeHuffmanTable(0x01, DC_CHROMA_BITS, DC_CHROMA_VALUES);
    this.writeHuffmanTable(0x11, AC_CHROMA_BITS, AC_CHROMA_VALUES);

    this.writeMarker(0xda); // SOS
    this.writeUint16(12);
    this.push(3);
    this.pushAll([1, 0x00]); // Y uses DC/AC table 0
    this.pushAll([2, 0x11]); // Cb uses DC/AC table 1
    this.pushAll([3, 0x11]); // Cr uses DC/AC table 1
    this.pushAll([0, 63, 0]); // full spectral selection, no successive approx
  }

  private writeHuffmanTable(id: number, bits: number[], values: number[]) {
    this.writeMarker(0xc4); // DHT
    this.writeUint16(2 + 1 + 16 + values.length);
    this.push(id);
    for (const count of bits) this.push(count);
    for (const value of values) this.push(value);
  }

  private writeMarker(code: number): void {
    this.push(0xff);
    this.push(code);
  }

  private writeUint16(value: number): void {
    this.push((value >> 8) & 0xff);
    this.push(value & 0xff);
  }

  private pushAll(bytes: number[]): void {
    for (const byte of bytes) this.push(byte);
  }

  private push(byte: number): void {
    if (this.length === this.out.length) {
      const grown = new Uint8Array(this.out.length * 2);
      grown.set(this.out);
      this.out = grown;
    }
    this.out[this.length++] = byte;
  }
}
