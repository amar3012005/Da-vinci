// One successful launcher exchange may be consumed by its immediate SPA route.
// This never persists credentials or authorizes a refresh/new browser document.
let exchanged;
export function rememberHarnessExchange(path) {
  exchanged = { path, expires: Date.now() + 10000 };
}
export function consumeHarnessExchange(path) {
  const receipt = exchanged;
  exchanged = undefined;
  return receipt?.path === path && receipt.expires > Date.now();
}
