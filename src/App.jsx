import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { Sparkles, Play, Volume2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Type, Puzzle, Shuffle, Layers, RefreshCw, BookOpen, ArrowLeft, Bookmark, BookmarkCheck, Library, Trophy } from 'lucide-react';

// ==========================================
// 韓文基礎發音與進階結構資料
// ==========================================
const HANGUL_BASIC = {
  vowels: [
    { ko: "ㅏ", pro: "a", bpmf: "ㄚ", name: "아", hook: "人(|)在地上，太陽(.)東方升起。明亮音 ㄚ。" },
    { ko: "ㅑ", pro: "ya", bpmf: "ㄧㄚ", name: "야", hook: "兩個太陽(短橫)，發音前加上 ㄧ 變 ㄧㄚ。" },
    { ko: "ㅓ", pro: "eo", bpmf: "ㄡ/ㄜ", name: "어", hook: "人(|)，太陽西方落下。陰暗音 ㄡ。" },
    { ko: "ㅕ", pro: "yeo", bpmf: "ㄧㄡ", name: "여", hook: "兩個太陽，加上 ㄧ 變 ㄧㄡ。" },
    { ko: "ㅗ", pro: "o", bpmf: "ㄛ", name: "오", hook: "大地(-)，太陽在上面。嘴唇圓噘明亮音 ㄛ。" },
    { ko: "ㅛ", pro: "yo", bpmf: "ㄧㄛ", name: "요", hook: "兩個太陽，加上 ㄧ 變 ㄧㄛ。" },
    { ko: "ㅜ", pro: "u", bpmf: "ㄨ", name: "우", hook: "大地(-)，太陽在下面。嘴唇噘起陰暗音 ㄨ。" },
    { ko: "ㅠ", pro: "yu", bpmf: "ㄧㄨ", name: "유", hook: "兩個太陽，加上 ㄧ 變 ㄧㄨ。" },
    { ko: "ㅡ", pro: "eu", bpmf: "ㄭ (扁ㄜ)", name: "으", hook: "象形：平坦大地。嘴扁平向側拉開發 扁ㄜ。" },
    { ko: "ㅣ", pro: "i", bpmf: "ㄧ", name: "이", hook: "象形：直立的人。發 ㄧ。" }
  ],
  consonants: [
    { ko: "ㄱ", pro: "g/k", bpmf: "ㄍ/ㄎ", tts: "가", hook: "象形：舌根頂住軟顎。聯想：槍(Gun)。" },
    { ko: "ㄴ", pro: "n", bpmf: "ㄋ", tts: "나", hook: "象形：舌尖頂住上齒齦。聯想：鼻子(Nose)。" },
    { ko: "ㄷ", pro: "d/t", bpmf: "ㄉ/ㄊ", tts: "다", hook: "象形：ㄴ加一橫，發音更用力。聯想：門(Door)。" },
    { ko: "ㄹ", pro: "r/l", bpmf: "ㄌ/ㄦ", tts: "라", hook: "象形：舌頭彈動。聯想：蛇(Reptile)爬行。" },
    { ko: "ㅁ", pro: "m", bpmf: "ㄇ", tts: "마", hook: "象形：雙唇。聯想：嘴巴(Mouth)的方形。" },
    { ko: "ㅂ", pro: "b/p", bpmf: "ㄅ/ㄆ", tts: "바", hook: "象形：ㅁ加兩豎。聯想：水桶(Bucket)。" },
    { ko: "ㅅ", pro: "s", bpmf: "ㄙ", tts: "사", hook: "象形：氣流擦過牙齒。聯想：站立(Stand)雙腿。" },
    { ko: "ㅇ", pro: "ng", bpmf: "無/ㄫ", tts: "아", hook: "象形：喉嚨圓形。字首不發音，字尾發 ㄫ。" },
    { ko: "ㅈ", pro: "j/ch", bpmf: "ㄐ/ㄗ", tts: "자", hook: "在ㅅ加一橫。聯想：果汁(Juice)杯插吸管。" },
    { ko: "ㅊ", pro: "ch'", bpmf: "ㄑ/ㄘ", tts: "차", hook: "激音(噴氣)：ㅈ加一點。聯想：火車(Choo-choo)。" },
    { ko: "ㅋ", pro: "k'", bpmf: "ㄎ", tts: "카", hook: "激音：ㄱ加一橫。聯想：咳嗽清喉嚨或鑰匙(Key)。" },
    { ko: "ㅌ", pro: "t'", bpmf: "ㄊ", tts: "타", hook: "激音：ㄷ加一橫。聯想：英文字母E，發 T 音。" },
    { ko: "ㅍ", pro: "p'", bpmf: "ㄆ", tts: "파", hook: "激音：ㅂ變形。聯想：神廟羅馬柱(Pillar)。" },
    { ko: "ㅎ", pro: "h", bpmf: "ㄏ", tts: "하", hook: "象形：喉嚨帶氣流。聯想：戴帽子的人頭(Head)。" }
  ]
};

// 組合邏輯
const CHOSUNG_MAP = { "ㄱ": 0, "ㄲ": 1, "ㄴ": 2, "ㄷ": 3, "ㄸ": 4, "ㄹ": 5, "ㅁ": 6, "ㅂ": 7, "ㅃ": 8, "ㅅ": 9, "ㅆ": 10, "ㅇ": 11, "ㅈ": 12, "ㅉ": 13, "ㅊ": 14, "ㅋ": 15, "ㅌ": 16, "ㅍ": 17, "ㅎ": 18 };
const JUNGSUNG_MAP = { "ㅏ": 0, "ㅐ": 1, "ㅑ": 2, "ㅒ": 3, "ㅓ": 4, "ㅔ": 5, "ㅕ": 6, "ㅖ": 7, "ㅗ": 8, "ㅘ": 9, "ㅙ": 10, "ㅚ": 11, "ㅛ": 12, "ㅜ": 13, "ㅝ": 14, "ㅞ": 15, "ㅟ": 16, "ㅠ": 17, "ㅡ": 18, "ㅢ": 19, "ㅣ": 20 };
const combineHangul = (c, v) => String.fromCharCode(44032 + (CHOSUNG_MAP[c] * 588) + (JUNGSUNG_MAP[v] * 28)); 
const generateAllCombos = () => {
  let combos = [];
  HANGUL_BASIC.consonants.forEach(c => {
    HANGUL_BASIC.vowels.forEach(v => {
      combos.push({
        ko: combineHangul(c.ko, v.ko),
        pro: c.pro.split('/')[0] + v.pro,
        bpmf: (c.bpmf.split('/')[0] === '無' ? '' : c.bpmf.split('/')[0]) + v.bpmf.split(' ')[0],
        hook: `${c.ko} + ${v.ko}`
      });
    });
  });
  return combos;
};

