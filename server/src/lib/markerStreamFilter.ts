/**
 * Incrementally removes Sola control markers from a token stream before the
 * tokens are sent to the client.
 *
 * The model emits `[[ACTIVITY:{...}]]` and `[[MEMORY:"..."]]` blocks at the end
 * of a reply. Some models (notably GPT-OSS via Pollinations) also leak internal
 * notes inside `{{...}}` blocks. Those blocks must never be shown in the chat
 * bubble, including when a marker is split across multiple streamed chunks.
 */
const MARKER_PAIRS = [
  { open: '[[', close: ']]' },
  { open: '{{', close: '}}' },
] as const;

interface MarkerMatch {
  index: number;
  open: string;
  close: string;
}

export function createMarkerStreamFilter(emit: (text: string) => void) {
  let pending = '';

  const findNextMarker = (text: string): MarkerMatch | null => {
    let best: MarkerMatch | null = null;

    for (const pair of MARKER_PAIRS) {
      const index = text.indexOf(pair.open);
      if (index !== -1 && (!best || index < best.index)) {
        best = { index, open: pair.open, close: pair.close };
      }
    }

    return best;
  };

  /**
   * Finds the end of a marker, respecting nested open/close pairs so a block
   * like `{{outer {{inner}} outer}}` is removed as one unit.
   * Returns null when the closing sequence has not arrived yet.
   */
  const findMarkerEnd = (text: string, marker: MarkerMatch): number | null => {
    let depth = 1;
    let cursor = marker.index + marker.open.length;

    while (depth > 0) {
      const nextOpen = text.indexOf(marker.open, cursor);
      const nextClose = text.indexOf(marker.close, cursor);

      if (nextClose === -1) return null;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        cursor = nextOpen + marker.open.length;
      } else {
        depth -= 1;
        cursor = nextClose + marker.close.length;
      }
    }

    return cursor;
  };

  /**
   * Returns the index where text that is safe to emit ends. Trailing whitespace
   * and a possible marker opener are held back so that a marker arriving in the
   * next chunk never leaves double spaces or a dangling bracket in the UI.
   */
  const safeCutoff = (text: string): number => {
    const match = /[\s]*[[{]?$/.exec(text);
    return match ? match.index : text.length;
  };

  const drain = () => {
    let output = '';

    while (pending.length > 0) {
      const marker = findNextMarker(pending);

      if (!marker) {
        const cut = safeCutoff(pending);
        output += pending.slice(0, cut);
        pending = pending.slice(cut);
        break;
      }

      output += pending.slice(0, marker.index);
      output = output.replace(/\s+$/, '');

      const markerEnd = findMarkerEnd(pending, marker);
      if (markerEnd === null) {
        // Keep the partial marker until the next chunk arrives.
        pending = pending.slice(marker.index);
        break;
      }

      pending = pending.slice(markerEnd);
    }

    // Whitespace directly before a stripped marker is dropped, not emitted.
    const cleaned = output.replace(/\s+$/, '');
    if (cleaned) emit(cleaned);
  };

  return {
    push(chunk: string) {
      pending += chunk;
      drain();
    },
    flush() {
      // An unclosed marker means the model never finished it; never leak it.
      const marker = findNextMarker(pending);
      const textBeforeMarker = marker ? pending.slice(0, marker.index) : pending;
      const cleaned = textBeforeMarker.replace(/\s+$/, '');
      if (cleaned) emit(cleaned);
      pending = '';
    },
  };
}
