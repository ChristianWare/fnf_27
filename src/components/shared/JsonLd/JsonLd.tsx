// Structured data for search engines and AI search: a <script> with the
// page's schema.org JSON. The builders are in lib/seo.ts.

export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type='application/ld+json'
      // "<" is escaped so text in the data can never close the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