// 進階發音結構資料
const STRUCT_3 = [
  { ko: "와", pro: "wa", bpmf: "ㄨㄚ", hook: "ㅇ(不發音) + ㅗ + ㅏ = 와 (wa)" },
  { ko: "화", pro: "hwa", bpmf: "ㄏㄨㄚ", hook: "ㅎ(h) + ㅗ + ㅏ = 화 (hwa)" },
  { ko: "줘", pro: "jwo", bpmf: "ㄐㄨㄛ", hook: "ㅈ(j) + ㅜ + ㅓ = 줘 (jwo)" },
  { ko: "위", pro: "wi", bpmf: "ㄨㄧ", hook: "ㅇ(不發音) + ㅜ + ㅣ = 위 (wi)" },
  { ko: "왜", pro: "wae", bpmf: "ㄨㄟ", hook: "ㅇ(不發音) + ㅗ + ㅐ = 왜 (wae)" },
  { ko: "돼", pro: "dwae", bpmf: "ㄉㄨㄟ", hook: "ㄷ(d) + ㅗ + ㅐ = 돼 (dwae)" },
  { ko: "의", pro: "ui", bpmf: "ㄨㄧ", hook: "ㅇ(不發音) + ㅡ + ㅣ = 의 (ui/eui)" },
  { ko: "뭐", pro: "mwo", bpmf: "ㄇㄨㄛ", hook: "ㅁ(m) + ㅜ + ㅓ = 뭐 (mwo)" },
  { ko: "뇌", pro: "noe", bpmf: "ㄋㄨㄟ", hook: "ㄴ(n) + ㅗ + ㅣ = 뇌 (noe)" },
  { ko: "둬", pro: "dwo", bpmf: "ㄉㄨㄛ", hook: "ㄷ(d) + ㅜ + ㅓ = 둬 (dwo)" }
];

const STRUCT_4 = [
  { ko: "열", pro: "yeol", bpmf: "ㄧㄡㄌ", hook: "ㅇ + ㅕ + ㄹ(尾音l)" },
  { ko: "섯", pro: "seot", bpmf: "ㄙㄡㄉ", hook: "ㅅ + ㅓ + ㅅ(尾音t)" },
  { ko: "강", pro: "gang", bpmf: "ㄍㄤ", hook: "ㄱ + ㅏ + ㅇ(尾音ng)" },
  { ko: "산", pro: "san", bpmf: "ㄙㄢ", hook: "ㅅ + ㅏ + ㄴ(尾音n)" },
  { ko: "별", pro: "byeol", bpmf: "ㄅㄧㄡㄌ", hook: "ㅂ + ㅕ + ㄹ(尾音l)" },
  { ko: "달", pro: "dal", bpmf: "ㄉㄚㄌ", hook: "ㄷ + ㅏ + ㄹ(尾音l)" },
  { ko: "물", pro: "mul", bpmf: "ㄇㄨㄌ", hook: "ㅁ + ㅜ + ㄹ(尾音l)" },
  { ko: "불", pro: "bul", bpmf: "ㄅㄨㄌ", hook: "ㅂ + ㅜ + ㄹ(尾音l)" },
  { ko: "집", pro: "jip", bpmf: "ㄐㄧㄅ", hook: "ㅈ + ㅣ + ㅂ(尾音p)" },
  { ko: "책", pro: "chaek", bpmf: "ㄘㄟㄍ", hook: "ㅊ + ㅐ + ㄱ(尾音k)" }
];

const STRUCT_5 = [
  { ko: "많", pro: "man", bpmf: "ㄇㄢ", hook: "ㅁ + ㅏ + ㄴㅎ(雙收音，發n)" },
  { ko: "않", pro: "an", bpmf: "ㄢ", hook: "ㅇ + ㅏ + ㄴㅎ(雙收音，發n)" },
  { ko: "닭", pro: "dak", bpmf: "ㄉㄚㄍ", hook: "ㄷ + ㅏ + ㄹㄱ(雙收音，發k)" },
  { ko: "흙", pro: "heuk", bpmf: "ㄏㄜㄍ", hook: "ㅎ + ㅡ + ㄹㄱ(雙收音，發k)" },
  { ko: "넓", pro: "neol", bpmf: "ㄋㄡㄌ", hook: "ㄴ + ㅓ + ㄹㅂ(雙收音，發l)" },
  { ko: "짧", pro: "jjal", bpmf: "ㄐㄧㄚㄌ", hook: "ㅉ + ㅏ + ㄹㅂ(雙收音，發l)" },
  { ko: "얇", pro: "yal", bpmf: "ㄧㄚㄌ", hook: "ㅇ + ㅑ + ㄹㅂ(雙收音，發l)" },
  { ko: "핥", pro: "hal", bpmf: "ㄏㄚㄌ", hook: "ㅎ + ㅏ + ㄹㅌ(雙收音，發l)" },
  { ko: "삶", pro: "sam", bpmf: "ㄙㄚㄇ", hook: "ㅅ + ㅏ + ㄹㅁ(雙收音，發m)" },
  { ko: "여덟", pro: "yeodeol", bpmf: "ㄧㄡㄉㄡㄌ", hook: "ㄷ + ㅓ + ㄹㅂ(雙收音，發l)" }
];

// ==========================================
// 內建單元資料庫
// ==========================================
const buildDeck = (title, icon, rawData) => ({
  title, icon,
  words: rawData.map(w => ({ ko: w[0], pro: w[1], zh: w[2], ex: w[3], exZh: w[4], memoryHook: w[5], imagePrompt: w[6] }))
});

