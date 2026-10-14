import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { getState } from './store';

const native = Capacitor.isNativePlatform();

export function buzz(kind: 'ok' | 'ng' | 'tap') {
  if (!getState().settings.haptics) return;
  try {
    if (native) {
      if (kind === 'ng') void Haptics.notification({ type: NotificationType.Error });
      else if (kind === 'ok') void Haptics.impact({ style: ImpactStyle.Light });
      else void Haptics.selectionChanged();
    } else if (kind === 'ng' && 'vibrate' in navigator) navigator.vibrate(120);
  } catch {
    /* abaikan */
  }
}

/** Tombol kembali Android: mundur di riwayat, keluar bila di beranda. */
export function initBackButton() {
  if (!native) return;
  void App.addListener('backButton', () => {
    const h = location.hash.replace(/^#\/?/, '');
    if (!h) void App.exitApp();
    else history.back();
  });
}

export function applySystemBars(dark: boolean) {
  if (!native) return;
  try {
    void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  } catch {
    /* abaikan */
  }
}

/** Bagikan teks (cadangan) lewat menu share Android, atau salin ke clipboard. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (native) {
      await Share.share({ title, text, dialogTitle: title });
      return 'shared';
    }
  } catch {
    /* lanjut ke clipboard */
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
