/**
 * Bun honours `idleTimeout` on a unix-socket `Bun.serve` at runtime (a 13 s request answers with it
 * and is cut at Bun's 10 s default without it), but its typings only declare the option for TCP
 * servers. This augmentation lets the UI socket server share the TCP server's idle budget without a
 * cast.
 */

import "bun";

declare module "bun" {
  namespace Serve {
    // Interface merging requires the original type parameter name, even though it is unused here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface UnixServeOptions<WebSocketData> {
      /** Seconds before an inactive connection is closed (runtime default 10). */
      idleTimeout?: number;
    }
  }
}
