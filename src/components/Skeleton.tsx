// Shimmer placeholders shown while live queries resolve — replaces bare
// "Loading…" text so screens feel instant instead of blank.

export function Skel({ h = 16, w = "100%", r }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skel" style={{ height: h, width: w, borderRadius: r }} />;
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card">
      <Skel h={18} w="45%" />
      <div className="col" style={{ marginTop: 10, gap: 8 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skel key={i} h={13} w={`${88 - i * 14}%`} />
        ))}
      </div>
    </div>
  );
}

export default function ScreenSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="screen">
      {title && (
        <div style={{ marginBottom: 16 }}>
          <Skel h={26} w={140} r={8} />
          <div style={{ marginTop: 8 }}>
            <Skel h={13} w={200} r={6} />
          </div>
        </div>
      )}
      <CardSkeleton lines={3} />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={2} />
    </div>
  );
}
