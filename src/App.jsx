import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Play, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Library, GraduationCap, Loader2, RotateCcw, Type, Puzzle, Shuffle, Layers, RefreshCw, BookOpen } from 'lucide-react';

// ==========================================
// 韓文基礎發音資料 (依據 Vocus 教學順序與注音輔助)
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

// 組合機邏輯
const CHOSUNG_MAP = { "ㄱ": 0, "ㄲ": 1, "ㄴ": 2, "ㄷ": 3, "ㄸ": 4, "ㄹ": 5, "ㅁ": 6, "ㅂ": 7, "ㅃ": 8, "ㅅ": 9, "ㅆ": 10, "ㅇ": 11, "ㅈ": 12, "ㅉ": 13, "ㅊ": 14, "ㅋ": 15, "ㅌ": 16, "ㅍ": 17, "ㅎ": 18 };
const JUNGSUNG_MAP = { "ㅏ": 0, "ㅐ": 1, "ㅑ": 2, "ㅒ": 3, "ㅓ": 4, "ㅔ": 5, "ㅕ": 6, "ㅖ": 7, "ㅗ": 8, "ㅘ": 9, "ㅙ": 10, "ㅚ": 11, "ㅛ": 12, "ㅜ": 13, "ㅝ": 14, "ㅞ": 15, "ㅟ": 16, "ㅠ": 17, "ㅡ": 18, "ㅢ": 19, "ㅣ": 20 };
const combineHangul = (c, v) => {
  if (!c || !v) return "";
  return String.fromCharCode(44032 + (CHOSUNG_MAP[c] * 588) + (JUNGSUNG_MAP[v] * 28)); 
};
const generateAllCombos = () => {
  let combos = [];
  HANGUL_BASIC.consonants.forEach(c => {
    HANGUL_BASIC.vowels.forEach(v => {
      combos.push({
        ko: combineHangul(c.ko, v.ko),
        pro: c.pro.split('/')[0] + v.pro,
        bpmf: (c.bpmf.split('/')[0] === '無' ? '' : c.bpmf.split('/')[0]) + v.bpmf.split(' ')[0],
        c: c, v: v
      });
    });
  });
  return combos;
};

