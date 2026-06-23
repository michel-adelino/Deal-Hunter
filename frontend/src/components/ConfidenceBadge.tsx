import { DealConfidence } from '../types';
import { CONFIDENCE_CONFIG } from '../lib/confidence';

interface Props {
  confidence: DealConfidence;
}

export function ConfidenceBadge({ confidence }: Props) {
  const config = CONFIDENCE_CONFIG[confidence];
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}
      title={config.tooltip}
    >
      {config.label}
    </span>
  );
}
