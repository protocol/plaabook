// Deterministic slug from a human label/title. Used by the admin taxonomy
// endpoints (tags, collections) so slugs match the seeded controlled-vocabulary
// style: lowercase, ASCII, hyphen-separated, no leading/trailing/repeated hyphens.
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/&/g, ' and ') // keep the conjunction rather than dropping it
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics → single hyphen
    .replace(/^-+|-+$/g, ''); // trim edge hyphens
}
