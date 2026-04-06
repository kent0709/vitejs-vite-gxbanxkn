import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  Sparkles,
  Play,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Library,
  GraduationCap,
  Loader2,
  RotateCcw,
  Type,
  Puzzle,
  Shuffle,
  Layers,
  RefreshCw,
} from 'lucide-react';

// ==========================================
// 韓文基礎發音資料 (加入意象化記憶法)
// ==========================================
const HANGUL_BASIC = {
  consonants: [
    {
      ko: 'ㄱ',
      pro: 'g/k',
      tts: '가',
      hook: '象形：舌根頂住軟顎。聯想：槍(Gun)。',
    },
    {
      ko: 'ㄴ',
      pro: 'n',
      tts: '나',
      hook: '象形：舌尖頂住上齒齦。聯想：鼻子(Nose)。',
    },
    {
      ko: 'ㄷ',
      pro: 'd/t',
      tts: '다',
      hook: '象形：ㄴ加一橫。聯想：門(Door)。',
    },
    {
      ko: 'ㄹ',
      pro: 'r/l',
      tts: '라',
      hook: '象形：舌頭彈動。聯想：蛇(Reptile)爬行。',
    },
    {
      ko: 'ㅁ',
      pro: 'm',
      tts: '마',
      hook: '象形：雙唇。聯想：嘴巴(Mouth)的方形。',
    },
    {
      ko: 'ㅂ',
      pro: 'b/p',
      tts: '바',
      hook: '象形：ㅁ加兩豎。聯想：水桶(Bucket)。',
    },
    {
      ko: 'ㅅ',
      pro: 's',
      tts: '사',
      hook: '象形：牙齒。聯想：站立(Stand)的雙腿。',
    },
    {
      ko: 'ㅇ',
      pro: 'ng',
      tts: '아',
      hook: '象形：喉嚨圓形。字首不發音，字尾發ng。',
    },
    {
      ko: 'ㅈ',
      pro: 'j/ch',
      tts: '자',
      hook: '在ㅅ加一橫。聯想：果汁(Juice)杯插吸管。',
    },
    {
      ko: 'ㅊ',
      pro: "ch'",
      tts: '차',
      hook: '激音：ㅈ加一點。聯想：火車(Choo-choo)。',
    },
    {
      ko: 'ㅋ',
      pro: "k'",
      tts: '카',
      hook: '激音：ㄱ加一橫。聯想：鑰匙(Key)。',
    },
    {
      ko: 'ㅌ',
      pro: "t'",
      tts: '타',
      hook: '激音：ㄷ加一橫。聯想：英文字母E，發T音。',
    },
    {
      ko: 'ㅍ',
      pro: "p'",
      tts: '파',
      hook: '激音：ㅂ變形。聯想：神廟羅馬柱(Pillar)。',
    },
    {
      ko: 'ㅎ',
      pro: 'h',
      tts: '하',
      hook: '象形：喉嚨帶氣流。聯想：戴帽子的人頭(Head)。',
    },
  ],
  vowels: [
    {
      ko: 'ㅏ',
      pro: 'a',
      name: '아',
      hook: '人(|)在地上，太陽(.)東方升起。明亮音 a。',
    },
    {
      ko: 'ㅑ',
      pro: 'ya',
      name: '야',
      hook: '兩個太陽(短橫)，發音前加上 y 變 ya。',
    },
    {
      ko: 'ㅓ',
      pro: 'eo',
      name: '어',
      hook: '人(|)，太陽西方落下。陰暗音 eo(像ㄜ)。',
    },
    { ko: 'ㅕ', pro: 'yeo', name: '여', hook: '兩個太陽，加上 y 變 yeo。' },
    { ko: 'ㅗ', pro: 'o', name: '오', hook: '大地(-)，太陽在上面。明亮音 o。' },
    { ko: 'ㅛ', pro: 'yo', name: '요', hook: '兩個太陽，加上 y 變 yo。' },
    {
      ko: 'ㅜ',
      pro: 'u',
      name: '우',
      hook: '大地(-)，太陽在下面。陰暗音 u(像嗚)。',
    },
    { ko: 'ㅠ', pro: 'yu', name: '유', hook: '兩個太陽，加上 y 變 yu。' },
    {
      ko: 'ㅡ',
      pro: 'eu',
      name: '으',
      hook: '象形：平坦大地。嘴扁平向側拉開發 eu。',
    },
    { ko: 'ㅣ', pro: 'i', name: '이', hook: '象形：直立的人。發 i(像伊)。' },
  ],
};

