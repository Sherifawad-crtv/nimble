import { useState } from 'react';
import { useToast } from '../../app/Toast';
import { Sheet } from '../../components/Sheet';
import { Button, DateField, NumberField, Switch, TextField } from '../../design';
import { errorMessage, useAction } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { addDays, todayISO } from '../../lib/date';
import type { Id, Package } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: Id;
  workspaceId: Id;
  /** Editing when present, creating when absent. */
  pkg?: Package;
}

export function PackageSheet({ open, onClose, clientId, workspaceId, pkg }: Props) {
  return (
    <Sheet open={open} title={t(pkg ? 'package.edit' : 'package.new')} onClose={onClose}>
      <PackageForm key={pkg?.id ?? 'new'} onClose={onClose} clientId={clientId} workspaceId={workspaceId} pkg={pkg} />
    </Sheet>
  );
}

function PackageForm({ onClose, clientId, workspaceId, pkg }: Omit<Props, 'open'>) {
  const toast = useToast();
  const [name, setName] = useState(pkg?.name ?? '');
  const [included, setIncluded] = useState(pkg?.sessionsIncluded ?? 10);
  const [used, setUsed] = useState(pkg?.sessionsUsed ?? 0);
  const [expires, setExpires] = useState(pkg?.expiresOn ?? addDays(todayISO(), 90));
  const [paid, setPaid] = useState(pkg?.paymentReceived ?? false);
  const [error, setError] = useState<string>();
  const save = useAction(
    (s, p: Parameters<typeof s.savePackage>[0]) => s.savePackage(p),
    { invalidate: [keys.packages(clientId), keys.overview] },
  );

  const submit = async () => {
    if (!name.trim()) return setError(t('package.error.name'));
    setError(undefined);
    try {
      await save.run({ ...(pkg && { id: pkg.id }), workspaceId, clientId, name, sessionsIncluded: included, sessionsUsed: used, expiresOn: expires, paymentReceived: paid });
      toast.show(t('package.saved'));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="app-form">
      <TextField label={t('package.name')} required value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder={t('package.name.placeholder')} />
      <NumberField label={t('package.included')} value={included} min={1} max={200} onChange={setIncluded} />
      <NumberField label={t('package.used')} value={used} min={0} max={included} onChange={setUsed} />
      <DateField label={t('package.expires')} value={expires} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpires(e.target.value)} />
      <Switch label={t('package.paid')} description={t('package.paid.hint')} checked={paid} onChange={setPaid} />
      {error && (
        <p className="t-label app-error" role="alert">
          {error}
        </p>
      )}
      <div className="app-form-actions">
        <Button fullWidth size="md" loading={save.isPending} onClick={() => void submit()}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
