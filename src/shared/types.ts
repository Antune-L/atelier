/** Live CPU/RAM snapshot of the host, only exposed on cloud instances. */
export interface HostMetrics {
  /** Null on the first sample: CPU usage needs two readings to compute a delta. */
  cpuPercent: number | null;
  memUsedBytes: number;
  memTotalBytes: number;
  loadAvg1: number;
  /** Date.now() in ms at sampling time. */
  sampledAt: number;
}
