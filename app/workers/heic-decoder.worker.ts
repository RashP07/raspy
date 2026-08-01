type HeifDisplayData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

type HeifImage = {
  get_width(): number;
  get_height(): number;
  display(
    imageData: HeifDisplayData,
    callback: (result?: HeifDisplayData) => void,
  ): void;
};

type LibHeif = {
  HeifDecoder: new () => {
    decode(data: Uint8Array): HeifImage[];
  };
};

type DecodeRequest = {
  id: number;
  buffer: ArrayBuffer;
};

let decoderModule: Promise<LibHeif> | undefined;

async function getDecoderModule(): Promise<LibHeif> {
  decoderModule ??= import("libheif-js/wasm-bundle").then(
    async (module) => (await Promise.resolve(module.default)) as LibHeif,
  );
  return decoderModule;
}

self.onmessage = async (event: MessageEvent<DecodeRequest>) => {
  const { id, buffer } = event.data;

  try {
    const libheif = await getDecoderModule();
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(new Uint8Array(buffer));
    const image = images[0];

    if (!image) {
      throw new Error("The HEIC file does not contain a readable image.");
    }

    const width = image.get_width();
    const height = image.get_height();
    if (!width || !height) {
      throw new Error("The HEIC image has invalid dimensions.");
    }
    if (width * height > 60_000_000) {
      throw new Error("The HEIC photo exceeds the 60 megapixel limit.");
    }

    const pixels = new Uint8ClampedArray(width * height * 4);
    const decoded = await new Promise<HeifDisplayData>((resolve, reject) => {
      image.display({ data: pixels, width, height }, (result) =>
        result
          ? resolve(result)
          : reject(new Error("HEIC pixel decoding failed.")),
      );
    });

    const output = decoded.data.buffer as ArrayBuffer;
    self.postMessage(
      { id, width, height, buffer: output },
      { transfer: [output] },
    );
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error
          ? error.message
          : "This HEIC photo could not be decoded.",
    });
  }
};

export {};
