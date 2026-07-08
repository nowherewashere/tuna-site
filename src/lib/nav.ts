// Full-page navigation helpers (kept out of components so the react-hooks
// immutability rule doesn't flag window.location as a mutated value).

export function redirectTo(url: string): void {
  window.location.assign(url);
}

export function reloadPage(): void {
  window.location.reload();
}