// ==========================================
// 內建十個單元資料庫 (資料壓縮引擎)
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
    ["아니요", "aniyo", "不是/不", "아니요, 괜찮아요.", "不，沒關係。", "發音像『阿尼喲』。", "person gently waving hand to say no"],
    ["괜찮아요", "gwaenchanayo", "沒關係", "저는 괜찮아요.", "我沒關係的。", "發音像『關槍哪喲』。", "person smiling and waving hands peacefully"],
    ["부탁합니다", "butakamnida", "拜託了", "잘 부탁합니다.", "請多指教/拜託了。", "漢字「付託」。交付託付。", "hands clasped together in a pleading gesture"],
    ["수고하셨습니다", "sugohasyeotseumnida", "辛苦了", "오늘도 수고하셨습니다.", "今天也辛苦了。", "漢字「受苦」。承受了苦勞。", "colleagues giving high fives after work"],
    ["환영합니다", "hwanyeonghamnida", "歡迎", "한국에 오신 것을 환영합니다.", "歡迎來到韓國。", "漢字「歡迎」。", "welcoming party with balloons and confetti"],
    ["축하합니다", "chukahamnida", "恭喜", "생일 축하합니다.", "祝你生日快樂。", "漢字「祝賀」。", "celebration with fireworks and cake"],
    ["여보세요", "yeoboseyo", "喂(打電話)", "여보세요, 누구세요?", "喂，請問是哪位？", "打電話專用語。發音像『唷波寫喲』", "person talking on a smartphone, cheerful"],
    ["잠깐만요", "jamkkanmanyo", "等一下", "잠깐만요, 기다려주세요.", "請稍等一下。", "發音像『醬甘慢喲』。一瞬間。", "hand gesture signaling to wait a moment"],
    ["만나서 반가워요", "mannaseo bangawoyo", "很高興見到你", "처음 뵙겠습니다. 만나서 반가워요.", "初次見面，很高興認識你。", "만나다(見面) + 반갑다(高興)。", "two people shaking hands enthusiastically"],
    ["안녕히 계세요", "annyeonghi gyeseyo", "再見(對留下的人說)", "저는 이만 갈게요. 안녕히 계세요.", "我先走了。請留步。", "계시다 意思是『存在/留著』。", "person waving goodbye while leaving a house"],
    ["안녕히 가세요", "annyeonghi gaseyo", "再見(對離開的人說)", "조심히 가세요. 안녕히 가세요.", "路上小心。慢走。", "가다 意思是『去/走』。", "person waving goodbye to someone walking away"],
    ["수고하세요", "sugohaseyo", "請加油/辛苦了(對還在工作的人說)", "먼저 갈게요, 수고하세요.", "我先走囉，請繼續加油。", "離開商店或辦公室時對店員/同事說。", "giving a supportive thumbs up to a worker"],
    ["잘 먹겠습니다", "jal meokgetseumnida", "我要開動了", "와, 맛있겠다! 잘 먹겠습니다.", "哇，看起來好好吃！我要開動了。", "먹다(吃)。意思是『我會好好吃的』。", "person holding chopsticks ready to eat delicious food"],
    ["잘 먹었습니다", "jal meogeotseumnida", "我吃飽了", "정말 잘 먹었습니다. 감사합니다.", "真的吃得很好。謝謝。", "過去式。意思是『我已經好好吃過了』。", "person patting their full stomach happily"],
    ["잘 자요", "jal jayo", "晚安(平語/親近)", "내일 봐, 잘 자요.", "明天見，晚安。", "자다(睡覺)。意思是『好好睡』。", "moon and stars, cozy bedroom night"],
    ["안녕히 주무세요", "annyeonghi jumuseyo", "晚安(敬語)", "부모님, 안녕히 주무세요.", "爸媽，晚安。", "주무시다 是 자다 的敬語。", "peaceful night sky with a sleeping moon"],
    ["오랜만이에요", "oraenmanieyo", "好久不見", "정말 오랜만이에요! 잘 지냈어요?", "真的好久不見！過得好嗎？", "오랜만 代表『很久』。", "two friends reuniting and hugging happily"],
    ["잘 지냈어요?", "jal jinaesseoyo?", "過得好嗎？", "요즘 어떻게 지내요? 잘 지냈어요?", "最近過得如何？過得好嗎？", "지내다 代表『度過/生活』。", "person looking warmly and asking a question"],
    ["이름이 뭐예요?", "ireumi mwoyeyo?", "你叫什麼名字？", "처음 뵙겠습니다. 이름이 뭐예요?", "初次見面。請問您叫什麼名字？", "이름(名字) + 뭐(什麼)。", "nametag sticker with a question mark"],
    ["몇 살이에요?", "myeot sarieyo?", "你幾歲？", "실례지만, 몇 살이에요?", "不好意思，請問你幾歲？", "몇(幾) + 살(歲)。", "birthday cake with question mark candles"],
    ["어디에서 왔어요?", "eodieseo wasseoyo?", "你來自哪裡？", "저는 대만에서 왔어요. 어디에서 왔어요?", "我來自台灣。你來自哪裡？", "어디(哪裡) + 오다(來)。", "world map with a location pin"]
  ]),
  buildDeck("常用動詞", "🏃", [
    ["가다", "gada", "去", "학교에 가다.", "去學校。", "發音『卡達』。卡達卡達走路去。", "person walking towards a building"],
    ["오다", "oda", "來", "집에 오다.", "來家裡(回家)。", "發音『歐達』。歐！你來啦！", "person arriving at a house door"],
    ["먹다", "meokda", "吃", "밥을 먹다.", "吃飯。", "發音『摸答』。摸摸肚子準備吃。", "person eating a bowl of rice"],
    ["마시다", "masida", "喝", "물을 마시다.", "喝水。", "發音『馬吸達』。馬在吸水(喝水)。", "person drinking a glass of water"],
    ["자다", "jada", "睡覺", "침대에서 자다.", "在床上睡覺。", "發音『擦達』。睡覺流口水要擦。", "person sleeping comfortably in bed"],
    ["일어나다", "ireonada", "起床/站起來", "아침에 일찍 일어나다.", "早上早起。", "일(事情) + 나다(發生)。事情發生了要起床處理。", "person stretching in the morning sun"],
    ["보다", "boda", "看", "영화를 보다.", "看電影。", "發音『波達』。看海浪波浪。", "person watching a movie screen"],
    ["듣다", "deutda", "聽", "음악을 듣다.", "聽音樂。", "發音『的達』。聽得懂。", "person listening to music with headphones"],
    ["말하다", "malhada", "說話", "한국어로 말하다.", "用韓文說話。", "말(話語) + 하다(做)。", "person talking with a speech bubble"],
    ["읽다", "ikda", "閱讀", "책을 읽다.", "看書。", "發音『伊達』。一頁一頁閱讀。", "person reading an open book"],
    ["쓰다", "sseuda", "寫/使用/苦", "편지를 쓰다.", "寫信。", "發音『嘶達』。寫字摩擦紙張嘶嘶聲。", "person writing a letter with a pen"],
    ["사다", "sada", "買", "옷을 사다.", "買衣服。", "發音『撒達』。花錢像撒錢一樣買。", "person carrying shopping bags"],
    ["하다", "hada", "做", "숙제를 하다.", "做作業。", "最萬用的動詞，加在名詞後變動詞。", "person actively doing a task at a desk"],
    ["일하다", "ilhada", "工作", "회사에서 일하다.", "在公司工作。", "일(工作) + 하다(做)。", "person working on a laptop at an office"],
    ["공부하다", "gongbuhada", "學習", "도서관에서 공부하다.", "在圖書館學習。", "漢字「工夫」。下工夫學習。", "student studying hard with books"],
    ["만나다", "mannada", "見面", "친구를 만나다.", "見朋友。", "發音『漫拿達』。漫步去拿東西順便見面。", "two friends meeting at a cafe"],
    ["놀다", "nolda", "玩耍", "공원에서 놀다.", "在公園玩。", "發音『弄達』。弄來弄去在玩。", "kids playing happily in a park"],
    ["쉬다", "swida", "休息", "집에서 쉬다.", "在家休息。", "發音『噓達』。噓！別吵我在休息。", "person relaxing on a sofa with eyes closed"],
    ["운동하다", "undonghada", "運動", "헬스장에서 운동하다.", "在健身房運動。", "漢字「運動」。", "person jogging in a gym"],
    ["좋아하다", "joahada", "喜歡", "사과를 좋아하다.", "喜歡蘋果。", "좋다(好) + 하다(做)。覺得好就是喜歡。", "person holding a heart shape, smiling"],
    ["싫어하다", "sireohada", "討厭", "벌레를 싫어하다.", "討厭蟲子。", "싫다(討厭的) + 하다(做)。", "person showing a disgusted face"],
    ["알다", "alda", "知道", "정답을 알다.", "知道答案。", "發音『哀達』。哎呀我知道了！", "person with a bright lightbulb over their head"],
    ["모르다", "moreuda", "不知道", "이유를 모르다.", "不知道理由。", "發音『摸路達』。在黑暗中摸路(不知道方向)。", "person shrugging shoulders looking confused"],
    ["걷다", "geotda", "走路", "거리를 걷다.", "在街上走。", "發音『勾達』。勾勾腳走路。", "person walking down a beautiful street"],
    ["기다리다", "gidarida", "等待", "버스를 기다리다.", "等公車。", "發音『祈達哩達』。祈禱公車快點達(到)哩。", "person waiting at a bus stop looking at a watch"]
  ]),
  buildDeck("核心形容詞", "✨", [
    ["크다", "keuda", "大", "집이 크다.", "房子很大。", "發音『可達』。大到可達天際。", "a very large house next to a small one"],
    ["작다", "jakda", "小", "가방이 작다.", "包包很小。", "發音『眨達』。小到眨眼就不見。", "a very small cute backpack"],
    ["많다", "manta", "多", "사람이 많다.", "人很多。", "發音『滿他』。滿出來的多。", "a crowded street full of people"],
    ["적다", "jeokda", "少", "돈이 적다.", "錢很少。", "發音『糾達』。揪心啊錢這麼少。", "a wallet with only one coin"],
    ["좋다", "jota", "好", "날씨가 좋다.", "天氣很好。", "發音『秋他』。秋天的天氣很好。", "a beautiful sunny day with clear skies"],
    ["나쁘다", "nappeuda", "壞/不好", "기분이 나쁘다.", "心情不好。", "發音『哪噗達』。哪裡噗(破)掉了，真壞。", "a sad person with a rain cloud over them"],
    ["비싸다", "bissada", "昂貴", "이 시계는 비싸다.", "這手錶很貴。", "비(雨) + 싸다(下)。像下雨一樣撒錢，因為很貴。", "a luxury golden watch with a high price tag"],
    ["싸다", "ssada", "便宜", "시장은 싸다.", "市場很便宜。", "發音『撒達』。便宜到像撒在地上賣。", "a busy traditional market with cheap goods"],
    ["덥다", "deopda", "熱", "여름은 덥다.", "夏天很熱。", "發音『抖達』。熱到發抖(中暑)。", "a person sweating under a hot sun"],
    ["춥다", "chupda", "冷", "겨울은 춥다.", "冬天很冷。", "發音『出達』。冷到不出門達。", "a person shivering in the snow with a scarf"],
    ["맛있다", "masitda", "好吃", "김치가 맛있다.", "泡菜很好吃。", "맛(味道) + 있다(有)。有味道=好吃。", "a delicious bowl of hot Korean food"],
    ["맛없다", "madeopda", "難吃", "이 음식은 맛없다.", "這食物很難吃。", "맛(味道) + 없다(沒有)。沒味道=難吃。", "a person looking at bad food with disgust"],
    ["재미있다", "jaemiitda", "有趣", "영화가 재미있다.", "電影很有趣。", "재미(趣味) + 있다(有)。", "people laughing out loud while watching a movie"],
    ["재미없다", "jaemieopda", "無聊", "수업이 재미없다.", "上課很無聊。", "재미(趣味) + 없다(沒有)。", "a person yawning out of boredom"],
    ["예쁘다", "yeppeuda", "漂亮", "꽃이 예쁘다.", "花很漂亮。", "發音『耶噗達』。漂亮到讓人耶呼！", "a beautiful blooming flower"],
    ["귀엽다", "gwiyeopda", "可愛", "강아지가 귀엽다.", "小狗很可愛。", "發音『鬼喲達』。可愛得像個小機靈鬼。", "a super cute fluffy puppy"],
    ["바쁘다", "bappeuda", "忙碌", "오늘 너무 바쁘다.", "今天非常忙。", "發音『八噗達』。忙到像八爪章魚噗噗喘氣。", "a person juggling many tasks at an office"],
    ["한가하다", "hangahada", "清閒", "주말에는 한가하다.", "週末很清閒。", "漢字「閒暇」。", "a person relaxing on a hammock doing nothing"],
    ["빠르다", "ppareuda", "快", "기차가 빠르다.", "火車很快。", "發音『巴勒達』。快到像巴雷特狙擊槍。", "a high speed train zooming past"],
    ["느리다", "neurida", "慢", "거북이가 느리다.", "烏龜很慢。", "發音『奴哩達』。像奴隸一樣慢慢拖。", "a cute slow turtle walking"],
    ["어렵다", "eoryeopda", "困難", "한국어가 어렵다.", "韓文很難。", "發音『偶溜達』。困難到偶(我)想溜達逃跑。", "a person looking confused at a complex math problem"],
    ["쉽다", "swipda", "容易", "이 문제는 쉽다.", "這個問題很容易。", "發音『噓達』。太容易了，噓，別說出來。", "a person easily completing a simple puzzle"],
    ["아프다", "apeuda", "痛/生病", "머리가 아프다.", "頭痛。", "發音『啊噗達』。啊！痛到噗哧叫。", "a person holding their head in pain"],
    ["피곤하다", "pigonhada", "疲倦", "일이 많아서 피곤하다.", "工作很多很累。", "漢字「疲困」。", "an exhausted person sleeping on their desk"],
    ["배고프다", "baegopeuda", "肚子餓", "아침을 안 먹어서 배고프다.", "沒吃早餐肚子餓。", "배(肚子) + 고프다(空/渴求)。", "a person looking hungrily at a picture of food"]
  ]),
  buildDeck("飲食與點餐", "🍔", [
    ["물", "mul", "水", "물 좀 주세요.", "請給我水。", "發音『木』。木頭也需要水。", "a clear glass of refreshing water"],
    ["밥", "bap", "飯", "밥을 먹다.", "吃飯。", "發音『帕』。吃飯怕燙。", "a steaming bowl of white rice"],
    ["김치", "gimchi", "泡菜", "김치가 매워요.", "泡菜很辣。", "發音『金七』。韓國國寶。", "a dish of spicy red Korean kimchi"],
    ["고기", "gogi", "肉", "고기를 구워 먹다.", "烤肉吃。", "發音『勾基』。肉的香味勾人。", "grilling thick slices of Korean BBQ meat"],
    ["커피", "keopi", "咖啡", "아이스 커피 한 잔 주세요.", "請給我一杯冰咖啡。", "外來語 Coffee。", "a cold glass of iced Americano"],
    ["차", "cha", "茶/車", "녹차를 마시다.", "喝綠茶。", "漢字「茶」。(也是車子的意思)", "a hot cup of green tea"],
    ["우유", "uyu", "牛奶", "우유를 마시다.", "喝牛奶。", "漢字「牛乳」。發音 Wu-yu。", "a fresh glass of white milk"],
    ["식당", "sikdang", "餐廳", "식당에 가다.", "去餐廳。", "漢字「食堂」。", "a cozy Korean restaurant interior"],
    ["메뉴", "menyu", "菜單", "메뉴판 좀 주세요.", "請給我菜單。", "外來語 Menu。", "a person looking at a restaurant menu"],
    ["주문하다", "jumunhada", "點餐", "여기 주문할게요.", "這裡要點餐。", "漢字「注文」。交付訂單。", "person raising hand to order at a cafe"],
    ["맵다", "maepda", "辣", "이 떡볶이는 매워요.", "這辣炒年糕很辣。", "發音『妹達』。辣妹子。", "spicy red food with fire icon"],
    ["달다", "dalda", "甜", "케이크가 달아요.", "蛋糕很甜。", "發音『答達』。甜到心裡答答響。", "a sweet delicious slice of strawberry cake"],
    ["짜다", "jjada", "鹹", "국이 너무 짜요.", "湯太鹹了。", "發音『加達』。鹽加太多所以鹹。", "a bowl of salty soup"],
    ["시다", "sida", "苦/酸", "레몬이 셔요.", "檸檬很酸。", "發音『吸達』。酸到吸口水。", "a person eating a sour lemon"],
    ["음식", "eumsik", "食物", "한국 음식", "韓國食物。", "漢字「飮食」。", "a table full of various Korean dishes"]
  ]),
  buildDeck("交通旅遊", "🚌", [
    ["버스", "beoseu", "公車", "버스를 타다.", "搭公車。", "外來語 Bus。", "a modern city bus driving on the street"],
    ["지하철", "jihacheol", "地鐵", "지하철역이 어디예요?", "地鐵站在哪裡？", "漢字「地下鐵」。", "a fast subway train arriving at a station"],
    ["택시", "taeksi", "計程車", "택시를 부르다.", "叫計程車。", "外來語 Taxi。", "a typical Korean city taxi"],
    ["비행기", "bihaenggi", "飛機", "비행기를 타고 한국에 가다.", "搭飛機去韓國。", "漢字「飛行機」。", "an airplane flying high in the sky"],
    ["기차", "gicha", "火車", "기차표를 예매하다.", "預訂火車票。", "漢字「汽車」。(韓國火車叫汽車)", "a traditional train traveling through mountains"],
    ["역", "yeok", "車站", "서울역", "首爾站。", "漢字「驛」。", "a large modern train station building"],
    ["공항", "gonghang", "機場", "인천공항", "仁川機場。", "漢字「空港」。", "a bustling international airport terminal"],
    ["타다", "tada", "搭乘", "버스를 타다.", "搭公車。", "發音『他達』。他達成(搭乘)目標了。", "person getting onto a city bus"],
    ["내리다", "naerida", "下車", "다음 역에서 내리다.", "在下一站下車。", "發音『內哩達』。內裡的人要下車。", "person stepping off a train"],
    ["갈아타다", "garatada", "轉車", "2호선으로 갈아타세요.", "請轉乘2號線。", "갈다(換) + 타다(搭乘)。", "person changing trains at a subway platform"],
    ["지도", "jido", "地圖", "지도를 보다.", "看地圖。", "漢字「地圖」。", "a person looking at a map app on a smartphone"],
    ["오른쪽", "oreunjjok", "右邊", "오른쪽으로 가세요.", "請往右走。", "오른(對的) + 쪽(邊)。右邊是對的。", "an arrow pointing to the right"],
    ["왼쪽", "oenjjok", "左邊", "왼쪽으로 가세요.", "請往左走。", "왼(偏的) + 쪽(邊)。", "an arrow pointing to the left"],
    ["직진하다", "jikjinhada", "直走", "앞으로 직진하세요.", "請往前直走。", "漢字「直進」。", "an arrow pointing straight ahead"],
    ["호텔", "hotel", "飯店", "호텔을 예약하다.", "預訂飯店。", "外來語 Hotel。", "a luxury hotel building with an entrance"]
  ]),
  buildDeck("購物金錢", "🛒", [
    ["돈", "don", "錢", "돈이 없다.", "沒有錢。", "發音『洞』。把錢塞進無底洞。", "a stack of cash and coins"],
    ["얼마예요?", "eolmayeyo?", "多少錢？", "이거 얼마예요?", "這個多少錢？", "얼마(多少) + 예요(是)。", "a price tag with a question mark"],
    ["비싸요", "bissayo", "很貴", "너무 비싸요.", "太貴了。", "비싸다 的敬語形式。", "a luxury bag with a very high price tag"],
    ["깎아주세요", "kkakkajuseyo", "請算便宜一點", "조금만 깎아주세요.", "請算便宜一點點。", "깎다(削/剪/砍價) + 주세요(請給我)。", "person politely bargaining at a market"],
    ["현금", "hyeongeum", "現金", "현금으로 계산할게요.", "用現金結帳。", "漢字「現金」。", "handing over cash to a cashier"],
    ["카드", "kadeu", "信用卡", "카드 되나요?", "可以刷卡嗎？", "外來語 Card。", "swiping a credit card at a payment terminal"],
    ["영수증", "yeongsujeung", "收據", "영수증 주세요.", "請給我收據。", "漢字「領收證」。", "a printed receipt from a cash register"],
    ["봉투", "bongtu", "塑膠袋/袋子", "봉투 필요하세요?", "需要袋子嗎？", "漢字「封套」。", "a paper shopping bag"],
    ["옷", "ot", "衣服", "옷을 입다.", "穿衣服。", "發音『喔』。喔這衣服真好看。", "a rack of stylish clothes"],
    ["바지", "baji", "褲子", "바지를 사다.", "買褲子。", "發音『怕幾』。褲子怕擠。", "a pair of blue jeans"],
    ["치마", "chima", "裙子", "치마가 예뻐요.", "裙子很漂亮。", "發音『七馬』。", "a pretty floral skirt"],
    ["신발", "sinbal", "鞋子", "신발을 신다.", "穿鞋子。", "發音『新把』。新買的鞋子。", "a pair of trendy sneakers"],
    ["사이즈", "sijeu", "尺寸", "사이즈가 어떻게 되세요?", "請問尺寸是多少？", "外來語 Size。", "a clothing tag showing size M"],
    ["교환", "gyohwan", "更換", "이거 교환해 주세요.", "請幫我換這個。", "漢字「交換」。", "exchanging an item at a store counter"],
    ["환불", "hwanbul", "退款", "환불해 주세요.", "請幫我退款。", "漢字「還拂」。退還錢財。", "getting money back from a store"]
  ]),
  buildDeck("時間天氣", "⏰", [
    ["지금", "jigeum", "現在", "지금 몇 시예요?", "現在幾點？", "漢字「只今」。", "a clock showing the current time"],
    ["오늘", "oneul", "今天", "오늘은 월요일이에요.", "今天是星期一。", "發音『喔努』。喔努力過今天。", "a calendar with today's date highlighted"],
    ["내일", "naeil", "明天", "내일 봐요.", "明天見。", "漢字「來日」。", "an arrow pointing to tomorrow on a calendar"],
    ["어제", "eoje", "昨天", "어제 뭐 했어요?", "昨天做了什麼？", "發音『喔街』。喔昨天逛街。", "an arrow pointing backwards on a calendar"],
    ["시간", "sigan", "時間", "시간이 없어요.", "沒有時間。", "漢字「時間」。", "an hourglass running out of sand"],
    ["시", "si", "點(時間)", "오후 두 시", "下午兩點。", "漢字「時」。", "a wall clock pointing to exactly two o'clock"],
    ["분", "bun", "分", "삼십 분", "三十分。", "漢字「分」。", "a digital watch showing exactly thirty minutes"],
    ["날씨", "nalssi", "天氣", "오늘 날씨가 좋아요.", "今天天氣很好。", "날(日子) + 씨(氣候)。", "a sun and a cloud symbol"],
    ["비", "bi", "雨", "비가 와요.", "下雨了。", "發音『披』。下雨要披雨衣。", "raindrops falling from a dark cloud"],
    ["눈", "nun", "雪/眼睛", "눈이 내려요.", "下雪了。", "發音『嫩』。雪很嫩。", "beautiful snowflakes falling"],
    ["바람", "baram", "風", "바람이 불어요.", "吹風了。", "發音『怕郎』。怕風把郎(人)吹走。", "wind blowing leaves through the air"],
    ["맑다", "makda", "晴朗", "하늘이 맑아요.", "天空很晴朗。", "發音『馬達』。馬達跑得快因為晴天。", "a bright clear blue sky with sunshine"],
    ["흐리다", "heurida", "陰天", "날씨가 흐려요.", "天氣陰陰的。", "發音『喝哩達』。陰天想喝哩(喝飲料)。", "gray overcast sky with thick clouds"],
    ["봄", "bom", "春天", "봄이 왔어요.", "春天來了。", "發音『蹦』。春天萬物蹦出來。", "cherry blossoms blooming in spring"],
    ["여름", "yeoreum", "夏天", "여름은 더워요.", "夏天很熱。", "發音『有潤』。夏天有潤滑(流汗)。", "a bright sun shining on a beach"]
  ]),
  buildDeck("職場日常", "💼", [
    ["회사", "hoesa", "公司", "회사에 가다.", "去公司。", "漢字「會社」。", "a tall modern office building"],
    ["일", "il", "工作/事情/一", "일이 많아요.", "工作很多。", "發音『一』。每天都要做一堆工作。", "a desk full of paperwork and a laptop"],
    ["회의", "hoeui", "會議", "지금 회의 중이에요.", "現在正在開會。", "漢字「會議」。", "people sitting around a table in a meeting"],
    ["출근하다", "chulgeunhada", "上班", "아침 9시에 출근해요.", "早上9點上班。", "漢字「出勤」。", "person walking into an office building"],
    ["퇴근하다", "toegeunhada", "下班", "6시에 퇴근해요.", "6點下班。", "漢字「退勤」。", "person happily leaving the office building"],
    ["사장님", "sajangnim", "老闆", "사장님이 오셨어요.", "老闆來了。", "漢字「社長」+ 님(尊稱)。", "a confident boss standing in front of a desk"],
    ["부장님", "bujangnim", "部長/經理", "부장님께 보고하세요.", "請向經理報告。", "漢字「部長」。", "a manager reviewing a document"],
    ["직원", "jigwon", "員工", "우리 회사 직원.", "我們公司的員工。", "漢字「職員」。", "a group of employees working together"],
    ["명함", "myeongham", "名片", "명함 한 장 주시겠어요?", "請給我一張名片。", "漢字「名銜」。", "two hands exchanging a business card"],
    ["컴퓨터", "keompyuteo", "電腦", "컴퓨터가 고장 났어요.", "電腦壞了。", "外來語 Computer。", "a modern desktop computer set up"],
    ["복사기", "boksagi", "影印機", "복사기를 사용하다.", "使用影印機。", "漢字「複寫機」。", "an office photocopier printing documents"],
    ["휴가", "hyuga", "休假", "여름 휴가를 가다.", "去放暑假。", "漢字「休假」。", "a person relaxing on a beach chair"],
    ["월급", "wolgeup", "月薪", "월급날이에요.", "今天是發薪日。", "漢字「月給」。", "an envelope with money and a calendar"],
    ["면접", "myeonjeop", "面試", "면접을 보다.", "去面試。", "漢字「面接」。", "a job interview with two people talking"],
    ["회식", "hoesik", "聚餐", "오늘 저녁에 회식이 있어요.", "今天晚上有聚餐。", "漢字「會食」。", "coworkers clinking glasses at a dinner party"]
  ]),
  buildDeck("情緒身體", "❤️", [
    ["사랑하다", "saranghada", "愛", "널 사랑해.", "我愛你。", "發音『撒郎』。撒嬌的郎。", "two hands making a heart shape"],
    ["기쁘다", "gippeuda", "高興", "선물을 받아서 기뻐요.", "收到禮物很高興。", "發音『機噗達』。高興得機噗叫。", "a person jumping with joy"],
    ["슬프다", "seulpeuda", "悲傷", "영화가 너무 슬퍼요.", "電影太悲傷了。", "發音『瑟噗達』。悲傷得瑟瑟發抖。", "a person crying with a tear on their cheek"],
    ["화나다", "hwanada", "生氣", "지금 정말 화가 나요.", "現在真的很生氣。", "화(火) + 나다(發出)。發火。", "a person with a red face blowing steam"],
    ["행복하다", "haengbokhada", "幸福", "우리 가족은 행복해요.", "我們家很幸福。", "漢字「幸福」。", "a happy family smiling together"],
    ["머리", "meori", "頭/頭髮", "머리가 아파요.", "頭痛。", "發音『摸哩』。摸哩(你)的頭。", "a person pointing to their head"],
    ["눈", "nun", "眼睛", "눈이 커요.", "眼睛很大。", "與『雪』同音。", "beautiful bright human eyes"],
    ["코", "ko", "鼻子", "코가 높아요.", "鼻子挺。", "發音『扣』。摳鼻子。", "a profile view of a human nose"],
    ["입", "ip", "嘴巴", "입을 벌리세요.", "請張開嘴巴。", "發音『衣』。一的嘴型。", "a mouth slightly open"],
    ["귀", "gwi", "耳朵", "귀가 아파요.", "耳朵痛。", "發音『鬼』。鬼咬耳朵。", "a human ear listening"],
    ["손", "son", "手", "손을 씻으세요.", "請洗手。", "發音『松』。鬆開手。", "two clean hands washing with soap"],
    ["발", "bal", "腳", "발이 커요.", "腳很大。", "發音『拔』。拔腿就跑。", "a person's feet in comfortable shoes"],
    ["배", "bae", "肚子/船/梨", "배가 고파요.", "肚子餓。", "發音『胚』。", "a person holding their stomach"],
    ["아프다", "apeuda", "痛/生病", "어디가 아프세요?", "哪裡不舒服？", "啊！噗(吐血)。", "a sick person in bed with a thermometer"],
    ["약", "yak", "藥", "약을 먹다.", "吃藥。", "漢字「藥」。發音 Ya。", "a blister pack of medical pills"]
  ]),
  buildDeck("連接詞等", "🔗", [
    ["그리고", "geurigo", "還有/然後", "사과 그리고 바나나", "蘋果還有香蕉。", "發音『可哩勾』。", "two items connected by a plus sign"],
    ["그래서", "geuraeseo", "所以", "비가 와요. 그래서 집에 있어요.", "下雨了。所以我待在家。", "發音『可雷搜』。", "an arrow pointing to a logical conclusion"],
    ["그러면", "geureomyeon", "那麼/既然那樣", "그러면 내일 봐요.", "那麼明天見。", "發音『可樓勉』。", "person looking thoughtful deciding next steps"],
    ["하지만", "hajiman", "但是(轉折)", "비싸요. 하지만 예뻐요.", "很貴。但是很漂亮。", "發音『哈基滿』。哈，基滿(即使滿了)但是...", "a split path showing two different directions"],
    ["그런데", "geureonde", "不過/但是(話題轉換)", "그런데 밥은 먹었어요?", "不過，你吃飯了嗎？", "常縮寫成 근대(但)。", "a person raising a finger to make a new point"],
    ["진짜", "jinjja", "真的", "이거 진짜 맛있어요.", "這個真的很好吃。", "漢字「真」。常常用在口語。", "a shiny gold star for something genuine"],
    ["정말", "jeongmal", "真的(稍微正式)", "정말 감사합니다.", "真的非常感謝。", "漢字「正言(말)」。", "two hands shaking sincerely"],
    ["너무", "neomu", "非常/太...", "너무 비싸요.", "太貴了。", "發音『No母』。多到No母(老母)都不認得。", "a thermometer bursting from extreme heat"],
    ["아주", "aju", "非常", "아주 좋아요.", "非常好。", "發音『阿珠』。阿珠媽非常厲害。", "a bright shining sun meaning very good"],
    ["빨리", "ppalli", "快點", "빨리 오세요!", "快點過來！", "韓國人最愛說的詞！886~", "a stopwatch with speed lines"],
    ["천천히", "cheoncheonhi", "慢慢地", "천천히 말씀해 주세요.", "請慢慢說。", "發音『沖衝吸』。", "a slow moving cute snail"],
    ["많이", "mani", "多地", "많이 드세요.", "請多吃點。", "많다(多) 的副詞。", "a big pile of delicious food"],
    ["조금", "jogeum", "一點點", "조금만 주세요.", "請給我一點點。", "發音『糾根』。只給一根。", "a tiny drop of water"],
    ["자주", "jaju", "經常", "자주 만나요.", "我們經常見面吧。", "發音『掐珠』。經常掐珠。", "a calendar with many marked dates"],
    ["가끔", "gakkeum", "偶爾", "가끔 영화를 봐요.", "偶爾看電影。", "發音『卡肯』。偶爾卡住肯(啃)。", "a calendar with only one marked date"]
  ])
];

