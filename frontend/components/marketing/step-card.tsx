export function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <li className="flex flex-col border-t-2 border-foreground pt-6 md:pr-10">
      <span aria-hidden className="font-mono text-5xl leading-none tracking-tighter text-foreground/25">
        {String(step).padStart(2, "0")}
      </span>
      <h3 className="mt-8 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>
    </li>
  );
}
