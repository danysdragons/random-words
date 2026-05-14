import { useId } from "react";

export function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label id={id}>{label}</label>
      <div className="number-control">
        <input aria-labelledby={id} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <button aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>-</button>
        <button aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}

export function TextFilter({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="field compact">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  variant = "default",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: "default" | "inline";
}) {
  return (
    <label className={variant === "inline" ? "toggle-row inline-toggle" : "toggle-row"}>
      <span>{label}</span>
      <button
        className={checked ? "toggle on" : "toggle"}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </label>
  );
}
