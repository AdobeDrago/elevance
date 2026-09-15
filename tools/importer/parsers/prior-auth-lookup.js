/* eslint-disable */
/* global WebImporter */
/**
 * Parser for prior-auth-lookup. Base block: prior-auth-lookup (custom).
 * Source: https://provider.healthybluenc.com/north-carolina-provider/prior-authorization-lookup
 *
 * The source is a live Angular lookup widget — its interactive markup is not
 * authorable content. We emit the block with its config rows (key | value) so
 * the block's decorate() renders the lookup UI; the author later points the
 * "Data Source" row at a published PA-code JSON. Market/LOB options are seeded
 * from the source's known values.
 */
export default function parse(element, { document }) {
  const cells = [
    ['Data Source', ''],
    ['Markets', 'North Carolina'],
    ['North Carolina', 'Medicaid, CFSP — Healthy Blue Care Together'],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'prior-auth-lookup', cells });
  element.replaceWith(block);
}
