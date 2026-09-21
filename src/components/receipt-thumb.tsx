export function ReceiptThumb({ url }: { url: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="ml-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <img src={url} alt="" className="h-6 w-6 rounded object-cover" />
      Foto
    </a>
  );
}
