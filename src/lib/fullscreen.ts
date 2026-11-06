type ScreenDocument = Document & {
  webkitFullscreenElement?: Element;
  webkitCurrentFullScreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type ScreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function isFullscreen(document: Document): boolean {
  const doc = document as ScreenDocument;
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.webkitCurrentFullScreenElement);
}

export async function toggleFullscreen(document: Document): Promise<'entered' | 'exited' | 'unsupported'> {
  const doc = document as ScreenDocument;
  if (isFullscreen(doc)) {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    else return 'unsupported';
    return 'exited';
  }
  const root = doc.documentElement as ScreenElement;
  if (root.requestFullscreen) await root.requestFullscreen();
  else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
  else return 'unsupported';
  return 'entered';
}