const BUILTIN_DECKS = [
  buildDeck("基礎問候", "👋", [
    ["안녕하세요", "annyeonghaseyo", "你好", "안녕하세요, 반갑습니다.", "你好，很高興見到你。", "漢字「安寧」。祝人安寧。", "two friendly people bowing to each other"],
    ["감사합니다", "gamsahamnida", "謝謝", "도와주셔서 감사합니다.", "謝謝你的幫忙。", "漢字「感謝」。", "a person handing a gift and smiling"],
    ["죄송합니다", "joesonghamnida", "對不起", "늦어서 죄송합니다.", "對不起我遲到了。", "漢字「罪悚」。感到抱歉。", "a person bowing in apology, sincere"],
    ["네", "ne", "是/好", "네, 알겠습니다.", "是的，我知道了。", "聽起來像『捏』。捏一下表示同意。", "thumbs up, positive gesture"],
    ["아니요", "aniyo", "不是/不", "아니요, 괜찮아요.", "不，沒關係。", "發音像『阿尼喲』。", "person gently waving hand to say no"]
  ]),
  buildDeck("常用動詞", "🏃", [
    ["가다", "gada", "去", "학교에 가다.", "去學校。", "發音『卡達』。卡達卡達走路去。", "person walking towards a building"],
    ["오다", "oda", "來", "집에 오다.", "來家裡(回家)。", "發音『歐達』。歐！你來啦！", "person arriving at a house door"],
    ["먹다", "meokda", "吃", "밥을 먹다.", "吃飯。", "發音『摸答』。摸摸肚子準備吃。", "person eating a bowl of rice"]
  ]),
  buildDeck("核心形容詞", "✨", [
    ["크다", "keuda", "大", "집이 크다.", "房子很大。", "發音『可達』。大到可達天際。", "a very large house next to a small one"],
    ["작다", "jakda", "小", "가방이 작다.", "包包很小。", "發音『眨達』。小到眨眼就不見。", "a very small cute backpack"],
    ["많다", "manta", "多", "사람이 많다.", "人很多。", "發音『滿他』。滿出來的多。", "a crowded street full of people"]
  ]),
  buildDeck("飲食點餐", "🍔", [
    ["물", "mul", "水", "물 좀 주세요.", "請給我水。", "發音『木』。木頭也需要水。", "a clear glass of refreshing water"],
    ["밥", "bap", "飯", "밥을 먹다.", "吃飯。", "發音『帕』。吃飯怕燙。", "a steaming bowl of white rice"],
    ["김치", "gimchi", "泡菜", "김치가 매워요.", "泡菜很辣。", "發音『金七』。韓國國寶。", "a dish of spicy red Korean kimchi"]
  ]),
  buildDeck("交通旅遊", "🚌", [
    ["버스", "beoseu", "公車", "버스를 타다.", "搭公車。", "外來語 Bus。", "a modern city bus driving on the street"],
    ["지하철", "jihacheol", "地鐵", "지하철역이 어디예요?", "地鐵站在哪裡？", "漢字「地下鐵」。", "a fast subway train arriving at a station"],
    ["택시", "taeksi", "計程車", "택시를 부르다.", "叫計程車。", "外來語 Taxi。", "a typical Korean city taxi"]
  ])
];

// ==========================================
// 1. Firebase 初始化
// ==========================================
let app, auth, db;
const myFirebaseConfig = {
  apiKey: "AIzaSyDhgjHoqMVQAomoNDmRcThrukfkRhimj6A",
  authDomain: "korea-card.firebaseapp.com",
  projectId: "korea-card",
  storageBucket: "korea-card.firebasestorage.app",
  messagingSenderId: "169548289851",
  appId: "1:169548289851:web:ac1b5d4ca33688655dc91e",
  measurementId: "G-2167E3Q3P5"
};

const isCanvasEnv = typeof __firebase_config !== 'undefined' && __firebase_config;
const finalFirebaseConfig = isCanvasEnv ? JSON.parse(__firebase_config) : myFirebaseConfig;
const finalAppId = isCanvasEnv && typeof __app_id !== 'undefined' ? __app_id : 'korea-card';

