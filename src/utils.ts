import * as path from 'path';

/**
 * Resolve a user-supplied relative path against a vault root, ensuring
 * the result stays within the vault boundary.  Throws on traversal.
 */
export function getSafeFilePath(vaultPath: string, userInputPath: string): string {
  const resolvedVault = path.resolve(vaultPath);
  const resolvedTarget = path.resolve(resolvedVault, userInputPath);
  if (!resolvedTarget.startsWith(resolvedVault + path.sep) && resolvedTarget !== resolvedVault) {
    throw new Error("Security Error: Path traversal detected.");
  }
  return resolvedTarget;
}

/**
 * Extract deduplicated wikilink targets from markdown content.
 * Handles [[Simple]] and [[Link|Alias]] forms.
 */
export function extractWikilinks(content: string): string[] {
  const regex = /\[\[(.*?)(?:\|.*?)?\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

export interface SectionRange {
  headingStart: number;
  headingEnd: number;
  bodyStart: number;
  bodyEnd: number;
  level: number;
}

/**
 * Find the range of a section under a heading in markdown content.
 * Returns null if heading not found.
 */
export function findSectionRange(content: string, heading: string): SectionRange | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingRegex = new RegExp(`^(#{1,6})\\s+${escapedHeading}\\s*$`, 'm');
  const match = headingRegex.exec(content);
  if (!match) return null;

  const level = match[1].length;
  const headingStart = match.index;
  const headingEnd = headingStart + match[0].length;
  const bodyStart = headingEnd;

  // Find next heading at same or higher level (fewer or equal #'s)
  const rest = content.slice(bodyStart);
  const nextHeadingRegex = new RegExp(`^#{1,${level}}\\s`, 'm');
  const nextMatch = nextHeadingRegex.exec(rest);
  const bodyEnd = nextMatch ? bodyStart + nextMatch.index : content.length;

  return { headingStart, headingEnd, bodyStart, bodyEnd, level };
}

/**
 * Replace the body under a heading, preserving the heading line itself.
 * Returns the updated file content.
 */
export function replaceSection(fileContent: string, range: SectionRange, newBody: string): string {
  return fileContent.slice(0, range.bodyStart) + '\n' + newBody + '\n' + fileContent.slice(range.bodyEnd);
}

/**
 * Insert content under a heading at the given position.
 * If range is null (heading not found), appends a new ## section.
 * Returns the updated file content.
 */
export function insertAtHeading(
  fileContent: string,
  heading: string,
  content: string,
  position: 'beginning' | 'end',
  range: SectionRange | null,
): string {
  if (range) {
    if (position === 'beginning') {
      return fileContent.slice(0, range.bodyStart) + '\n' + content + fileContent.slice(range.bodyStart);
    }
    const before = fileContent.slice(0, range.bodyEnd);
    const sep = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    return before + sep + content + '\n' + fileContent.slice(range.bodyEnd);
  }
  return fileContent + `\n\n## ${heading}\n${content}`;
}
