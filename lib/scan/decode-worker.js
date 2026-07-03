/* Web Worker : décodage EAN-13 / UPC-A / QR hors du thread UI. */
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.UPC_A,
  BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

const reader = new MultiFormatReader();
reader.setHints(hints);

self.onmessage = (e) => {
  const { data, width, height } = e.data;
  try {
    // RGBA -> luminance
    const luminance = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      luminance[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    }
    const source = new RGBLuminanceSource(luminance, width, height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const result = reader.decode(bitmap);
    const format = result.getBarcodeFormat();
    const codeType =
      format === BarcodeFormat.EAN_13 ? 'ean13' : format === BarcodeFormat.UPC_A ? 'upca' : 'qr';
    self.postMessage({ ok: true, code: result.getText(), codeType });
  } catch {
    self.postMessage({ ok: false });
  } finally {
    reader.reset();
  }
};