try {
  app = initializeApp(finalFirebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase 初始化跳過:", error);
}

const getInitialName = () => {
  try { return localStorage.getItem('kc_player_name') || ''; } catch(e) { return ''; }
};
const saveNameToStorage = (val) => {
  try { localStorage.setItem('kc_player_name', val); } catch(e) {}
};

export default function App() {
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    if (!document.getElementById('custom-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-styles';
      style.innerHTML = `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // ==========================================
  // 2. 狀態管理
  // ==========================================
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [view, setView] = useState('home'); 
  
  const [playerName, setPlayerName] = useState(getInitialName());
  
  const [words, setWords] = useState(BUILTIN_DECKS[0].words);
  const [savedWords, setSavedWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [quizPending, setQuizPending] = useState(null); 
  const [quizType, setQuizType] = useState('words');
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizScore, setQuizScore] = useState(100);
  const [quizMistakes, setQuizMistakes] = useState({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [showQuizMenu, setShowQuizMenu] = useState(null);
  const [currentDeckTitle, setCurrentDeckTitle] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [currentOptions, setCurrentOptions] = useState([]);
  const [correctOption, setCorrectOption] = useState("");
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [selectedWrongOptions, setSelectedWrongOptions] = useState([]);

  const [inputMode, setInputMode] = useState('topic'); 
  const [topic, setTopic] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 🔥 智慧導航與 140音過濾狀態 🔥
  const [returnView, setReturnView] = useState('home');
  const [isAlphabetLearnMode, setIsAlphabetLearnMode] = useState(false);
  const [comboFilterIdx, setComboFilterIdx] = useState(0); // 選擇的子音索引 (0~13)

  const comboCards = generateAllCombos();

  const ALPHABET_DATA = [
    { id: 'vowels', title: "1. 基本母音", desc: "10個", note: "發音基石", data: HANGUL_BASIC.vowels },
    { id: 'consonants', title: "2. 基本子音", desc: "14個", note: "語音搭配「ㅏ(a)」", data: HANGUL_BASIC.consonants },
    { id: 'combos', title: "3. 子音＋母音", desc: "140音", note: "母音只會組合在子音的右方或下方，如 려 或者 포", data: comboCards },
    { id: 'struct3', title: "4. 子音＋母音＋母音", desc: "進階", note: "子音在左上，母音在左下及右邊，如 와 或者 화", data: STRUCT_3 },
    { id: 'struct4', title: "5. 子音＋母音＋子音", desc: "收音", note: "依照規則2再加一尾音，如 열 或 섯", data: STRUCT_4 },
    { id: 'struct5', title: "6. 子音＋母音＋子音＋子音", desc: "雙收音", note: "包含兩個尾音，如 많 或者 않", data: STRUCT_5 }
  ];

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (isCanvasEnv && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setAuthError("⚠️ 儲存功能已暫停：請至 Firebase 啟用「匿名登入」！");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const wordsRef = collection(db, 'artifacts', finalAppId, 'users', user.uid, 'saved_korean_words');
    const unsubscribe = onSnapshot(wordsRef, (snapshot) => {
      const saved = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedWords(saved);
    });
    return () => unsubscribe();
  }, [user, db]);

  useEffect(() => {
    if (quizFinished && isQuizMode && currentDeckTitle && db && user) {
      const safeTitle = currentDeckTitle.substring(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      const boardRef = collection(db, 'artifacts', finalAppId, 'public', 'data', `leaderboard_${safeTitle}`);
      const finalName = playerName.trim() || '無名英雄';
      addDoc(boardRef, { name: finalName, score: quizScore, timestamp: Date.now() }).catch(console.error);

      const unsub = onSnapshot(boardRef, (snap) => {
        const scores = snap.docs.map(d => d.data());
        scores.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
        setLeaderboard(scores.slice(0, 10));
      }, console.error);
      return () => unsub();
    }
  }, [quizFinished, isQuizMode, currentDeckTitle, db, user]);

  const currentWord = words[currentIndex] || {};
  const hasSentence = !!currentWord.ex;

  // 🔥 自動發音伴讀邏輯 (翻到背面時觸發) 🔥
  useEffect(() => {
    if (view === 'flashcard' && isFlipped) {
      window.speechSynthesis.cancel();
      const wordToSpeak = currentWord.ko;
      const exToSpeak = currentWord.ex;

      if (wordToSpeak) {
        const utterance = new SpeechSynthesisUtterance(wordToSpeak);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.85;

        if (exToSpeak) {
          utterance.onend = () => {
            setTimeout(() => {
              if (isFlipped && words[currentIndex]?.ko === wordToSpeak) {
                const exUtterance = new SpeechSynthesisUtterance(exToSpeak);
                exUtterance.lang = 'ko-KR';
                exUtterance.rate = 0.85;
                window.speechSynthesis.speak(exUtterance);
              }
            }, 1000);
          };
        }
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [isFlipped, currentIndex, view, words]);

  // ==========================================
  // 3. 核心切換與控制函式
  // ==========================================
  const changeView = (newView) => {
    setView(newView);
    if (newView !== 'flashcard') {
      setIsQuizMode(false);
      setQuizFinished(false);
      setQuizPending(null);
      setIsAlphabetLearnMode(false);
      window.speechSynthesis.cancel();
    }
  };

  const handleNameChange = (val) => {
    setPlayerName(val);
  };

  const getQuizOptions = (total) => {
    const opts = [10, 20, 25, 50].filter(n => n < total);
    opts.push(total); 
    return [...new Set(opts)];
  };

  // 🔥 優化選項生成邏輯：只篩選同類別，或單字長度相似的答案 🔥
  const generateOptionsForCard = (index, currentDeck, overrideType) => {
    const typeToUse = overrideType || quizType;
    const correctWord = currentDeck[index];
    if (!correctWord) return;
    
    let correctOpt = correctWord.zh; 
    let pool = [];

    if (typeToUse === 'vowels') {
      pool = HANGUL_BASIC.vowels.map(v => v.bpmf);
    } else if (typeToUse === 'consonants') {
      pool = HANGUL_BASIC.consonants.map(c => c.bpmf);
    } else if (typeToUse === 'combos') {
      pool = comboCards.map(c => c.bpmf);
    } else if (typeToUse === 'struct3') {
      pool = STRUCT_3.map(c => c.bpmf);
    } else if (typeToUse === 'struct4') {
      pool = STRUCT_4.map(c => c.bpmf);
    } else if (typeToUse === 'struct5') {
      pool = STRUCT_5.map(c => c.bpmf);
    } else {
      // 處理單字 (中文選項)
      const allWordsZh = BUILTIN_DECKS.flatMap(d => d.words).map(w => w[2]); 
      currentDeck.forEach(w => { if (!allWordsZh.includes(w.zh)) allWordsZh.push(w.zh); });
      
      // 取字數長度相差不超過 2 的選項，增加誤答率
      const targetLen = correctOpt.length;
      pool = allWordsZh.filter(zh => Math.abs(zh.length - targetLen) <= 2);
      if (pool.length < 5) pool = allWordsZh; // 備用防呆
    }

    if (!pool.includes(correctOpt)) pool.push(correctOpt);

    let wrongs = [];
    let attempts = 0;
    while (wrongs.length < 3 && attempts < 100) {
        const rand = pool[Math.floor(Math.random() * pool.length)];
        if (rand && rand !== correctOpt && !wrongs.includes(rand)) {
            wrongs.push(rand);
        }
        attempts++;
    }
    while (wrongs.length < 3) {
        wrongs.push(`選項 ${wrongs.length + 1}`);
    }
    
    const finalOptions = [...wrongs, correctOpt].sort(() => Math.random() - 0.5);
    setCurrentOptions(finalOptions);
    setCorrectOption(correctOpt);
  };

  const generateWords = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const promptText = `你是一位專業的韓文教師。請針對以下單字或主題：「${topic}」（可能是中文、英文或韓文），將它們精準翻譯並轉換成 5 個標準的韓文單字卡。
    請嚴格以 JSON 陣列格式回傳。每一個輸入都要生成一個對應的物件，包含：
    - ko: 翻譯後的韓文單字或短語
    - pro: 羅馬拼音
    - zh: 繁體中文意思
    - ex: 實用的韓文例句
    - exZh: 例句的繁體中文翻譯
    - memoryHook: 複合漢字拆解或意象化聯想(幫助邏輯記憶，非常重要！)
    - imagePrompt: 一段簡短的英文畫面描述`;

    try {
      const apiKey = ""; 
      const apiUrl = isCanvasEnv 
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`
        : '/api/generate';
        
      const requestBody = isCanvasEnv
        ? { contents: [{ parts: [{ text: promptText }] }], generationConfig: { responseMimeType: "application/json" } }
        : { prompt: promptText };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`API 請求失敗 (${response.status})`);
      
      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) throw new Error("AI 沒有回傳內容");

      const cleanedText = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      const newWords = JSON.parse(cleanedText);
      
      setQuizPending({
        pool: newWords, count: newWords.length,
        type: 'words',
        title: inputMode === 'topic' ? `AI主題：${topic}` : 'AI自訂單字',
        fromView: 'home'
      });
    } catch (err) {
      setErrorMsg(`生成失敗：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 點選直接進入學習模式 (無測驗選擇題) 🔥
  const startLearnMode = (pool, startIndex, title, fromView = 'home') => {
    const deck = pool.map(item => ({
        ko: item.ko, pro: item.pro, bpmf: item.bpmf, 
        zh: item.zh || (item.bpmf ? item.bpmf : `發音：${item.pro}`), 
        memoryHook: item.hook || item.memoryHook || "", ex: item.ex || "", exZh: item.exZh || "", imagePrompt: item.imagePrompt || ""
    }));
    setWords(deck);
    setCurrentDeckTitle(title);
    setIsQuizMode(false);
    setCurrentIndex(startIndex);
    setReturnView(fromView);
    
    const isAlphabet = fromView === 'alphabet';
    setIsAlphabetLearnMode(isAlphabet);
    setIsFlipped(isAlphabet); // 如果是基礎發音，直接翻到背面並自動唸！
    changeView('flashcard');
  };

  // 點選題庫的測驗彈窗
  const startQuizFlow = (pool, count, id, title, fromView = 'home') => {
    setQuizPending({ pool, count, type: id, title, fromView });
    setShowQuizMenu(null);
  };

  const handleStartPendingQuiz = () => {
    if (!quizPending) return;
    const { pool, count, type, title, fromView } = quizPending;
    saveNameToStorage(playerName);
    
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    const deck = selected.map(item => {
      if (type === 'vowels' || type === 'consonants') {
        return { ko: item.ko, pro: item.pro, bpmf: item.bpmf, zh: item.bpmf, memoryHook: item.hook, ex: "", exZh: "" };
      } else if (type === 'combos' || type === 'struct3' || type === 'struct4' || type === 'struct5') {
        return { 
          ko: item.ko, pro: item.pro, bpmf: item.bpmf, zh: item.zh || item.bpmf,
          memoryHook: item.hook || "", ex: "", exZh: "" 
        };
      } else {
        return item; 
      }
    });

    setWords(deck);
    setCurrentDeckTitle(title);
    setQuizType(type);
    setIsQuizMode(true);
    setReturnView(fromView);
    setQuizScore(100);
    setQuizMistakes({});
    setCurrentIndex(0);
    setAnsweredCorrectly(false);
    setSelectedWrongOptions([]);
    generateOptionsForCard(0, deck, type);
    
    setIsAlphabetLearnMode(false);
    setIsFlipped(false);
    setQuizPending(null);
    changeView('flashcard');
  };

  const handleOptionClick = (opt, e) => {
    e.stopPropagation();
    if (opt === correctOption) {
        setAnsweredCorrectly(true);
        setIsFlipped(true);
    } else {
        setSelectedWrongOptions(prev => [...prev, opt]);
        setQuizScore(s => Math.max(0, s - 1)); // 選擇題選錯扣 1 分
        setQuizMistakes(prev => ({ ...prev, [currentWord.ko]: true }));
    }
  };

  const shuffleRemainingQuiz = () => {
    setIsFlipped(false);
    setAnsweredCorrectly(false);
    setSelectedWrongOptions([]);
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const past = words.slice(0, currentIndex);
      const remaining = words.slice(currentIndex);
      const shuffled = [...remaining].sort(() => Math.random() - 0.5);
      const newDeck = [...past, ...shuffled];
      setWords(newDeck);
      if (isQuizMode) generateOptionsForCard(currentIndex, newDeck, quizType);
    }, 150);
  };

  const handleSRS = (rating, e) => {
    if (e) e.stopPropagation();
    window.speechSynthesis.cancel();
    
    let currentDeck = words;
    let addedMistake = false;

    if (rating === 'again') {
        if (isQuizMode) setQuizScore((prev) => Math.max(0, prev - 2)); 
        addedMistake = true;
    } else if (rating === 'hard') {
        if (isQuizMode) setQuizScore((prev) => Math.max(0, prev - 1)); 
        addedMistake = true;
    }
    
    if (addedMistake) {
        if (isQuizMode) setQuizMistakes((prev) => ({ ...prev, [currentWord.ko]: true }));
        currentDeck = [...words, currentWord];
        setWords(currentDeck);
    }
    
    setIsFlipped(false);
    setAnsweredCorrectly(false);
    setSelectedWrongOptions([]);
    
    setTimeout(() => {
        const nextIndex = currentIndex + 1;
        if (isQuizMode && nextIndex >= currentDeck.length) {
            setQuizFinished(true);
        } else {
            setCurrentIndex(nextIndex % currentDeck.length);
            if (isQuizMode) generateOptionsForCard(nextIndex, currentDeck, quizType);
        }
    }, 150);
  };

  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; 
    utterance.rate = 0.85;    
    window.speechSynthesis.speak(utterance);
  };

  const nextCard = () => { 
    if (!isAlphabetLearnMode) setIsFlipped(false); 
    window.speechSynthesis.cancel();
    setTimeout(() => setCurrentIndex((p) => (p + 1) % words.length), isAlphabetLearnMode ? 0 : 150); 
  };
  const prevCard = () => { 
    if (!isAlphabetLearnMode) setIsFlipped(false); 
    window.speechSynthesis.cancel();
    setTimeout(() => setCurrentIndex((p) => (p - 1 + words.length) % words.length), isAlphabetLearnMode ? 0 : 150); 
  };

  const toggleSaveWord = async (word, e) => {
    if (e) e.stopPropagation();
    if (!user || !db) return;
    const wordId = word.ko; 
    const docRef = doc(db, 'artifacts', finalAppId, 'users', user.uid, 'saved_korean_words', wordId);
    try {
      const isSaved = savedWords.some(w => w.id === wordId);
      if (isSaved) await deleteDoc(docRef);
      else await setDoc(docRef, { ...word, savedAt: new Date().toISOString() });
    } catch (err) { console.error("儲存失敗:", err); }
  };

  const isCurrentSaved = savedWords.some(w => w.id === currentWord.ko);

  // ==========================================
  // UI 渲染
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200 relative">
      
      {/* 🔥 準備測驗的英雄輸入彈窗 🔥 */}
      {quizPending && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                <div className="flex justify-center mb-4"><Trophy className="w-12 h-12 text-amber-500" /></div>
                <h3 className="text-2xl font-black text-center text-slate-800 mb-2">準備開始測驗</h3>
                <p className="text-center text-slate-500 font-bold mb-6">{quizPending.title} ({quizPending.count}題)</p>
                
                <input
                  value={playerName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="輸入英雄大名 (排行榜用)"
                  className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-3 rounded-xl text-center font-black text-slate-700 mb-6 focus:border-indigo-400 outline-none transition-colors"
                />
                
                <div className="flex gap-3">
                    <button onClick={() => setQuizPending(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors">取消</button>
                    <button onClick={handleStartPendingQuiz} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition-colors shadow-md">開始測驗</button>
                </div>
            </div>
        </div>
      )}

      {/* 🌟 1. 沉浸式單字卡模式 🌟 */}
      {view === 'flashcard' && (
        <div className="flex flex-col items-center w-full min-h-screen bg-slate-50 pt-6 px-4 pb-12">
          {/* 左上角返回與洗牌按鈕 */}
          <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
            <button onClick={() => changeView(returnView)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-3 py-2 rounded-xl shadow-sm active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5" /> 返回
            </button>
            {isQuizMode && !quizFinished && (
              <div className="flex gap-2">
                <button onClick={shuffleRemainingQuiz} className="flex items-center gap-1 text-indigo-500 bg-white hover:bg-indigo-50 px-3 py-2 rounded-xl shadow-sm font-bold active:scale-95 transition-colors">
                  <Shuffle className="w-4 h-4"/> 洗牌
                </button>
                <span className="bg-amber-100 text-amber-700 font-black px-3 py-2 rounded-xl shadow-sm">
                  💯 {quizScore}
                </span>
              </div>
            )}
          </div>

          <div className="w-full max-w-md perspective-1000">
            {quizFinished ? (
              // 🏆 測驗完成與英雄榜畫面 🏆
              <div className="flex flex-col items-center justify-center w-full h-[32rem] bg-white shadow-2xl rounded-[2.5rem] border-4 border-indigo-50 p-6 text-center animate-in zoom-in duration-300">
                <h2 className="text-3xl font-black text-indigo-600 mb-2">測驗完成！</h2>
                <div className="text-[5rem] font-black text-amber-400 drop-shadow-md leading-none mb-4">{quizScore}</div>
                
                <div className="w-full bg-slate-50 rounded-2xl p-4 mb-4 flex-1 overflow-y-auto custom-scrollbar border border-slate-100">
                  <h3 className="font-black text-slate-600 mb-3 flex justify-center items-center gap-2"><Trophy className="w-5 h-5 text-amber-500"/> 英雄榜 ({currentDeckTitle})</h3>
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold">載入中或尚無紀錄...</p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry, i) => (
                        <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`font-black w-5 text-left ${i===0?'text-amber-500':i===1?'text-slate-400':i===2?'text-amber-600':'text-slate-300'}`}>#{i+1}</span>
                            <span className="font-bold text-slate-700 text-sm truncate max-w-[120px]">{entry.name}</span>
                          </div>
                          <span className="font-black text-indigo-600">{entry.score} 分</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => changeView(returnView)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg px-10 py-3 rounded-full shadow-md active:scale-95 transition-all">
                  完成
                </button>
              </div>
            ) : (
              // 🎴 單字卡本體 🎴
              <div 
                className="relative w-full h-[28rem] sm:h-[30rem] md:h-[32rem] transition-transform duration-500 ease-out cursor-pointer" 
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }} 
                onClick={() => { if (!isQuizMode && !isFlipped) setIsFlipped(true); }}
              >
                
                {/* 正面 */}
                <div className="absolute inset-0 bg-white shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border-2 border-slate-100" style={{ backfaceVisibility: 'hidden' }}>
                  {isQuizMode && !answeredCorrectly ? (
                      <div className="flex-1 flex flex-col p-4 md:p-5 h-full">
                          <div className="flex justify-between items-center text-slate-400 font-bold text-sm uppercase tracking-widest mb-1 shrink-0">
                              <span>{currentIndex + 1} / {words.length}</span>
                              <span className="text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full shadow-sm">選擇題模式</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center min-h-[5rem]">
                              <h2 className="text-[3.5rem] font-black text-slate-800 leading-tight text-center break-words w-full px-2 py-1">{currentWord.ko}</h2>
                          </div>
                          <div className="grid grid-cols-1 gap-3 w-full shrink-0 pb-1">
                              {currentOptions.map((opt, i) => {
                                  const isWrong = selectedWrongOptions.includes(opt);
                                  return (
                                      <button 
                                          key={i}
                                          onClick={(e) => handleOptionClick(opt, e)}
                                          disabled={isWrong}
                                          className={`py-3 md:py-3.5 px-4 rounded-xl font-bold text-[15px] md:text-lg transition-all shadow-sm border-2 text-left leading-snug break-words
                                              ${isWrong ? 'bg-red-50 border-red-200 text-red-400 scale-[0.98] opacity-70' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md active:scale-[0.98]'}`}
                                      >
                                          {opt}
                                      </button>
                                  )
                              })}
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col w-full h-full">
                        {currentWord.imagePrompt && (
                          <div className="relative w-full h-[35%] bg-slate-100 shrink-0">
                            <img src={`https://image.pollinations.ai/prompt/${encodeURIComponent(currentWord.imagePrompt)}?width=800&height=600&nologo=true`} alt="AI generated" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                            <span className="absolute top-5 left-5 text-white font-bold tracking-widest text-sm uppercase drop-shadow-md">{currentIndex + 1} / {words.length}</span>
                            <button onClick={(e) => toggleSaveWord(currentWord, e)} className="absolute top-5 right-5 text-white hover:text-amber-400 transition-colors z-10 p-2 drop-shadow-md">
                              {isCurrentSaved ? <BookmarkCheck className="w-7 h-7 text-amber-400 fill-amber-400" /> : <Bookmark className="w-7 h-7" />}
                            </button>
                          </div>
                        )}
                        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                          {!currentWord.imagePrompt && <span className="absolute top-5 left-5 text-slate-400 font-bold tracking-widest text-sm uppercase drop-shadow-md">{currentIndex + 1} / {words.length}</span>}
                          <h2 className="text-[4rem] font-black text-slate-800 mb-3 tracking-tighter text-center leading-tight break-words w-full">{currentWord.ko}</h2>
                          <p className="text-slate-500 font-mono text-2xl mb-6 bg-slate-100 px-5 py-1.5 rounded-full font-bold">{currentWord.pro}</p>
                          {/* 正面非測驗模式，仍給播放按鈕 */}
                          {!isAlphabetLearnMode && (
                            <button onClick={(e) => speak(currentWord.ko, e)} className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 hover:scale-105 transition-all active:scale-95 group shrink-0 shadow-sm">
                              <Play className="w-8 h-8 fill-current translate-x-1 group-hover:text-indigo-700" />
                            </button>
                          )}
                        </div>
                      </div>
                  )}
                </div>

                {/* 背面 (無捲軸緊湊排版) */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-800 shadow-2xl rounded-[2.5rem] flex flex-col p-5 md:p-6 text-white" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex flex-col mb-3 border-b border-white/20 pb-3 shrink-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">{currentWord.ko}</h3>
                        {hasSentence && (
                          <button onClick={(e) => speak(currentWord.ko, e)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors active:scale-95 shadow-sm">
                            <Volume2 className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </div>
                      <p className="text-indigo-200 text-lg font-mono mb-2">{currentWord.pro}</p>
                      <h4 className="text-2xl font-bold text-amber-300 drop-shadow-sm">{currentWord.zh}</h4>
                    </div>
                    
                    {currentWord.memoryHook && (
                      <div className="bg-white/10 rounded-xl p-3 mb-3 border border-white/20 shadow-inner shrink-0">
                        <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1 font-bold flex items-center gap-2">💡 意象化拆解</p>
                        <p className="text-sm md:text-base leading-relaxed font-medium">{currentWord.memoryHook}</p>
                      </div>
                    )}
                    {currentWord.ex && (
                      <div className="space-y-2 shrink-0 pb-2">
                        <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold">例句</p>
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                          <div className="flex-1">
                            <p className="text-base md:text-lg font-bold leading-snug mb-1">{currentWord.ex}</p>
                            <p className="text-xs text-indigo-200/90 font-medium">{currentWord.exZh}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 底部控制列：測驗模式顯示 SRS，非測驗模式顯示極簡播放與翻頁 */}
                  <div className="pt-2 border-t border-white/20 shrink-0">
                    {isQuizMode ? (
                      <div className="grid grid-cols-5 gap-2">
                        <button onClick={(e) => handleSRS('again', e)} className="bg-red-500 hover:bg-red-600 text-white py-2 md:py-3 rounded-xl flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all">
                          <span className="font-black text-sm md:text-base">AGAIN</span>
                        </button>
                        <button onClick={(e) => handleSRS('hard', e)} className="bg-orange-500 hover:bg-orange-600 text-white py-2 md:py-3 rounded-xl flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all">
                          <span className="font-black text-sm md:text-base">HARD</span>
                        </button>
                        
                        {/* 中央的大喇叭按鈕：若無例句負責唸單字，有例句負責唸例句 */}
                        <button onClick={(e) => speak(hasSentence ? currentWord.ex : currentWord.ko, e)} className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 md:py-3 rounded-xl flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all">
                          <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        <button onClick={(e) => handleSRS('good', e)} className="bg-green-500 hover:bg-green-600 text-white py-2 md:py-3 rounded-xl flex flex-col items-center justify-center shadow-sm active:scale-95 transition-all">
                          <span className="font-black text-sm md:text-base">GOOD</span>
                        </button>
                        {/* 防呆機制：答錯過這題就不能按 EASY */}
                        <button 
                          onClick={(e) => handleSRS('easy', e)} 
                          disabled={isQuizMode && quizMistakes[currentWord.ko]}
                          className={`py-2 md:py-3 rounded-xl flex flex-col items-center justify-center shadow-sm transition-all ${isQuizMode && quizMistakes[currentWord.ko] ? 'bg-slate-400 text-slate-200 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-95'}`}
                        >
                          <span className="font-black text-sm md:text-base">EASY</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-4">
                        <button onClick={(e) => { e.stopPropagation(); prevCard(); }} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
                        <button onClick={(e) => speak(hasSentence ? currentWord.ex : currentWord.ko, e)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 md:py-3 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                          <Volume2 className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                          <span className="font-black text-sm md:text-base">發音</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); nextCard(); }} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all active:scale-95"><ChevronRight className="w-6 h-6" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 正面專用的左右翻轉與提示 */}
            {!quizFinished && !isQuizMode && !isAlphabetLearnMode && (
              <div className={`flex items-center justify-between mt-5 px-2 transition-opacity duration-300 w-full max-w-md ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <button onClick={prevCard} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100 active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
                <p className="text-slate-400 font-bold tracking-widest text-xs bg-slate-100 px-4 py-2 rounded-full">點擊卡片翻開看答案</p>
                <button onClick={nextCard} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100 active:scale-95"><ChevronRight className="w-6 h-6" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌟 2. 主畫面 (極簡排版) 🌟 */}
      {(view === 'home' || view === 'alphabet') && (
        <>
          <div className="w-full flex flex-col items-center pt-8 pb-4 cursor-pointer group select-none" onClick={() => changeView(view === 'alphabet' ? 'home' : 'alphabet')}>
             <Sparkles className="w-10 h-10 text-amber-400 mb-2 drop-shadow-sm group-hover:scale-110 transition-transform" />
             <div className="relative inline-block">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-800 group-hover:text-indigo-600 transition-colors">Korea Cards</h1>
                <span className="absolute -right-8 -top-3 text-[11px] md:text-xs font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full shadow-sm transform rotate-12">韓文</span>
             </div>
             <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-widest">( 點擊標題切換 基礎發音/首頁 )</p>
          </div>

          <main className="max-w-4xl mx-auto px-4 pb-12">
            {view === 'home' && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-full max-w-md mx-auto mb-6">
                   <h3 className="text-sm font-black text-slate-500 mb-3 flex items-center gap-2 px-2">
                     <BookOpen className="w-4 h-4 text-indigo-500"/> 核心題庫測驗
                   </h3>
                   <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x px-2">
                     {BUILTIN_DECKS.map((deck, idx) => (
                       <div key={idx} className="shrink-0 w-32 snap-center flex flex-col gap-2">
                         <button onClick={() => startLearnMode(deck.words, 0, deck.title, 'home')} className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all active:scale-95 w-full h-28">
                           <span className="text-4xl mb-1">{deck.icon}</span>
                           <span className="font-black text-slate-700 text-sm text-center leading-tight">{deck.title}</span>
                         </button>
                         {/* 首頁測驗按鈕 */}
                         <div className="relative w-full">
                           <button onClick={() => setShowQuizMenu(showQuizMenu === `deck_${idx}` ? null : `deck_${idx}`)} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 py-1.5 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all shadow-sm">
                             📝 測驗 ({deck.words.length})
                           </button>
                           {showQuizMenu === `deck_${idx}` && (
                              <div className="absolute right-0 top-8 w-28 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 z-20 flex flex-col gap-1">
                                {getQuizOptions(deck.words.length).map(n => (
                                  <button key={n} onClick={() => startQuizFlow(deck.words, n, 'words', deck.title, 'home')} className="text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 py-2 rounded-lg transition-colors">隨機 {n} 題</button>
                                ))}
                              </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="w-full max-w-md mx-auto mb-8 px-2">
                   <h3 className="text-sm font-black text-slate-500 mb-3 flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-indigo-500"/> AI 單字生成
                   </h3>
                   <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-200">
                     <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-3">
                       <button onClick={() => setInputMode('topic')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${inputMode === 'topic' ? 'bg-white text-indigo-600 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>🎯 擴充主題</button>
                       <button onClick={() => setInputMode('words')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${inputMode === 'words' ? 'bg-white text-indigo-600 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>✍️ 指定單字</button>
                     </div>
                     <div className="flex gap-2">
                       <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateWords()} placeholder={inputMode === 'topic' ? "輸入主題 (如: 咖啡廳)" : "中英韓皆可 (如: 蘋果)"} className="flex-1 bg-slate-50 px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                       <button onClick={generateWords} disabled={loading} className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center justify-center">
                         {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "生成"}
                       </button>
                     </div>
                   </div>
                   {errorMsg && <p className="text-red-500 text-xs font-bold mt-2 ml-2">{errorMsg}</p>}
                </div>
              </div>
            )}

            {view === 'alphabet' && (
              <div className="max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-8 text-center px-4">
                  <p className="text-slate-500 text-sm md:text-base leading-relaxed font-bold">點擊卡片學習發音，右側測驗建立直覺！</p>
                </div>

                {/* 動態渲染發音分類 */}
                {ALPHABET_DATA.map((section, sIdx) => (
                  <div key={section.id} className="mb-12">
                    <div className="flex justify-between items-center mb-4 border-b-4 border-slate-100 pb-2 px-2">
                      <h3 className="text-lg md:text-xl font-black text-slate-700 flex flex-wrap items-center gap-2">
                        <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-xs md:text-sm">{section.desc}</span> 
                        {section.title}
                        {section.note && <span className="text-[10px] md:text-xs text-slate-400 font-bold ml-2">※ {section.note}</span>}
                      </h3>
                      <div className="relative">
                         <button onClick={() => setShowQuizMenu(showQuizMenu === section.id ? null : section.id)} className="bg-white border-2 border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs md:text-sm font-black hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm">
                           📝 測驗
                         </button>
                         {showQuizMenu === section.id && (
                            <div className="absolute right-0 top-10 w-28 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 z-20 flex flex-col gap-1">
                              {getQuizOptions(section.data.length).map(n => (
                                <button key={n} onClick={() => startQuizFlow(section.data, n, section.id, `${section.title}測驗`, 'alphabet')} className="text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 py-2 rounded-lg transition-colors">隨機 {n} 題</button>
                              ))}
                            </div>
                         )}
                      </div>
                    </div>
                    
                    {/* 針對 140音 特別設計子音選擇器 */}
                    {section.id === 'combos' ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-2 mx-2">
                        <p className="text-xs font-bold text-slate-400 mb-2 text-center">選擇子音過濾</p>
                        <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-3 px-1 mb-2">
                          {HANGUL_BASIC.consonants.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() => setComboFilterIdx(idx)}
                              className={`shrink-0 w-12 h-12 rounded-xl font-black text-lg transition-all ${comboFilterIdx === idx ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}
                            >
                              {c.ko}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {section.data.slice(comboFilterIdx * 10, comboFilterIdx * 10 + 10).map((item, i) => (
                            <div 
                              key={i} 
                              onClick={() => startLearnMode(section.data, comboFilterIdx * 10 + i, section.title, 'alphabet')} 
                              className="cursor-pointer min-h-[6rem] bg-white rounded-3xl border-2 border-slate-200 hover:border-indigo-400 transition-all duration-300 p-3 flex flex-col justify-center items-center shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95"
                            >
                              <span className="text-3xl font-black text-slate-800 mb-1">{item.ko}</span>
                              <div className="flex gap-1.5 mt-1">
                                <span className="text-[10px] md:text-xs font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{item.pro}</span>
                                <span className="text-[10px] md:text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{item.bpmf}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-2">
                        {section.data.map((item, i) => (
                          <div 
                            key={i} 
                            onClick={() => startLearnMode(section.data, i, section.title, 'alphabet')} 
                            className="cursor-pointer min-h-[6rem] bg-white rounded-3xl border-2 border-slate-200 hover:border-indigo-400 transition-all duration-300 p-3 flex flex-col justify-center items-center shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95"
                          >
                            <span className="text-3xl font-black text-slate-800 mb-1">{item.ko}</span>
                            <div className="flex gap-1.5 mt-1">
                              <span className="text-[10px] md:text-xs font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{item.pro}</span>
                              <span className="text-[10px] md:text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{item.bpmf}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="w-full text-center mt-12 pb-6 text-sm font-black tracking-widest text-slate-400">
               forJC byKC <span className="opacity-80 ml-1 text-indigo-400">v1.10</span>
            </div>
          </main>
        </>
      )}

    </div>
  );
}