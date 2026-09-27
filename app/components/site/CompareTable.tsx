import type { ReactNode } from "react";

export interface CompareRow {
  label: string;
  raspy: ReactNode;
  other: ReactNode;
}

/** The side-by-side table every comparison page opens with. */
export function CompareTable({
  competitor,
  rows,
}: {
  competitor: string;
  rows: CompareRow[];
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Raspy</th>
            <th scope="col">{competitor}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="font-medium">
                {row.label}
              </th>
              <td>{row.raspy}</td>
              <td>{row.other}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sources({
  checked,
  items,
}: {
  checked: string;
  items: { label: string; href: string }[];
}) {
  return (
    <>
      <h2>Sources</h2>
      <p>
        Claims about the other product were checked against the pages below
        on {checked}. Products change; if something here is out of date, the
        source is the place to confirm it.
      </p>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} rel="nofollow noopener">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
