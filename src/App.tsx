import { useEffect, useState } from 'react';
import { loadDB } from './lib/data';
import { applySystemBars, initBackButton } from './lib/native';
import { initUpdateChecks } from './lib/update';
import { useRoute } from './lib/router';
import { dueIds, useProgress } from './lib/store';
import { cls } from './lib/util';
import { ToastHost } from './components/ui';
import { Home } from './screens/Home';
import { PathScreen } from './screens/PathScreen';
import { LessonScreen } from './screens/Lesson';
import { ReviewScreen } from './screens/Review';
import { PracticeHub } from './screens/PracticeHub';
import { PracticeRouter } from './screens/practice/PracticeRouter';
import { Browse } from './screens/Browse';
import { Detail } from './screens/Detail';
import { Stats } from './screens/Stats';
import { SettingsScreen } from './screens/Settings';
import { About } from './screens/About';
import { StoryList, StoryReader } from './screens/practice/Stories';
import { ExamList, ExamScreen } from './screens/practice/Exam';

const TABS: [string, string, string][] = [
  ['', '🏠', 'Beranda'],
  ['path', '🗺️', 'Belajar'],
  ['practice', '🎯', 'Latihan'],
  ['browse', '🔍', 'Kamus'],
  ['stats', '👤', 'Profil'],
];

function useTheme() {
  const theme = useProgress().settings.theme;
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      applySystemBars(dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const route = useRoute();
  const p = useProgress();
  useTheme();

  useEffect(() => {
    initBackButton();
    initUpdateChecks();
    loadDB()
      .then(() => setReady(true))
      .catch((e) => setErr(String(e)));
  }, []);

  if (err)
    return (
      <div className="splash">
        <div className="logo">⚠️</div>
        <div>Gagal memuat data: {err}</div>
      </div>
    );
  if (!ready)
    return (
      <div className="splash">
        <div className="logo">🌸</div>
        <div className="muted">Memuat…</div>
      </div>
    );

  const [r0, r1] = route.parts;
  const tab = r0 ?? '';
  const isTab = TABS.some(([t]) => t === tab) && route.parts.length <= 1;
  let screen;
  switch (r0) {
    case undefined:
      screen = <Home />;
      break;
    case 'path':
      screen = <PathScreen open={route.q.get('s') ?? undefined} />;
      break;
    case 'lesson':
      screen = <LessonScreen key={r1} id={r1} />;
      break;
    case 'review':
      screen = <ReviewScreen key={route.raw} />;
      break;
    case 'practice':
      screen = <PracticeHub />;
      break;
    case 'p':
      screen = <PracticeRouter key={route.raw} method={r1} q={route.q} />;
      break;
    case 'stories':
      screen = <StoryList tab={route.q.get('t') === 'panjang' ? 'panjang' : 'pendek'} />;
      break;
    case 'story':
      screen = <StoryReader key={r1} id={r1} />;
      break;
    case 'exams':
      screen = <ExamList />;
      break;
    case 'exam':
      screen = <ExamScreen key={route.raw} scope={r1} lesson={route.q.get('l') ?? undefined} />;
      break;
    case 'browse':
      screen = <Browse q={route.q} />;
      break;
    case 'item':
      screen = <Detail key={r1} id={r1} />;
      break;
    case 'stats':
      screen = <Stats />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'about':
      screen = <About />;
      break;
    default:
      screen = <Home />;
  }
  const due = dueIds(p).length;

  return (
    <div className={cls('app', isTab && 'has-nav')}>
      {screen}
      {isTab && (
        <nav className="nav">
          <div className="nav-inner">
            {TABS.map(([t, ic, label]) => (
              <a key={t} href={`#/${t}`} className={cls(tab === t && 'on')}>
                <span className="ic">{ic}</span>
                {label}
                {t === '' && due > 0 && tab !== '' ? ' •' : ''}
              </a>
            ))}
          </div>
        </nav>
      )}
      <ToastHost />
    </div>
  );
}