// ==========================================
// 韓文字母組合機邏輯 (Unicode 計算)
// ==========================================
const CHOSUNG_MAP = {
  ㄱ: 0,
  ㄲ: 1,
  ㄴ: 2,
  ㄷ: 3,
  ㄸ: 4,
  ㄹ: 5,
  ㅁ: 6,
  ㅂ: 7,
  ㅃ: 8,
  ㅅ: 9,
  ㅆ: 10,
  ㅇ: 11,
  ㅈ: 12,
  ㅉ: 13,
  ㅊ: 14,
  ㅋ: 15,
  ㅌ: 16,
  ㅍ: 17,
  ㅎ: 18,
};
const JUNGSUNG_MAP = {
  ㅏ: 0,
  ㅐ: 1,
  ㅑ: 2,
  ㅒ: 3,
  ㅓ: 4,
  ㅔ: 5,
  ㅕ: 6,
  ㅖ: 7,
  ㅗ: 8,
  ㅘ: 9,
  ㅙ: 10,
  ㅚ: 11,
  ㅛ: 12,
  ㅜ: 13,
  ㅝ: 14,
  ㅞ: 15,
  ㅟ: 16,
  ㅠ: 17,
  ㅡ: 18,
  ㅢ: 19,
  ㅣ: 20,
};

const combineHangul = (c, v) => {
  if (!c || !v) return '';
  const cIdx = CHOSUNG_MAP[c];
  const vIdx = JUNGSUNG_MAP[v];
  return String.fromCharCode(44032 + cIdx * 588 + vIdx * 28);
};

const generateAllCombos = () => {
  let combos = [];
  HANGUL_BASIC.consonants.forEach((c) => {
    HANGUL_BASIC.vowels.forEach((v) => {
      combos.push({
        ko: combineHangul(c.ko, v.ko),
        pro: c.pro.split('/')[0] + v.pro,
        c: c,
        v: v,
      });
    });
  });
  return combos;
};

// ==========================================
// 1. Firebase 初始化 (已更新為您的專屬設定)
// ==========================================
let app, auth, db;
const appId = 'korea-card'; // 使用您的 projectId

const firebaseConfig = {
  apiKey: 'AIzaSyDhgjHoqMVQAomoNDmRcThrukfkRhimj6A',
  authDomain: 'korea-card.firebaseapp.com',
  projectId: 'korea-card',
  storageBucket: 'korea-card.firebasestorage.app',
  messagingSenderId: '169548289851',
  appId: '1:169548289851:web:ac1b5d4ca33688655dc91e',
  measurementId: 'G-2167E3Q3P5',
};

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase 初始化跳過:', error);
}

