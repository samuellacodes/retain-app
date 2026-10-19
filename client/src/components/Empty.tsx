export default function Empty({ message }: { message: string }) {
  return <div className="empty-state"><span>◌</span><p>{message}</p></div>;
}
