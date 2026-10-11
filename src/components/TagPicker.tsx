import { useState } from 'react';
import { Chip } from '../design';
import { t } from '../i18n';

interface Props {
  label: string;
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  /** Allows typing a custom tag. */
  custom?: boolean;
}

/** Chips for picking from known tags, plus an optional custom one. Controlled. */
export function TagPicker({ label, value, options, onChange, custom }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const all = [...new Set([...options, ...value])];
  const toggle = (tag: string) => onChange(value.includes(tag) ? value.filter((x) => x !== tag) : [...value, tag]);
  const commit = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
    setAdding(false);
  };

  return (
    <fieldset className="app-tagpicker">
      <legend className="v-label t-label">{label}</legend>
      <div className="app-chips">
        {all.map((tag) => (
          <Chip key={tag} label={tag} selected={value.includes(tag)} onClick={() => toggle(tag)} />
        ))}
        {custom && !adding && <Chip add label={t('tags.addCustom')} onClick={() => setAdding(true)} />}
      </div>
      {adding && (
        <div className="app-tagpicker-add">
          <span className="v-input">
            <input
              className="t-input"
              value={draft}
              autoFocus
              aria-label={t('tags.customLabel')}
              placeholder={t('tags.customPlaceholder')}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
              }}
            />
          </span>
          <button type="button" className="app-textbtn t-body-strong" onClick={commit}>
            {t('common.add')}
          </button>
        </div>
      )}
    </fieldset>
  );
}
