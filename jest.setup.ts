import { File } from 'buffer';
if (!global.File) {
  (global as typeof globalThis & { File: typeof File }).File = File;
}
