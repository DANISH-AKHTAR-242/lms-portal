export default function VideoPlayer({ src, title }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-black">
      <video className="h-auto w-full" src={src} controls preload="metadata" title={title} />
    </div>
  );
}
