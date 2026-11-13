import { buildWhatsAppScript } from '../src/scripts/whatsapp/whatsappScript';
import { WHATSAPP_LABELS } from '../src/scripts/whatsapp/labels';
import { getScriptForPlatform, isPlatformSupported } from '../src/scripts';

describe('WhatsApp Script Builder', () => {
  const options = { maxChats: 2, scrollsPerSection: 1 };
  const steps = buildWhatsAppScript(options);

  test('returns the requested capture sequence and scroll counts', () => {
    expect(steps[0]).toMatchObject({ kind: 'launchApp', packageName: 'com.whatsapp' });
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'chat_list_main')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'chat_list_scroll_1')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'profile_info')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'linked_devices')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'contacts_page_1')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'contacts_scroll_1')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'chat_1_initial')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'chat_1_scroll_1')).toBeDefined();
    expect(steps.find((s) => s.kind === 'capture' && s.section === 'chat_2_initial')).toBeDefined();

    const index = (section: string) => steps.findIndex((s) => s.kind === 'capture' && s.section === section);
    expect(index('chat_list_main')).toBeLessThan(index('profile_info'));
    expect(index('profile_info')).toBeLessThan(index('linked_devices'));
    expect(index('linked_devices')).toBeLessThan(index('contacts_page_1'));
    expect(index('contacts_page_1')).toBeLessThan(index('chat_1_initial'));
    expect(index('chat_1_initial')).toBeLessThan(index('chat_2_initial'));
    expect(index('chat_2_initial')).toBeLessThan(index('communities_tab'));
    expect(index('communities_tab')).toBeLessThan(index('calls_tab'));

    const labelDependentSteps = steps.filter((s) => ['waitForText', 'clickByText', 'clickByViewId'].includes(s.kind));
    expect(labelDependentSteps.length).toBeGreaterThan(0);
    labelDependentSteps.forEach((step) => expect(step).toMatchObject({ optional: true, retries: 1 }));
  });

  test('registers WhatsApp in the platform registry', () => {
    expect(isPlatformSupported('whatsapp')).toBe(true);
    expect(getScriptForPlatform('whatsapp', { maxChats: 1, scrollsPerSection: 1 })[0]).toMatchObject({
      kind: 'launchApp',
      packageName: WHATSAPP_LABELS.PACKAGE_NAME,
    });
  });
});
