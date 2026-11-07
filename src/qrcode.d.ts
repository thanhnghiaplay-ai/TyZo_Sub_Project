declare module "qrcode" {
  export function toDataURL(text: string, options?: { margin?: number; width?: number; errorCorrectionLevel?: string }): Promise<string>;
}
