export default function StatusBadge({ status }: { status: string }) {
  return <span style={{ padding: "4px 10px", borderRadius: 999, background: "#e0f2fe", color: "#075985", fontWeight: 700 }}>{status}</span>;
}
