export interface SyncEvent extends Event {
  tag: string
  waitUntil: (promise: Promise<any>) => void
}