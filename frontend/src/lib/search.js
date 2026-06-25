/**
 * matchesQuery(record, query)
 *
 * Returns true if the record matches the search query across:
 *   full_name / email  — case-insensitive substring
 *   phone              — digit-only substring (strips formatting from both sides)
 *   date_of_birth      — flexible digit matching across YYYYMMDD, DDMMYYYY, MMDDYYYY variants
 *
 * An empty / whitespace-only query always returns true.
 */
export function matchesQuery(record, query) {
  const q = query.trim();
  if (!q) return true;

  const qLower   = q.toLowerCase();
  const qDigits  = q.replace(/\D/g, '');

  // full_name — case-insensitive substring
  if ((record.full_name ?? '').toLowerCase().includes(qLower)) return true;

  // email — case-insensitive substring
  if ((record.email ?? '').toLowerCase().includes(qLower)) return true;

  // phone — strip formatting, then digit substring
  if (qDigits.length > 0) {
    const phoneDigits = (record.phone ?? '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.includes(qDigits)) return true;
  }

  // date_of_birth — flexible digit matching
  // Stored as 'YYYY-MM-DD'; we generate several zero-padded forms and test substring
  if (qDigits.length > 0 && record.date_of_birth) {
    const parts = record.date_of_birth.split('-');
    if (parts.length === 3) {
      const yyyy = parts[0].padStart(4, '0');
      const mm   = parts[1].padStart(2, '0');
      const dd   = parts[2].padStart(2, '0');
      const variants = [
        yyyy + mm + dd,  // 19991213
        dd + mm + yyyy,  // 13121999
        mm + dd + yyyy,  // 12131999
        yyyy,            // 1999  (year-only search)
        mm,              // 12    (month-only search)
        dd,              // 13    (day-only search)
      ];
      if (variants.some((v) => v.includes(qDigits))) return true;
    }
  }

  return false;
}