// ==========================================
// 1. Firebase 初始化 (雙環境智慧切換)
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

export default function App() {
  // 動態注入 Tailwind CSS
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // ==========================================
  // 2. 狀態管理
  // ==========================================
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(''); 
  const [view, setView] = useState('learn'); // 預設改回學習區
  const [activeLetter, setActiveLetter] = useState(null); 
  
  // 將預設單字設為內建單元 1 的內容
  const [words, setWords] = useState(BUILTIN_DECKS[0].words);
  const [savedWords, setSavedWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [topic, setTopic] = useState('自訂主題輸入...'); // AI 擴充用
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
  // 3. 雲端連線 (Firebase Auth)
  // ==========================================
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        setAuthError('');
        if (isCanvasEnv && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
           setAuthError("⚠️ 儲存功能已暫停：請至您的 Firebase Console > Authentication > Sign-in method，啟用「匿名登入 (Anonymous)」！");
        }
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
  }, [user]);

  // ==========================================
  // 4. 功能函式 (AI 擴充、載入內建單元、語音、翻卡)
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
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!response.ok) throw new Error("API 請求失敗");
      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const newWords = JSON.parse(textContent);
      setWords(newWords);
      setCurrentIndex(0);
      setIsFlipped(false);
      setView('learn');
    } catch (err) {
      setErrorMsg("生成失敗，可能是尚未部署 Vercel 後端 API。");
    } finally {
      setLoading(false);
    }
  };

  // 載入內建單元
  const loadBuiltinDeck = (deck) => {
    setWords(deck.words);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; 
    utterance.rate = 0.85;    
    window.speechSynthesis.speak(utterance);
  };

  const nextCard = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((p) => (p + 1) % words.length), 150); };
  const prevCard = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((p) => (p - 1 + words.length) % words.length), 150); };
  const nextCombo = () => { setComboFlipped(false); setTimeout(() => setComboIndex(p => (p + 1) % comboCards.length), 150); };
  const prevCombo = () => { setComboFlipped(false); setTimeout(() => setComboIndex(p => (p - 1 + comboCards.length) % comboCards.length), 150); };
  
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
    if (!user || !db) return;
    const wordId = word.ko; 
    const docRef = doc(db, 'artifacts', finalAppId, 'users', user.uid, 'saved_korean_words', wordId);
    try {
      const isSaved = savedWords.some(w => w.id === wordId);
      if (isSaved) await deleteDoc(docRef);
      else await setDoc(docRef, { ...word, savedAt: new Date().toISOString() });
    } catch (err) { console.error("儲存失敗:", err); }
  };

  const currentWord = words[currentIndex] || {};
  const isCurrentSaved = savedWords.some(w => w.id === currentWord.ko);
  const currentCombo = comboCards[comboIndex] || {};

  // ==========================================
  // 6. UI 渲染
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200">
      {/* 頂部導航列 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 text-indigo-600 shrink-0 mr-4">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">Killer Cards <span className="text-slate-400 text-base font-medium ml-1">韓文</span></h1>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl shrink-0">
            <button onClick={() => setView('learn')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-bold transition-colors ${view === 'learn' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}>
              <GraduationCap className="w-5 h-5" /> 學習區
            </button>
            <button onClick={() => setView('alphabet')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-bold transition-colors ${view === 'alphabet' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}>
              <Type className="w-5 h-5" /> 基礎發音
            </button>
            <button onClick={() => setView('vault')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-bold transition-colors ${view === 'vault' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}>
              <Library className="w-5 h-5" /> 單字庫
              {savedWords.length > 0 && <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-sm">{savedWords.length}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-24">

        {authError && (
          <div className="w-full bg-red-50 text-red-600 p-5 rounded-[1.5rem] border-2 border-red-200 mb-8 font-bold flex flex-col md:flex-row items-center md:items-start gap-4 shadow-sm">
            <span className="text-3xl shrink-0">🚨</span>
            <p className="leading-relaxed text-lg">{authError}</p>
          </div>
        )}
        
        {/* === 學習區 (內建單元 + AI 擴充) === */}
        {view === 'learn' && (
          <div className="flex flex-col items-center">
            
            {/* 1. 保留輸入單字擴充的位置 */}
            <div className="w-full max-w-lg bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 mb-6 flex gap-3">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="AI 擴充：輸入想學的冷門主題..." className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" onKeyDown={(e) => e.key === 'Enter' && generateWords()} />
              <button onClick={generateWords} disabled={loading} className="bg-indigo-600 text-white px-6 md:px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 flex items-center gap-2 whitespace-nowrap">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                {loading ? '生成中...' : <span className="hidden md:inline">AI 擴充</span>}
              </button>
            </div>
            {errorMsg && <p className="text-red-500 text-lg font-medium mb-4">{errorMsg}</p>}

            {/* 2. 🔥 新增：內建十個單元水平捲動列表 🔥 */}
            <div className="w-full max-w-lg mb-10">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="font-bold text-slate-600 flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-indigo-500"/> 核心題庫直接背
                </h3>
                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">左右滑動切換</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x px-2">
                {BUILTIN_DECKS.map((deck, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadBuiltinDeck(deck)}
                    className="shrink-0 w-36 bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all snap-center active:scale-95"
                  >
                    <span className="text-4xl mb-1">{deck.icon}</span>
                    <span className="font-bold text-slate-700 text-base text-center leading-tight">{deck.title}</span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{deck.words.length}字</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 巨集單字卡 */}
            {words.length > 0 && (
              <div className="w-full max-w-lg perspective-1000">
                <div className="relative w-full h-[70vh] max-h-[42rem] min-h-[36rem] transition-transform duration-500 ease-out cursor-pointer" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }} onClick={() => setIsFlipped(!isFlipped)}>
                  {/* 正面 */}
                  <div className="absolute inset-0 bg-white shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border-2 border-slate-100" style={{ backfaceVisibility: 'hidden' }}>
                    <div className="relative w-full h-[35%] min-h-[16rem] bg-slate-100 shrink-0">
                      {currentWord.imagePrompt && <img src={`https://image.pollinations.ai/prompt/${encodeURIComponent(currentWord.imagePrompt)}?width=800&height=600&nologo=true`} alt="AI generated" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                      <span className="absolute top-6 left-6 text-white font-bold tracking-widest text-lg uppercase drop-shadow-md">{currentIndex + 1} / {words.length}</span>
                      <button onClick={(e) => toggleSaveWord(currentWord, e)} className="absolute top-6 right-6 text-white hover:text-amber-400 transition-colors z-10 p-3 drop-shadow-md">
                        {isCurrentSaved ? <BookmarkCheck className="w-8 h-8 text-amber-400 fill-amber-400" /> : <Bookmark className="w-8 h-8" />}
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                      <h2 className="text-[4rem] md:text-[5rem] font-black text-slate-800 mb-4 tracking-tighter text-center leading-tight break-words w-full">{currentWord.ko}</h2>
                      <p className="text-slate-500 font-mono text-3xl mb-8 bg-slate-100 px-6 py-2 rounded-full font-bold">{currentWord.pro}</p>
                      <button onClick={(e) => speak(currentWord.ko, e)} className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 hover:scale-105 transition-all active:scale-95 group shrink-0 shadow-sm">
                        <Play className="w-10 h-10 fill-current translate-x-1 group-hover:text-indigo-700" />
                      </button>
                      <p className="absolute bottom-6 text-slate-400 text-lg font-medium flex items-center gap-2"><RotateCcw className="w-5 h-5" /> 點擊卡片翻面</p>
                    </div>
                  </div>
                  {/* 背面 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-800 shadow-2xl rounded-[2.5rem] flex flex-col p-10 text-white overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex flex-col mb-8 border-b border-white/20 pb-6">
                        <div className="flex flex-wrap items-end gap-3 mb-3">
                          <h3 className="text-5xl font-bold text-white leading-tight">{currentWord.ko}</h3>
                          <p className="text-indigo-200 text-2xl font-mono mb-1">{currentWord.pro}</p>
                        </div>
                        <h4 className="text-4xl font-bold text-amber-300 drop-shadow-sm">{currentWord.zh}</h4>
                      </div>
                      {currentWord.memoryHook && (
                        <div className="bg-white/10 rounded-2xl p-6 mb-8 border border-white/20 shadow-inner">
                          <p className="text-base text-indigo-200 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">💡 意象化拆解</p>
                          <p className="text-xl leading-relaxed font-medium">{currentWord.memoryHook}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <p className="text-indigo-200 text-base uppercase tracking-wider font-bold">例句</p>
                        <div className="flex items-start gap-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="flex-1">
                            <p className="text-2xl font-bold leading-relaxed mb-2">{currentWord.ex}</p>
                            <p className="text-lg text-indigo-200/90 font-medium">{currentWord.exZh}</p>
                          </div>
                          <button onClick={(e) => speak(currentWord.ex, e)} className="shrink-0 text-indigo-300 hover:text-white transition-colors bg-white/10 p-3 rounded-full"><Play className="w-6 h-6 fill-current" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-10 px-6">
                  <button onClick={prevCard} className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"><ChevronLeft className="w-10 h-10" /></button>
                  <p className="text-slate-400 font-bold tracking-widest text-lg">SWIPE / CLICK</p>
                  <button onClick={nextCard} className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"><ChevronRight className="w-10 h-10" /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === 韓文基礎發音區 === */}
        {view === 'alphabet' && (
          <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-black text-slate-800 mb-4">韓文字母基礎</h2>
              <p className="text-slate-500 text-lg leading-relaxed font-medium">依照方格子文章建議：先學母音、再學子音。搭配「注音」快速建立直覺！</p>
            </div>

            <div className="mb-16">
              <h3 className="text-2xl font-black text-amber-600 mb-6 flex items-center gap-3 border-b-4 border-amber-100 pb-3">
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl text-lg">10個</span> 基本母音 (모음)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {HANGUL_BASIC.vowels.map(item => (
                  <div 
                    key={item.ko} 
                    onClick={() => { setActiveLetter(activeLetter === item.ko ? null : item.ko); speak(item.name); }} 
                    className={`cursor-pointer min-h-[8rem] rounded-[1.5rem] border-2 transition-all duration-300 p-4 flex flex-col justify-center items-center shadow-sm ${activeLetter === item.ko ? 'border-amber-500 bg-amber-500 text-white scale-105 shadow-lg' : 'border-slate-200 bg-white hover:border-amber-400'}`}
                  >
                    {activeLetter === item.ko ? (
                      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
                        <span className="text-2xl font-black mb-2">{item.ko}</span>
                        <p className="text-sm font-medium leading-snug">{item.hook}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-5xl font-black text-slate-800 mb-3">{item.ko}</span>
                        <div className="flex gap-2">
                          <span className="text-sm font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{item.pro}</span>
                          <span className="text-sm font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">{item.bpmf}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-16">
              <h3 className="text-2xl font-black text-indigo-700 mb-6 flex flex-wrap items-center gap-3 border-b-4 border-indigo-100 pb-3">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-xl text-lg">14個</span> 
                基本子音 (자음) 
                <span className="text-base text-indigo-400 font-medium ml-auto">※ 語音搭配「ㅏ(a)」示範</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {HANGUL_BASIC.consonants.map(item => (
                  <div 
                    key={item.ko} 
                    onClick={() => { setActiveLetter(activeLetter === item.ko ? null : item.ko); speak(item.tts); }} 
                    className={`cursor-pointer min-h-[8rem] rounded-[1.5rem] border-2 transition-all duration-300 p-4 flex flex-col justify-center items-center shadow-sm ${activeLetter === item.ko ? 'border-indigo-500 bg-indigo-600 text-white scale-105 shadow-lg' : 'border-slate-200 bg-white hover:border-indigo-400'}`}
                  >
                    {activeLetter === item.ko ? (
                      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
                        <span className="text-2xl font-black mb-2">{item.ko}</span>
                        <p className="text-sm font-medium leading-snug">{item.hook.replace('象形：', '').split('。')[0]}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-5xl font-black text-slate-800 mb-3">{item.ko}</span>
                        <div className="flex gap-2">
                          <span className="text-sm font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{item.pro}</span>
                          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{item.bpmf}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-10">
              <div className="flex bg-slate-100 p-2 rounded-2xl max-w-md mx-auto mb-10">
                <button onClick={() => setAlphabetMode('flashcards')} className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${alphabetMode === 'flashcards' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Layers className="w-5 h-5" /> 140音字卡測驗
                </button>
                <button onClick={() => setAlphabetMode('manual')} className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${alphabetMode === 'manual' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Puzzle className="w-5 h-5" /> 組合機
                </button>
              </div>

              {alphabetMode === 'flashcards' && (
                <div className="flex flex-col items-center">
                  <div className="flex gap-4 mb-8">
                    <button onClick={shuffleCombos} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-indigo-100 transition-colors shadow-sm">
                      <Shuffle className="w-5 h-5" /> 打亂洗牌
                    </button>
                    <button onClick={resetCombos} className="flex items-center gap-2 bg-slate-50 text-slate-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
                      <RefreshCw className="w-5 h-5" /> 重置順序
                    </button>
                  </div>

                  <div className="w-full max-w-md perspective-1000 mb-10">
                    <div className="relative w-full h-[28rem] min-h-[400px] transition-transform duration-500 ease-out cursor-pointer" style={{ transformStyle: 'preserve-3d', transform: comboFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }} onClick={() => setComboFlipped(!comboFlipped)}>
                      <div className="absolute inset-0 bg-white shadow-2xl rounded-[3rem] flex flex-col items-center justify-center p-8 border-2 border-indigo-50" style={{ backfaceVisibility: 'hidden' }}>
                        <span className="absolute top-6 left-6 text-slate-300 font-bold tracking-widest text-lg">{comboIndex + 1} / {comboCards.length}</span>
                        <h2 className="text-[9rem] leading-none font-black text-slate-800 mb-4 drop-shadow-md">{currentCombo.ko}</h2>
                        <div className="flex gap-3 mb-8">
                          <span className="text-3xl font-mono text-slate-500 bg-slate-100 px-6 py-1.5 rounded-full font-bold">{currentCombo.pro}</span>
                          <span className="text-3xl font-bold text-indigo-600 bg-indigo-50 px-6 py-1.5 rounded-full">{currentCombo.bpmf}</span>
                        </div>
                        <button onClick={(e) => speak(currentCombo.ko, e)} className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-all hover:scale-105 active:scale-95 group shadow-sm">
                          <Play className="w-10 h-10 fill-current translate-x-1 group-hover:text-indigo-700" />
                        </button>
                        <p className="absolute bottom-6 text-slate-400 text-base font-medium flex items-center gap-2"><RotateCcw className="w-5 h-5" /> 點擊翻面解說</p>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-2xl rounded-[3rem] flex flex-col p-10 border-2 border-indigo-100 overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                          <p className="text-slate-500 font-bold mb-4 uppercase tracking-widest text-lg">對照與拼音</p>
                          <div className="flex flex-col items-center justify-center gap-4 mb-10 bg-white px-10 py-6 rounded-[2rem] shadow-md border border-indigo-50 w-full">
                            <span className="text-7xl font-black text-slate-800">{currentCombo.ko}</span>
                            <div className="flex gap-4 items-center w-full justify-center border-t border-slate-100 pt-4">
                              <span className="text-4xl font-bold text-indigo-600 font-mono">{currentCombo.pro}</span>
                              <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
                              <span className="text-4xl font-bold text-amber-500">{currentCombo.bpmf}</span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-white p-6 rounded-2xl shadow-sm text-left border border-indigo-50">
                            <p className="text-sm text-indigo-500 font-black uppercase tracking-wider mb-4 border-b-2 border-indigo-50 pb-2">字根拆解</p>
                            <div className="space-y-5">
                              <p className="text-xl text-slate-700 font-medium leading-relaxed">
                                <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg mr-3 shadow-sm">{currentCombo.c?.ko}</span> 
                                {currentCombo.c?.hook.split('。')[1]}
                              </p>
                              <p className="text-xl text-slate-700 font-medium leading-relaxed">
                                <span className="font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg mr-3 shadow-sm">{currentCombo.v?.ko}</span> 
                                {currentCombo.v?.hook.split('。')[0]}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full max-w-md px-4">
                    <button onClick={prevCombo} className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"><ChevronLeft className="w-10 h-10" /></button>
                    <button onClick={nextCombo} className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all bg-white shadow-sm border border-slate-100"><ChevronRight className="w-10 h-10" /></button>
                  </div>
                </div>
              )}

              {alphabetMode === 'manual' && (
                <div className="grid grid-cols-1 gap-12 items-center bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="flex flex-col items-center justify-center">
                    {selectedC && selectedV && (
                      <div className="flex flex-col items-center bg-white p-10 rounded-[3rem] shadow-xl border-4 border-indigo-50 w-full">
                        <div className="flex items-center gap-4 text-4xl font-black text-slate-300 mb-8">
                          <span className="text-indigo-500">{selectedC.ko}</span><span>+</span><span className="text-amber-500">{selectedV.ko}</span><span>=</span>
                        </div>
                        <span className="text-[10rem] leading-none font-black text-slate-800 mb-6 drop-shadow-md tracking-tighter">{combineHangul(selectedC.ko, selectedV.ko)}</span>
                        <div className="flex gap-4 mb-8">
                          <span className="text-4xl font-mono text-slate-500 bg-slate-100 px-6 py-2 rounded-full font-bold">{selectedC.pro.split('/')[0]}{selectedV.pro}</span>
                          <span className="text-4xl font-bold text-indigo-600 bg-indigo-50 px-6 py-2 rounded-full">{(selectedC.bpmf.split('/')[0] === '無' ? '' : selectedC.bpmf.split('/')[0]) + selectedV.bpmf.split(' ')[0]}</span>
                        </div>
                        <button onClick={() => speak(combineHangul(selectedC.ko, selectedV.ko))} className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-full font-black text-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                          <Play className="w-7 h-7 fill-current" /> 聽發音
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-black text-indigo-700 text-center text-lg uppercase tracking-wider mb-4 border-b-2 border-indigo-100 pb-2">1. 選擇子音</h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {HANGUL_BASIC.consonants.map(c => (
                          <button key={c.ko} onClick={() => setSelectedC(c)} className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl font-black text-2xl transition-all flex flex-col justify-center items-center gap-1 ${selectedC?.ko === c.ko ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}>
                            <span>{c.ko}</span>
                            <span className="text-[10px] font-normal opacity-80">{c.bpmf.split('/')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-black text-amber-600 text-center text-lg uppercase tracking-wider mb-4 border-b-2 border-amber-100 pb-2">2. 選擇母音</h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {HANGUL_BASIC.vowels.map(v => (
                          <button key={v.ko} onClick={() => setSelectedV(v)} className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl font-black text-2xl transition-all flex flex-col justify-center items-center gap-1 ${selectedV?.ko === v.ko ? 'bg-amber-500 text-white shadow-lg scale-110' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-amber-400 hover:text-amber-600'}`}>
                            <span>{v.ko}</span>
                            <span className="text-[10px] font-normal opacity-80">{v.bpmf.split(' ')[0]}</span>
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
                <p className="text-slate-500 font-bold text-xl mb-2">單字庫空空如也！</p>
                <button onClick={() => setView('learn')} className="mt-8 px-8 py-4 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-lg hover:bg-indigo-100 transition-colors shadow-sm">
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
                    <div key={word.id} className="grid grid-cols-2 p-6 items-center hover:bg-indigo-50/50 transition-colors group">
                      <div className="pr-6 border-r-2 border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl font-black text-slate-800">{word.ko}</span>
                          <button onClick={() => speak(word.ko)} className="text-indigo-400 hover:text-indigo-600 transition-colors bg-indigo-50 p-2 rounded-full"><Play className="w-5 h-5 fill-current" /></button>
                        </div>
                        <span className="text-lg text-slate-500 font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg">{word.pro}</span>
                      </div>
                      <div className="pl-6 relative flex items-center justify-between">
                        <span className="text-2xl font-bold text-slate-700">{word.zh}</span>
                        <button onClick={() => toggleSaveWord(word)} className="text-slate-300 hover:text-red-500 transition-colors p-3 bg-slate-50 rounded-full"><BookmarkCheck className="w-7 h-7 text-amber-500 hover:text-slate-300" /></button>
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