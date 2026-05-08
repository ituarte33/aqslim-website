// Portal typography tokens — change values here to retheme the entire portal.
// All sizes are in px (used as React inline style numbers).
export const pt = {
  xs:   14,   // section dividers, legend labels, table column headers
  sm:   16,   // form labels, captions, button text, nav labels
  base: 18,   // primary body text, inputs, symptom rows, table cells
  md:   20,   // notes content, emphasized secondary text
  lg:   22,   // logo wordmark, stat card values
  h1:   36,   // page titles  (Playfair Display)
  hero: 42,   // patient name / large hero headings (Playfair Display)

  serif: "'Playfair Display', serif",
  sans:  'Montserrat, sans-serif',
} as const
