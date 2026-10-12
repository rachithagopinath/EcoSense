/**
 * Minimal Web Serial API typings (not yet part of TypeScript's DOM lib).
 * https://wicg.github.io/serial/
 */
export {}

declare global {
  interface SerialPortInfo {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialOptions {
    baudRate: number
    dataBits?: 7 | 8
    stopBits?: 1 | 2
    parity?: 'none' | 'even' | 'odd'
    bufferSize?: number
    flowControl?: 'none' | 'hardware'
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array> | null
    readonly writable: WritableStream<Uint8Array> | null
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    getInfo(): SerialPortInfo
  }

  interface SerialPortRequestOptions {
    filters?: { usbVendorId?: number; usbProductId?: number }[]
  }

  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
  }

  interface Navigator {
    /** Present only in browsers that support Web Serial (desktop Chrome / Edge). */
    readonly serial?: Serial
  }
}
