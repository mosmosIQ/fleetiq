interface Props { columns: string[]; rows: Array<Array<string | number>>; }
export default function DataTable({ columns, rows }: Props) {
  return (
    <div className="card">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{columns.map(c => <th key={c} style={{ textAlign: "left", padding: 10 }}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: 10, borderTop: "1px solid #eef2f7" }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
