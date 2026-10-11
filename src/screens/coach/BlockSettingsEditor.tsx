import { Button, Icon, IconButton, NumberField } from '../../design';
import { t } from '../../i18n';
import type { BlockSettings, CustomStep } from '../../types';

interface Props {
  value: BlockSettings;
  onChange: (next: BlockSettings) => void;
}

/** Controlled editor for a block's timer settings. Standard blocks have none. */
export function BlockSettingsEditor({ value, onChange }: Props) {
  switch (value.type) {
    case 'standard':
      return null;
    case 'amrap':
      return (
        <div className="app-target-grid">
          <NumberField label={t('settings.cap')} unit="min" min={1} max={180} value={Math.round(value.capSec / 60)} onChange={(n) => onChange({ ...value, capSec: n * 60 })} />
        </div>
      );
    case 'emom':
      return (
        <div className="app-target-grid">
          <NumberField label={t('settings.totalMin')} unit="min" min={1} max={180} value={value.totalMin} onChange={(n) => onChange({ ...value, totalMin: n })} />
          <NumberField label={t('settings.interval')} unit="s" step={5} min={10} max={600} value={value.intervalSec} onChange={(n) => onChange({ ...value, intervalSec: n })} />
        </div>
      );
    case 'for_time':
      return (
        <div className="app-target-grid">
          <NumberField label={t('settings.rounds')} min={1} max={100} value={value.rounds} onChange={(n) => onChange({ ...value, rounds: n })} />
          <NumberField
            label={t('settings.capOptional')}
            unit="min"
            min={0}
            max={180}
            value={value.capSec ? Math.round(value.capSec / 60) : 0}
            onChange={(n) => {
              const { capSec: _drop, ...rest } = value;
              onChange(n > 0 ? { ...rest, capSec: n * 60 } : rest);
            }}
          />
        </div>
      );
    case 'tabata':
      return (
        <div className="app-target-grid">
          <NumberField label={t('settings.work')} unit="s" step={5} min={5} max={300} value={value.workSec} onChange={(n) => onChange({ ...value, workSec: n })} />
          <NumberField label={t('settings.rest')} unit="s" step={5} min={0} max={300} value={value.restSec} onChange={(n) => onChange({ ...value, restSec: n })} />
          <NumberField label={t('settings.rounds')} min={1} max={50} value={value.rounds} onChange={(n) => onChange({ ...value, rounds: n })} />
        </div>
      );
    case 'custom':
      return <StepsEditor steps={value.steps} onChange={(steps) => onChange({ ...value, steps })} />;
  }
}

function StepsEditor({ steps, onChange }: { steps: CustomStep[]; onChange: (s: CustomStep[]) => void }) {
  const patch = (i: number, p: Partial<CustomStep>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (i: number, by: number) => {
    const next = [...steps];
    const [item] = next.splice(i, 1);
    if (item) next.splice(i + by, 0, item);
    onChange(next);
  };
  return (
    <div className="v-bset">
      {steps.length === 0 && <p className="t-body v-muted">{t('settings.steps.empty')}</p>}
      <ol className="v-steps">
        {steps.map((s, i) => (
          <li key={i} className="v-step-row app-step">
            <span className="v-grip" aria-hidden="true">
              <Icon name="grip" size={22} />
            </span>
            <input className="v-mini t-input app-step-label" value={s.label} aria-label={t('settings.step.label', { n: i + 1 })} onChange={(e) => patch(i, { label: e.target.value })} />
            <select className="v-mini t-input" value={s.kind} aria-label={t('settings.step.kind', { n: i + 1 })} onChange={(e) => patch(i, { kind: e.target.value as CustomStep['kind'] })}>
              <option value="work">{t('builder.step.work')}</option>
              <option value="rest">{t('builder.step.rest')}</option>
            </select>
            <input
              className="v-mini t-input narrow"
              inputMode="numeric"
              value={s.durationSec}
              aria-label={t('settings.step.seconds', { n: i + 1 })}
              onChange={(e) => patch(i, { durationSec: Math.max(1, parseInt(e.target.value, 10) || 0) })}
            />
            <span className="t-chip v-muted">s</span>
            <IconButton icon="arrow-up" label={t('common.moveUp')} size={18} disabled={i === 0} onClick={() => move(i, -1)} />
            <IconButton icon="arrow-down" label={t('common.moveDown')} size={18} disabled={i === steps.length - 1} onClick={() => move(i, 1)} />
            <IconButton icon="close" label={t('settings.step.remove', { n: i + 1 })} size={18} onClick={() => onChange(steps.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ol>
      <Button size="sm" variant="secondary" icon="plus" onClick={() => onChange([...steps, { label: t('builder.step.work'), kind: 'work', durationSec: 30 }])}>
        {t('settings.step.add')}
      </Button>
    </div>
  );
}
