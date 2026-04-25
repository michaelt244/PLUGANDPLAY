import { File } from 'buffer';
if (!global.File) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).File = File;
}
