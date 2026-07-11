/**
 * XML-escape any user-derived string before embedding it in SVG. This is a
 * hard invariant: names, bios, repo descriptions, and AI summaries all pass
 * through here. Never interpolate upstream strings into markup without it.
 */
export function escapeXml(input: string): string {
  return input.replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return ch;
    }
  });
}
