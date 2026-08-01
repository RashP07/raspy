declare module "libheif-js/wasm-bundle" {
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

  const libheif: LibHeif | Promise<LibHeif>;
  export default libheif;
}
