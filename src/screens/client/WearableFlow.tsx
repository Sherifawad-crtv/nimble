import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMe } from '../../app/auth';
import { useToast } from '../../app/Toast';
import { Page } from '../../components/Page';
import { BRAND, capabilityLabel } from '../../components/WearableBlocks';
import { Button, CapabilityList, Checkbox, EmptyState, ListRow, Stepper } from '../../design';
import { errorMessage, useAction } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { writePref, wearablePromptKey } from '../../lib/prefs';
import type { WearableConnection, WearableProvider } from '../../types';

const PROVIDERS: WearableProvider[] = ['garmin', 'whoop', 'oura', 'fitbit', 'polar', 'strava'];
type Step = 'ask' | 'brand' | 'consent' | 'done';

/** Sign-up question and connect flow: ask, pick a brand, approve sharing, see what will be shared. */
export function WearableFlow() {
  const me = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const first = params.get('first') === '1';
  const [step, setStep] = useState<Step>(first ? 'ask' : 'brand');
  const [provider, setProvider] = useState<WearableProvider>();
  const [agreed, setAgreed] = useState(false);
  const [connection, setConnection] = useState<WearableConnection>();
  const connect = useAction((s, p: WearableProvider) => s.connectWearable(p), { invalidate: [keys.wearable(me.id), keys.readiness(me.id)] });

  const finish = () => {
    writePref(wearablePromptKey(me.id), '1');
    navigate(first ? '/app/today' : '/app/settings', { replace: true });
  };
  const skip = finish;

  const approve = async () => {
    if (!provider) return;
    try {
      setConnection(await connect.run(provider));
      setStep('done');
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const brand = provider ? BRAND[provider] : '';
  const current = step === 'brand' ? 0 : step === 'consent' ? 1 : 2;

  return (
    <Page title={t('wearable.flow.title')} back={first ? undefined : '/app/settings'}>
      <div className="app-stack">
        {step !== 'ask' && <Stepper steps={[t('wearable.step.brand'), t('wearable.step.sharing'), t('wearable.step.done')]} current={current} />}

        {step === 'ask' && (
          <div className="app-stack">
            <h2 className="t-title app-title">{t('wearable.ask.title')}</h2>
            <p className="t-body v-muted">{t('wearable.ask.body')}</p>
            <Button fullWidth size="lg" onClick={() => setStep('brand')}>
              {t('wearable.ask.yes')}
            </Button>
            <Button fullWidth size="md" variant="secondary" onClick={skip}>
              {t('wearable.ask.skip')}
            </Button>
            <p className="t-caption v-muted">{t('wearable.ask.later')}</p>
          </div>
        )}

        {step === 'brand' && (
          <>
            <p className="t-body v-muted">{t('wearable.brand.body')}</p>
            <ul className="app-list">
              {PROVIDERS.map((p) => (
                <li key={p}>
                  <ListRow
                    title={BRAND[p]}
                    chevron
                    onClick={() => {
                      setProvider(p);
                      setAgreed(false);
                      setStep('consent');
                    }}
                  />
                </li>
              ))}
            </ul>
            <p className="t-caption v-muted">{t('wearable.brand.note')}</p>
            {first && (
              <Button fullWidth variant="tertiary" size="md" onClick={skip}>
                {t('wearable.ask.skip')}
              </Button>
            )}
          </>
        )}

        {step === 'consent' && provider && (
          <div className="app-stack">
            <h2 className="t-heading">{t('wearable.consent.title', { brand })}</h2>
            <p className="t-body">{t('wearable.consent.intro', { brand })}</p>
            <CapabilityList items={[t('wearable.consent.sleep'), t('wearable.consent.hr'), t('wearable.consent.workout'), t('wearable.consent.strain')]} />
            <p className="t-body v-muted">{t('wearable.consent.limits', { brand })}</p>
            <p className="t-body v-muted">{t('wearable.consent.disconnect')}</p>
            <Checkbox label={t('wearable.consent.agree')} checked={agreed} onChange={setAgreed} />
            <Button fullWidth size="lg" disabled={!agreed} loading={connect.isPending} onClick={() => void approve()}>
              {t('wearable.consent.approve')}
            </Button>
            <Button fullWidth size="md" variant="secondary" onClick={() => setStep('brand')}>
              {t('common.back')}
            </Button>
          </div>
        )}

        {step === 'done' && connection && (
          <div className="app-stack">
            <EmptyState icon="check" title={t('wearable.done.title', { brand })} body={t('wearable.done.body')} />
            <h2 className="t-eyebrow app-h2">{t('wearable.done.provides')}</h2>
            <CapabilityList items={connection.capabilities.map(capabilityLabel)} />
            <Button fullWidth size="lg" onClick={finish}>
              {t('common.done')}
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}