export default function App() {
  // ==========================================
  // 2. 狀態管理
  // ==========================================
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(''); // 新增：負責捕捉並顯示 Firebase 錯誤
  const [view, setView] = useState('alphabet');
  const [activeLetter, setActiveLetter] = useState(null);
  const [words, setWords] = useState([
    {
      ko: '환영하다',
      pro: 'hwanyeonghada',
      zh: '歡迎',
      ex: '킬러 카드에 오신 것을 환영합니다!',
      exZh: '歡迎來到 Killer Cards！',
      memoryHook:
        '漢字詞「歡迎(환영)」。可以聯想成：換(hwan)個心情來迎接(yeong)美好的事物。',
      imagePrompt:
        'A warm and welcoming party with balloons and confetti, aesthetic illustration',
    },
  ]);
  const [savedWords, setSavedWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [topic, setTopic] = useState('職場常用語');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [alphabetMode, setAlphabetMode] = useState('flashcards');
  const [selectedC, setSelectedC] = useState(HANGUL_BASIC.consonants[0]);
  const [selectedV, setSelectedV] = useState(HANGUL_BASIC.vowels[0]);

  const [comboCards, setComboCards] = useState([]);
  const [comboIndex, setComboIndex] = useState(0);
  const [comboFlipped, setComboFlipped] = useState(false);

  useEffect(() => {
    setComboCards(generateAllCombos());
  }, []);

  // ==========================================
  // 3. 雲端連線 (Firebase)
  // ==========================================
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        setAuthError('');
        // 因為您使用的是自己的 Firebase 專案，所以必須強制使用匿名登入
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Firebase 登入失敗:', err);
        // 精準捕捉「未開啟匿名登入」的權限錯誤，轉換成好懂的 UI 提示
        if (
          err.code === 'auth/admin-restricted-operation' ||
          err.code === 'auth/operation-not-allowed'
        ) {
          setAuthError(
            '⚠️ 儲存功能已暫停：請至您的 Firebase Console > Authentication > Sign-in method，啟用「匿名登入 (Anonymous)」！'
          );
        } else {
          setAuthError('Firebase 連線錯誤：' + err.message);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const wordsRef = collection(
      db,
      'artifacts',
      appId,
      'users',
      user.uid,
      'saved_korean_words'
    );
    const unsubscribe = onSnapshot(wordsRef, (snapshot) => {
      const saved = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSavedWords(saved);
    });
    return () => unsubscribe();
  }, [user]);

  // ==========================================
  // 4. AI 生成功能
  // ==========================================
  const generateWords = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const promptText = `你是一位專業的韓文教師。請根據主題「${topic}」生成 5 個實用的韓文單字或短語。
    請嚴格以 JSON 陣列格式回傳。每個物件必須包含：
    - ko: 韓文單字或短語
    - pro: 羅馬拼音
    - zh: 繁體中文意思
    - ex: 韓文例句
    - exZh: 繁體中文翻譯
    - memoryHook: 字根拆解或意象化聯想(幫助邏輯記憶)
    - imagePrompt: 一段簡短的英文畫面描述`;

    try {
      // 🛡️ 資安升級：改為呼叫我們自己的 Vercel 後端 API，不再前端暴露金鑰
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) throw new Error('API 請求失敗');
      const data = await response.json();

      // Vercel API 會幫我們把 Google 的回應原封不動傳回來
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      const newWords = JSON.parse(textContent);
      setWords(newWords);
      setCurrentIndex(0);
      setIsFlipped(false);
      setView('learn');
    } catch (err) {
      setErrorMsg('生成失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 5. 互動功能 (語音與翻卡)
  // ==========================================
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((p) => (p + 1) % words.length), 150);
  };
  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(
      () => setCurrentIndex((p) => (p - 1 + words.length) % words.length),
      150
    );
  };

  const nextCombo = () => {
    setComboFlipped(false);
    setTimeout(() => setComboIndex((p) => (p + 1) % comboCards.length), 150);
  };
  const prevCombo = () => {
    setComboFlipped(false);
    setTimeout(
      () =>
        setComboIndex((p) => (p - 1 + comboCards.length) % comboCards.length),
      150
    );
  };
  const shuffleCombos = () => {
    setComboFlipped(false);
    setTimeout(() => {
      const shuffled = [...comboCards].sort(() => Math.random() - 0.5);
      setComboCards(shuffled);
      setComboIndex(0);
    }, 150);
  };
  const resetCombos = () => {
    setComboFlipped(false);
    setTimeout(() => {
      setComboCards(generateAllCombos());
      setComboIndex(0);
    }, 150);
  };

  const toggleSaveWord = async (word, e) => {
    if (e) e.stopPropagation();
    if (!user || !db) {
      // 替代原來的 window.alert，將錯誤顯示在畫面頂端橫幅
      setAuthError(
        '⚠️ 無法儲存：請先在 Firebase Console 中啟用「匿名登入」功能！'
      );
      return;
    }
    const wordId = word.ko;
    const docRef = doc(
      db,
      'artifacts',
      appId,
      'users',
      user.uid,
      'saved_korean_words',
      wordId
    );
    try {
      const isSaved = savedWords.some((w) => w.id === wordId);
      if (isSaved) await deleteDoc(docRef);
      else await setDoc(docRef, { ...word, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('儲存失敗:', err);
    }
  };

  const currentWord = words[currentIndex] || {};
  const isCurrentSaved = savedWords.some((w) => w.id === currentWord.ko);
  const currentCombo = comboCards[comboIndex] || {};

  // ==========================================
  // 6. UI 渲染
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200">
      {/* 頂部導航列放大 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 text-indigo-600 shrink-0 mr-4">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">
              Killer Cards{' '}
              <span className="text-slate-400 text-base font-medium ml-1">
                韓文
              </span>
            </h1>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl shrink-0">
            <button
              onClick={() => setView('learn')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-bold transition-colors ${
                view === 'learn'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-5 h-5" /> 學習區
            </button>
            <button
              onClick={() => setView('alphabet')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-bold transition-colors ${
                view === 'alphabet'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-5 h-5" /> 基礎發音
            </button>
            <button
              onClick={() => setView('vault')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-bold transition-colors ${
                view === 'vault'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Library className="w-5 h-5" /> 單字庫
              {savedWords.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-sm">
                  {savedWords.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 內容區：增加底部 pb-20 避開 iPhone Home Indicator */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* 🚨 Firebase 權限錯誤提示橫幅 🚨 */}
        {authError && (
          <div className="w-full bg-red-50 text-red-600 p-5 rounded-[1.5rem] border-2 border-red-200 mb-8 font-bold flex flex-col md:flex-row items-center md:items-start gap-4 shadow-sm text-center md:text-left">
            <span className="text-3xl shrink-0">🚨</span>
            <p className="leading-relaxed text-lg">{authError}</p>
          </div>
        )}

        {/* === 學習區 (AI 生成單字卡) === */}
        {view === 'learn' && (
          <div className="flex flex-col items-center">
            {/* AI 生成框放大 */}
            <div className="w-full max-w-lg bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 mb-8 flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="輸入想學的主題 (如：咖啡廳點餐)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && generateWords()}
              />
              <button
                onClick={generateWords}
                disabled={loading}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
                {loading ? '生成中...' : 'AI 生成'}
              </button>
            </div>
            {errorMsg && (
              <p className="text-red-500 text-lg font-medium mb-4">
                {errorMsg}
              </p>
            )}

            {/* 超大 AI 單字卡 */}
            {words.length > 0 && (
              <div className="w-full max-w-lg perspective-1000">
                <div
                  className="relative w-full h-[75vh] max-h-[45rem] min-h-[36rem] transition-transform duration-500 ease-out cursor-pointer"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* 正面 */}
                  <div
                    className="absolute inset-0 bg-white shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border-2 border-slate-100"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="relative w-full h-[35%] min-h-[16rem] bg-slate-100 shrink-0">
                      {currentWord.imagePrompt && (
                        <img
                          src={`https://image.pollinations.ai/prompt/${encodeURIComponent(
                            currentWord.imagePrompt
                          )}?width=800&height=600&nologo=true`}
                          alt="AI generated"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                      <span className="absolute top-6 left-6 text-white font-bold tracking-widest text-lg uppercase drop-shadow-md">
                        {currentIndex + 1} / {words.length}
                      </span>
                      <button
                        onClick={(e) => toggleSaveWord(currentWord, e)}
                        className="absolute top-6 right-6 text-white hover:text-amber-400 transition-colors z-10 p-3 drop-shadow-md"
                      >
                        {isCurrentSaved ? (
                          <BookmarkCheck className="w-8 h-8 text-amber-400 fill-amber-400" />
                        ) : (
                          <Bookmark className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                      <h2 className="text-[5rem] md:text-[6rem] font-black text-slate-800 mb-4 tracking-tighter text-center leading-tight break-words w-full">
                        {currentWord.ko}
                      </h2>
                      <p className="text-slate-500 font-mono text-3xl mb-8 bg-slate-100 px-6 py-2 rounded-full font-bold">
                        {currentWord.pro}
                      </p>

                      <button
                        onClick={(e) => speak(currentWord.ko, e)}
                        className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 hover:scale-105 transition-all active:scale-95 group shrink-0 shadow-sm"
                      >
                        <Play className="w-10 h-10 fill-current translate-x-1 group-hover:text-indigo-700" />
                      </button>
                      <p className="absolute bottom-6 text-slate-400 text-lg font-medium flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" /> 點擊卡片翻面
                      </p>
                    </div>
                  </div>

                  {/* 背面 */}
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-800 shadow-2xl rounded-[2.5rem] flex flex-col p-10 text-white overflow-y-auto"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex flex-col mb-8 border-b border-white/20 pb-6">
                        <div className="flex flex-wrap items-end gap-3 mb-3">
                          <h3 className="text-5xl font-bold text-white leading-tight">
                            {currentWord.ko}
                          </h3>
                          <p className="text-indigo-200 text-2xl font-mono mb-1">
                            {currentWord.pro}
                          </p>
                        </div>
                        <h4 className="text-4xl font-bold text-amber-300 drop-shadow-sm">
                          {currentWord.zh}
                        </h4>
                      </div>

                      {currentWord.memoryHook && (
                        <div className="bg-white/10 rounded-2xl p-6 mb-8 border border-white/20 shadow-inner">
                          <p className="text-base text-indigo-200 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                            💡 意象化拆解
                          </p>
                          <p className="text-xl leading-relaxed font-medium">
                            {currentWord.memoryHook}
                          </p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <p className="text-indigo-200 text-base uppercase tracking-wider font-bold">
                          例句
                        </p>
                        <div className="flex items-start gap-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="flex-1">
                            <p className="text-2xl font-bold leading-relaxed mb-2">
                              {currentWord.ex}
                            </p>
                            <p className="text-lg text-indigo-200/90 font-medium">
                              {currentWord.exZh}
                            </p>
                          </div>
                          <button
                            onClick={(e) => speak(currentWord.ex, e)}
                            className="shrink-0 text-indigo-300 hover:text-white transition-colors bg-white/10 p-3 rounded-full"
                          >
                            <Play className="w-6 h-6 fill-current" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-10 px-6">
                  <button
                    onClick={prevCard}
                    className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"
                  >
                    <ChevronLeft className="w-10 h-10" />
                  </button>
                  <p className="text-slate-400 font-bold tracking-widest text-lg">
                    SWIPE / CLICK
                  </p>
                  <button
                    onClick={nextCard}
                    className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"
                  >
                    <ChevronRight className="w-10 h-10" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === 韓文基礎發音區 === */}
        {view === 'alphabet' && (
          <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-black text-slate-800 mb-4">
                韓文字母基礎
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed font-medium">
                先認識核心字母，再利用巨大化的工具進行拼字訓練！
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
              <div>
                <h3 className="text-2xl font-black text-indigo-700 mb-6 flex items-center gap-3 border-b-4 border-indigo-100 pb-3">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-xl text-lg">
                    14個
                  </span>{' '}
                  基本子音{' '}
                  <span className="text-base text-indigo-400 font-medium ml-auto">
                    ※ 搭配「ㅏ(a)」
                  </span>
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {HANGUL_BASIC.consonants.map((item) => (
                    <div
                      key={item.ko}
                      onClick={() => {
                        setActiveLetter(
                          activeLetter === item.ko ? null : item.ko
                        );
                        speak(item.tts);
                      }}
                      className={`relative cursor-pointer h-24 rounded-[1.25rem] border-2 transition-all duration-300 overflow-hidden ${
                        activeLetter === item.ko
                          ? 'border-indigo-500 shadow-lg scale-105'
                          : 'border-slate-200 bg-white hover:border-indigo-400'
                      }`}
                    >
                      <div
                        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity ${
                          activeLetter === item.ko ? 'opacity-0' : 'opacity-100'
                        }`}
                      >
                        <span className="text-4xl font-black text-slate-800">
                          {item.ko}
                        </span>
                      </div>
                      <div
                        className={`absolute inset-0 bg-indigo-600 text-white p-2 flex flex-col justify-center transition-opacity ${
                          activeLetter === item.ko
                            ? 'opacity-100'
                            : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <span className="text-center font-black text-xl mb-1">
                          {item.ko}
                        </span>
                        <p className="text-xs leading-tight opacity-90 text-center font-medium">
                          {item.hook.replace('象形：', '').split('。')[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-amber-600 mb-6 flex items-center gap-3 border-b-4 border-amber-100 pb-3">
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl text-lg">
                    10個
                  </span>{' '}
                  基本母音
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {HANGUL_BASIC.vowels.map((item) => (
                    <div
                      key={item.ko}
                      onClick={() => {
                        setActiveLetter(
                          activeLetter === item.ko ? null : item.ko
                        );
                        speak(item.name);
                      }}
                      className={`relative cursor-pointer h-24 rounded-[1.25rem] border-2 transition-all duration-300 overflow-hidden ${
                        activeLetter === item.ko
                          ? 'border-amber-500 shadow-lg scale-105'
                          : 'border-slate-200 bg-white hover:border-amber-400'
                      }`}
                    >
                      <div
                        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity ${
                          activeLetter === item.ko ? 'opacity-0' : 'opacity-100'
                        }`}
                      >
                        <span className="text-4xl font-black text-slate-800">
                          {item.ko}
                        </span>
                      </div>
                      <div
                        className={`absolute inset-0 bg-amber-500 text-white p-2 flex flex-col justify-center transition-opacity ${
                          activeLetter === item.ko
                            ? 'opacity-100'
                            : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <span className="text-center font-black text-xl mb-1">
                          {item.ko}
                        </span>
                        <p className="text-xs leading-tight opacity-90 text-center font-medium">
                          {item.hook.split('。')[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 🔥 進階訓練區：組合機 vs 綜合字卡測驗 🔥 */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-10">
              <div className="flex bg-slate-100 p-2 rounded-2xl max-w-md mx-auto mb-10">
                <button
                  onClick={() => setAlphabetMode('flashcards')}
                  className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${
                    alphabetMode === 'flashcards'
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers className="w-5 h-5" /> 字卡測驗
                </button>
                <button
                  onClick={() => setAlphabetMode('manual')}
                  className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${
                    alphabetMode === 'manual'
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Puzzle className="w-5 h-5" /> 組合機
                </button>
              </div>

              {/* 模式一：140音字卡測驗 */}
              {alphabetMode === 'flashcards' && (
                <div className="flex flex-col items-center">
                  <div className="flex gap-4 mb-8">
                    <button
                      onClick={shuffleCombos}
                      className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-indigo-100 transition-colors shadow-sm"
                    >
                      <Shuffle className="w-5 h-5" /> 打亂洗牌
                    </button>
                    <button
                      onClick={resetCombos}
                      className="flex items-center gap-2 bg-slate-50 text-slate-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors shadow-sm border border-slate-200"
                    >
                      <RefreshCw className="w-5 h-5" /> 重置
                    </button>
                  </div>

                  <div className="w-full max-w-md perspective-1000 mb-10">
                    <div
                      className="relative w-full h-[28rem] min-h-[400px] transition-transform duration-500 ease-out cursor-pointer"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: comboFlipped
                          ? 'rotateY(180deg)'
                          : 'rotateY(0deg)',
                      }}
                      onClick={() => setComboFlipped(!comboFlipped)}
                    >
                      <div
                        className="absolute inset-0 bg-white shadow-2xl rounded-[3rem] flex flex-col items-center justify-center p-8 border-2 border-indigo-50"
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        <span className="absolute top-6 left-6 text-slate-300 font-bold tracking-widest text-lg">
                          {comboIndex + 1} / {comboCards.length}
                        </span>
                        <h2 className="text-[9rem] leading-none font-black text-slate-800 mb-6 drop-shadow-md">
                          {currentCombo.ko}
                        </h2>
                        <span className="text-4xl font-mono text-slate-500 mb-8 bg-slate-100 px-8 py-2 rounded-full font-bold">
                          {currentCombo.pro}
                        </span>
                        <button
                          onClick={(e) => speak(currentCombo.ko, e)}
                          className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-all hover:scale-105 active:scale-95 group shadow-sm"
                        >
                          <Play className="w-10 h-10 fill-current translate-x-1 group-hover:text-indigo-700" />
                        </button>
                        <p className="absolute bottom-6 text-slate-400 text-base font-medium flex items-center gap-2">
                          <RotateCcw className="w-5 h-5" /> 點擊翻面解說
                        </p>
                      </div>

                      <div
                        className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-2xl rounded-[3rem] flex flex-col p-10 border-2 border-indigo-100 overflow-y-auto"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                        }}
                      >
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                          <p className="text-slate-500 font-bold mb-4 uppercase tracking-widest text-lg">
                            對照與拼音
                          </p>
                          <div className="flex items-center justify-center gap-8 mb-10 bg-white px-10 py-6 rounded-[2rem] shadow-md border border-indigo-50 w-full">
                            <span className="text-7xl font-black text-slate-800">
                              {currentCombo.ko}
                            </span>
                            <div className="h-16 w-1 bg-slate-200 rounded-full"></div>
                            <span className="text-6xl font-bold text-indigo-600 font-mono">
                              {currentCombo.pro}
                            </span>
                          </div>

                          <div className="w-full bg-white p-6 rounded-2xl shadow-sm text-left border border-indigo-50">
                            <p className="text-sm text-indigo-500 font-black uppercase tracking-wider mb-4 border-b-2 border-indigo-50 pb-2">
                              字根拆解
                            </p>
                            <div className="space-y-5">
                              <p className="text-xl text-slate-700 font-medium leading-relaxed">
                                <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg mr-3 shadow-sm">
                                  {currentCombo.c?.ko}
                                </span>
                                {currentCombo.c?.hook.split('。')[1]}
                              </p>
                              <p className="text-xl text-slate-700 font-medium leading-relaxed">
                                <span className="font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg mr-3 shadow-sm">
                                  {currentCombo.v?.ko}
                                </span>
                                {currentCombo.v?.hook.split('。')[0]}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full max-w-md px-4">
                    <button
                      onClick={prevCombo}
                      className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"
                    >
                      <ChevronLeft className="w-10 h-10" />
                    </button>
                    <button
                      onClick={nextCombo}
                      className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"
                    >
                      <ChevronRight className="w-10 h-10" />
                    </button>
                  </div>
                </div>
              )}

              {/* 模式二：手動組合機 */}
              {alphabetMode === 'manual' && (
                <div className="grid grid-cols-1 gap-12 items-center bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="flex flex-col items-center justify-center">
                    {selectedC && selectedV && (
                      <div className="flex flex-col items-center bg-white p-10 rounded-[3rem] shadow-xl border-4 border-indigo-50 w-full">
                        <div className="flex items-center gap-4 text-4xl font-black text-slate-300 mb-8">
                          <span className="text-indigo-500">
                            {selectedC.ko}
                          </span>
                          <span>+</span>
                          <span className="text-amber-500">{selectedV.ko}</span>
                          <span>=</span>
                        </div>
                        <span className="text-[10rem] leading-none font-black text-slate-800 mb-6 drop-shadow-md tracking-tighter">
                          {combineHangul(selectedC.ko, selectedV.ko)}
                        </span>
                        <span className="text-4xl font-mono text-slate-500 mb-8 bg-slate-100 px-8 py-2 rounded-full font-bold">
                          {selectedC.pro.split('/')[0]}
                          {selectedV.pro}
                        </span>
                        <button
                          onClick={() =>
                            speak(combineHangul(selectedC.ko, selectedV.ko))
                          }
                          className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-full font-black text-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                        >
                          <Play className="w-7 h-7 fill-current" /> 聽發音
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-black text-indigo-700 text-center text-lg uppercase tracking-wider mb-4 border-b-2 border-indigo-100 pb-2">
                        1. 選擇子音
                      </h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {HANGUL_BASIC.consonants.map((c) => (
                          <button
                            key={c.ko}
                            onClick={() => setSelectedC(c)}
                            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl font-black text-2xl transition-all ${
                              selectedC?.ko === c.ko
                                ? 'bg-indigo-600 text-white shadow-lg scale-110'
                                : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                            }`}
                          >
                            {c.ko}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-black text-amber-600 text-center text-lg uppercase tracking-wider mb-4 border-b-2 border-amber-100 pb-2">
                        2. 選擇母音
                      </h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {HANGUL_BASIC.vowels.map((v) => (
                          <button
                            key={v.ko}
                            onClick={() => setSelectedV(v)}
                            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl font-black text-2xl transition-all ${
                              selectedV?.ko === v.ko
                                ? 'bg-amber-500 text-white shadow-lg scale-110'
                                : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                            }`}
                          >
                            {v.ko}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === 單字庫 === */}
        {view === 'vault' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-slate-800">
              <Library className="w-8 h-8 text-indigo-600" /> 我的單字庫
            </h2>

            {savedWords.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-slate-200 border-dashed">
                <Bookmark className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                <p className="text-slate-500 font-bold text-xl mb-2">
                  單字庫空空如也！
                </p>
                <button
                  onClick={() => setView('learn')}
                  className="mt-8 px-8 py-4 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-lg hover:bg-indigo-100 transition-colors shadow-sm"
                >
                  去背單字
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] shadow-md border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-2 bg-slate-50 border-b-2 border-slate-200 text-base font-bold text-slate-500 uppercase tracking-wider p-6">
                  <div>韓文 & 拼音</div>
                  <div>中文意思 (可遮擋測驗)</div>
                </div>
                <div className="divide-y-2 divide-slate-100">
                  {savedWords.map((word) => (
                    <div
                      key={word.id}
                      className="grid grid-cols-2 p-6 items-center hover:bg-indigo-50/50 transition-colors group"
                    >
                      <div className="pr-6 border-r-2 border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl font-black text-slate-800">
                            {word.ko}
                          </span>
                          <button
                            onClick={() => speak(word.ko)}
                            className="text-indigo-400 hover:text-indigo-600 transition-colors bg-indigo-50 p-2 rounded-full"
                          >
                            <Play className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                        <span className="text-lg text-slate-500 font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg">
                          {word.pro}
                        </span>
                      </div>
                      <div className="pl-6 relative flex items-center justify-between">
                        <span className="text-2xl font-bold text-slate-700">
                          {word.zh}
                        </span>
                        <button
                          onClick={() => toggleSaveWord(word)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-3 bg-slate-50 rounded-full"
                        >
                          <BookmarkCheck className="w-7 h-7 text-amber-500 hover:text-slate-300" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
