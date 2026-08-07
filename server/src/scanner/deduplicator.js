/**
 * Deduplicates findings based on filePath, lineNumber, and type/source.
 * Sorts by baseSeverity descending and caps results to top 30.
 */
function deduplicateAndCapFindings(rawFindings) {
  const seenMap = new Map();

  for (const finding of rawFindings) {
    // Generate unique key for file + line + category
    const key = `${finding.filePath}:${finding.lineNumber}:${finding.type}`;

    if (!seenMap.has(key)) {
      seenMap.set(key, finding);
    } else {
      const existing = seenMap.get(key);
      // Keep finding with higher baseSeverity or append evidence
      if (finding.baseSeverity > existing.baseSeverity) {
        finding.evidence = `${finding.evidence} (Merged from ${existing.source})`;
        seenMap.set(key, finding);
      } else {
        existing.evidence = `${existing.evidence} (Merged from ${finding.source})`;
      }
    }
  }

  const uniqueFindings = Array.from(seenMap.values());

  // Sort by baseSeverity descending
  uniqueFindings.sort((a, b) => b.baseSeverity - a.baseSeverity);

  // Cap top 30 findings per accuracy safeguard requirements
  return uniqueFindings.slice(0, 30);
}

module.exports = { deduplicateAndCapFindings };
