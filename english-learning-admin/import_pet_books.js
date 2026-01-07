
import mongoose from 'mongoose';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入模型
import Word from '../packages/common/models/Word.js';
import Book from '../packages/common/models/Book.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mongoURI = "mongodb://127.0.0.1:27017/test?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.5.9";
const DICT_PATH = path.join(__dirname, 'cam_dict.json');

const BOOKS_DATA = [
    {
        bookName: "PET 核心基础",
        edition: "Bridge to B1",
        publisher: "剑桥英语系列",
        description: "衔接 KET，巩固最常用的 B1 核心词，开启 B1 学习之旅。",
        keywords: [
            "ability", "active", "actually", "adventure", "afford", "although", "amount", "ancient", "announce", "anyway",
            "appearance", "appoint", "area", "arrange", "article", "asleep", "assistant", "attach", "attend", "attitude",
            "available", "average", "avoid", "awake", "baggage", "balance", "balloon", "basement", "battle", "beauty",
            "behave", "belief", "belong", "benefit", "better", "beyond", "billion", "biology", "birth", "blanket",
            "blind", "block", "board", "boil", "bomb", "border", "boring", "bottom", "brain", "brake",
            "branch", "brave", "breath", "bridge", "bright", "brilliant", "broad", "brush", "bucket", "building",
            "bullet", "bunch", "burn", "bush", "business", "button", "cabin", "cable", "calendar", "calm",
            "camera", "camp", "campaign", "canal", "cancel", "candidate", "capital", "capture", "careful", "careless",
            "carpenter", "carpet", "carrot", "carry", "castle", "casual", "catch", "category", "cattle", "cause",
            "caution", "cave", "celebrate", "cell", "cellar", "centigrade", "century", "ceremony", "certain", "certainly",
            "certificate", "chain", "challenge", "chamber", "champion", "championship", "channel", "chapter", "character", "characteristic",
            "charge", "charity", "charm", "charming", "chart", "chase", "chat", "cheap", "cheat", "check",
            "cheerful", "cheese", "chef", "chemical", "chemist", "chemistry", "cheque", "chess", "chest", "chew",
            "chicken", "chief", "childhood", "chimney", "chin", "chip", "chocolate", "choice", "choose", "chop",
            "church", "cigarette", "cinema", "circle", "circuit", "circumstance", "circus", "citizen", "city", "civil",
            "civilization", "claim", "clap", "clasp", "class", "classic", "classical", "classify", "classroom", "clay",
            "cleaner", "clear", "clearly", "clerk", "clever", "click", "client", "cliff", "climate", "climb",
            "clinic", "clock", "close", "closely", "cloth", "clothes", "cloud", "cloudy", "club", "clue",
            "coach", "coal", "coast", "coat", "code", "coffee", "coin", "cold", "collar", "colleague",
            "collect", "collection", "college", "colour", "column", "comb", "combination", "combine", "come", "comedy",
            "comfort", "comfortable", "command", "comment", "commercial", "commit", "committee", "common", "communicate", "communication",
            "community", "company", "compare", "comparison", "compete", "competition", "competitive", "complain", "complaint", "complete",
            "completely", "complex", "complicate", "component", "compose", "composition", "comprehensive", "computer", "concentrate", "concentration",
            "concept", "concern", "concerning", "concert", "conclude", "conclusion", "concrete", "condition", "conduct", "conference",
            "confidence", "confident", "confine", "confirm", "conflict", "confront", "confuse", "confusion", "congratulate", "congratulation",
            "connect", "connection", "conquer", "conscience", "conscious", "consequence", "consequently", "conservation", "conservative", "consider",
            "considerable", "consideration", "consist", "consistent", "constant", "constantly", "constitute", "construct", "construction", "consult",
            "consultant", "consume", "consumer", "consumption", "contact", "contain", "container", "contemporary", "content", "contest",
            "context", "continent", "continual", "continue", "continuous", "contract", "contrast", "contribute", "contribution", "control",
            "controversial", "controversy", "convenience", "convenient", "convention", "conventional", "conversation", "convert", "convey", "convict",
            "convince", "cook", "cooker", "cool", "cooperate", "cooperation", "coordinate", "cop", "cope", "copy",
            "core", "corn", "corner", "corporate", "corporation", "correct", "correction", "correspond", "correspondence", "correspondent",
            "corridor", "cost", "costume", "cottage", "cotton", "couch", "cough", "could", "council", "counsel",
            "count", "counter", "country", "countryside", "county", "couple", "courage", "course", "court", "cousin",
            "cover", "coverage", "cow", "crack", "craft", "crash", "crazy", "cream", "create", "creation",
            "creative", "creature", "credit", "crew", "crime", "criminal", "crisis", "criteria", "critic", "critical"
        ]
    },
    {
        bookName: "生活与社交实战",
        edition: "Daily Life & Social",
        publisher: "剑桥英语系列",
        description: "应对复杂的社会交往，涵盖情感、购物、旅游等高阶生活场景。",
        keywords: [
            "grateful", "anxious", "embarrassed", "guilty", "jealous", "complaint", "guarantee", "exchange", "receipt", "accommodation",
            "destination", "excursion", "hitchhike", "reservation", "souvenir", "apologize", "forgive", "persuade", "remind", "socialize",
            "argument", "behavior", "confidence", "dialogue", "experience", "friendship", "generous", "hospitality", "influence", "judgment",
            "kindness", "loyal", "membership", "notice", "opportunity", "pressure", "relationship", "support", "trust", "admire",
            "adore", "advice", "advise", "affection", "agree", "agreement", "allow", "amaze", "ambition", "amuse",
            "anger", "angry", "annoy", "answer", "anxiety", "appeal", "appear", "appetite", "appreciate", "approach",
            "approve", "argue", "arise", "arm", "arouse", "arrange", "arrest", "arrive", "arrival", "arrogant",
            "art", "article", "artificial", "artist", "ashamed", "aside", "ask", "asleep", "aspect", "assemble",
            "assembly", "assess", "asset", "assign", "assist", "assistance", "assistant", "associate", "association", "assume",
            "assumption", "assure", "astonish", "athlete", "atmosphere", "attach", "attachment", "attack", "attain", "attempt",
            "attend", "attendance", "attention", "attitude", "attract", "attraction", "attractive", "attribute", "audience", "author",
            "authority", "automatic", "available", "avenue", "average", "avoid", "awake", "award", "aware", "awareness",
            "away", "awful", "awkward", "baby", "back", "background", "backward", "bacon", "bad", "badly",
            "bag", "baggage", "bake", "balance", "ball", "balloon", "ban", "band", "bandage", "bang",
            "bank", "bankrupt", "bar", "bare", "barely", "bargain", "bark", "barrel", "barrier", "base",
            "baseball", "basic", "basically", "basin", "basis", "basket", "basketball", "bath", "bathe", "bathroom",
            "beach", "beam", "bean", "bear", "beard", "beast", "beat", "beautiful", "beauty", "because",
            "become", "bed", "bedroom", "bee", "beef", "beer", "before", "beg", "begin", "beginner",
            "beginning", "behave", "behavior", "behind", "being", "belief", "believe", "bell", "belong", "below",
            "belt", "bench", "bend", "beneath", "beneficial", "benefit", "beside", "besides", "best", "bet",
            "betray", "better", "between", "beyond", "bias", "bicycle", "bid", "big", "bike", "bill",
            "bind", "biography", "biology", "bird", "birth", "birthday", "biscuit", "bishop", "bit", "bite",
            "bitter", "black", "blade", "blame", "blank", "blanket", "blast", "blaze", "bleed", "blend",
            "bless", "blind", "blink", "block", "blood", "bloom", "blossom", "blouse", "blow", "blue",
            "blush", "board", "boast", "boat", "body", "boil", "bold", "bolt", "bomb", "bond",
            "bone", "book", "boom", "boot", "booth", "border", "bore", "born", "borrow", "bosom",
            "boss", "botany", "both", "bother", "bottle", "bottom", "bounce", "bound", "boundary", "bow",
            "bowl", "box", "boy", "brace", "brain", "brake", "branch", "brand", "brass", "brave",
            "breach", "bread", "breadth", "break", "breakfast", "breast", "breath", "breathe", "breed", "breeze",
            "brick", "bridge", "brief", "bright", "brilliant", "bring", "brisk", "bristle", "brittle", "broad"
        ]
    },
    {
        bookName: "学术与职场进阶",
        edition: "Study & Work",
        publisher: "剑桥英语系列",
        description: "处理学习环境和未来职场的表达，包含教育、媒体与科学词汇。",
        keywords: [
            "applicant", "colleague", "candidate", "executive", "occupation", "redundant", "vocational", "curriculum", "graduation", "presentation",
            "scholarship", "certificate", "pollution", "renewable", "global", "environment", "media", "broadcast", "broadband", "software",
            "analysis", "business", "conference", "department", "employee", "factory", "industry", "management", "network", "office",
            "professional", "qualification", "research", "staff", "training", "academic", "academy", "accent", "accept", "acceptable",
            "acceptance", "access", "accessible", "accident", "accidental", "accommodate", "accompany", "accomplish", "accord", "accordance",
            "accordingly", "account", "accountant", "accumulate", "accuracy", "accurate", "accuse", "accustomed", "achieve", "achievement",
            "acid", "acknowledge", "acquire", "acquisition", "acre", "act", "action", "active", "activity", "actor",
            "actress", "actual", "actually", "acute", "adapt", "adaptation", "add", "addition", "additional", "address",
            "adequate", "adhere", "adjacent", "adjust", "adjustment", "administer", "administration", "admirable", "admiral", "admission",
            "admit", "adopt", "adult", "advance", "advanced", "advantage", "advantageous", "adventure", "adverb", "advertise",
            "advertisement", "advice", "advisable", "advise", "advocate", "aerial", "aeroplane", "aesthetic", "affair", "affect",
            "afford", "afloat", "afraid", "afterward", "again", "against", "age", "agency", "agent", "aggravate",
            "aggressive", "agile", "agitate", "ago", "agony", "agree", "agreeable", "agreement", "agriculture", "ahead",
            "aid", "aim", "air", "aircraft", "airline", "airmail", "airplane", "airport", "alarm", "alcohol",
            "alert", "alien", "alike", "alive", "alkali", "all", "allergic", "alleviate", "alley", "alliance",
            "allocate", "allow", "allowance", "alloy", "allude", "ally", "almost", "alone", "along", "alongside",
            "alphabet", "already", "also", "alter", "alternate", "alternative", "although", "altitude", "altogether", "aluminum",
            "always", "amaze", "ambassador", "ambiguous", "ambition", "ambitious", "ambulance", "amend", "amenity", "amiable",
            "amid", "among", "amount", "ample", "amplify", "amuse", "amusement", "analogy", "analysis", "analyze",
            "ancestor", "anchor", "ancient", "and", "angel", "anger", "angle", "angry", "animal", "animate",
            "anniversary", "announce", "announcement", "annoy", "annual", "annually", "anonymous", "another", "answer", "ant",
            "antarctic", "antenna", "anticipate", "antique", "anxiety", "anxious", "any", "anybody", "anyhow", "anyone",
            "anything", "anyway", "anywhere", "apart", "apartment", "apologize", "apology", "apparatus", "apparent", "appeal",
            "appear", "appearance", "appendix", "appetite", "applaud", "apple", "appliance", "applicable", "applicant", "application",
            "apply", "appoint", "appointment", "appraisal", "appreciate", "appreciation", "apprehension", "approach", "appropriate", "approval",
            "approve", "approximate", "apricot", "april", "apt", "aptitude", "aquarium", "arbitrary", "arc", "arch",
            "architect", "architecture", "arctic", "area", "argue", "argument", "arise", "arithmetic", "arm", "armchair",
            "armor", "army", "around", "arouse", "arrange", "arrangement", "array", "arrest", "arrival", "arrive",
            "arrogant", "arrow", "art", "artery", "article", "articulate", "artificial", "artillery", "artist", "artistic"
        ]
    },
    {
        bookName: "逻辑与思辨",
        edition: "Abstract & Logic",
        publisher: "剑桥英语系列",
        description: "掌握 PET 考试最难的抽象词汇和逻辑连接，冲刺 Distinction 优秀水平。",
        keywords: [
            "evidence", "theory", "definition", "philosophy", "principle", "logic", "argument", "conclusion", "consequently", "whereas",
            "furthermore", "nevertheless", "otherwise", "unless", "although", "advantage", "benefit", "contrast", "impact", "influence",
            "abstract", "belief", "concept", "despite", "effective", "factor", "general", "however", "instead", "justification",
            "knowledge", "major", "objective", "perspective", "reasoning", "solution", "technical", "ultimate", "variation", "witness",
            "yield", "zone", "abandon", "abnormal", "abolish", "abrupt", "absent", "absolute", "absorb", "abstract",
            "absurd", "abundance", "abundant", "abuse", "academic", "accelerate", "accent", "accept", "acceptance", "access",
            "accessible", "accessory", "accident", "acclaim", "accommodate", "accommodation", "accompany", "accomplish", "accord", "accordance",
            "accordingly", "account", "accumulate", "accuracy", "accurate", "accuse", "accustom", "ache", "achieve", "achievement",
            "acid", "acknowledge", "acquaint", "acquaintance", "acquire", "acquisition", "acre", "act", "action", "activate",
            "active", "activity", "actor", "actress", "actual", "actually", "acute", "adapt", "adaptation", "add",
            "addict", "addition", "additional", "address", "adequate", "adhere", "adjacent", "adjoin", "adjust", "adjustment",
            "administer", "administration", "admirable", "admiral", "admire", "admission", "admit", "adolescent", "adopt", "adore",
            "adult", "advance", "advanced", "advantage", "advent", "adventure", "adverb", "adverse", "advertise", "advice",
            "advisable", "advise", "advocate", "aesthetic", "affable", "affair", "affect", "affection", "affiliate", "affirm",
            "affix", "afflict", "afford", "afraid", "after", "afternoon", "afterward", "again", "against", "age",
            "agency", "agent", "aggravate", "aggression", "aggressive", "agile", "agitate", "ago", "agony", "agree",
            "agreeable", "agreement", "agriculture", "ahead", "aid", "aim", "air", "aircraft", "airline", "airmail",
            "airplane", "airport", "alarm", "album", "alcohol", "alert", "alien", "alike", "alive", "alkali",
            "all", "allege", "allegiance", "alleviate", "alliance", "allocate", "allow", "allowance", "alloy", "allude",
            "allure", "ally", "almost", "alone", "along", "alongside", "aloud", "alphabet", "already", "also",
            "alter", "alternate", "alternative", "although", "altitude", "altogether", "aluminum", "always", "amaze", "ambassador",
            "ambiguous", "ambition", "ambitious", "ambulance", "amend", "amenity", "amiable", "amid", "amiss", "among",
            "amount", "ample", "amplifier", "amplify", "amuse", "amusement", "analogue", "analogy", "analysis", "analyze",
            "ancestor", "anchor", "ancient", "and", "anecdote", "angel", "anger", "angle", "angry", "anguish",
            "animal", "animate", "annals", "annex", "annihilate", "anniversary", "announce", "annoy", "annual", "annually",
            "anonymous", "another", "answer", "ant", "antarctic", "antenna", "anticipate", "antique", "antonym", "anxiety"
        ]
    }
];

async function importData() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");

        console.log("Loading dictionary into memory...");
        const dictMap = new Map();
        const fileStream = fs.createReadStream(DICT_PATH);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
            if (!line) continue;
            try {
                const data = JSON.parse(line);
                dictMap.set(data.word.toLowerCase(), data);
            } catch (e) { }
        }
        console.log(`Dictionary loaded: ${dictMap.size} words.`);

        for (const bookInfo of BOOKS_DATA) {
            console.log(`Processing Book: ${bookInfo.bookName}...`);

            let book = await Book.findOne({ bookName: bookInfo.bookName });
            if (!book) {
                book = new Book({
                    bookName: bookInfo.bookName,
                    edition: bookInfo.edition,
                    publisher: bookInfo.publisher,
                    description: bookInfo.description,
                    units: []
                });
            } else {
                book.units = [];
            }

            const wordDataList = [];
            const wordsToProcess = [...new Set(bookInfo.keywords)];

            for (const w of wordsToProcess) {
                const dictEntry = dictMap.get(w.toLowerCase());

                let chinese = "";
                let phonetic = "";
                let sentences = [];

                if (dictEntry && dictEntry.pos_items && dictEntry.pos_items[0]) {
                    const pos = dictEntry.pos_items[0];
                    if (pos.definitions && pos.definitions[0]) {
                        chinese = pos.definitions[0].definition.split('\n')[0].replace(/^\s*t\s*/, '').trim();
                        if (pos.definitions[0].examples) {
                            sentences = pos.definitions[0].examples.map(ex => ({
                                text: ex,
                                chinese: ""
                            }));
                        }
                    }
                    if (pos.pronunciations && pos.pronunciations[0]) {
                        phonetic = pos.pronunciations[0].pronunciation;
                    }
                }

                let wordObj = await Word.findOne({ text: w.toLowerCase() });
                if (!wordObj) {
                    wordObj = await Word.create({
                        text: w.toLowerCase(),
                        chinese: chinese || w,
                        phonetic: phonetic,
                        speakUrl: `https://dict.youdao.com/dictvoice?audio=${w.toLowerCase()}&type=2`
                    });
                } else if (chinese && wordObj.chinese === wordObj.text) {
                    wordObj.chinese = chinese;
                    await wordObj.save();
                }

                wordDataList.push({
                    id: wordObj._id,
                    sentences: sentences
                });
            }

            const unitSize = 20;
            const units = [];
            for (let i = 0; i < wordDataList.length; i += unitSize) {
                const chunk = wordDataList.slice(i, i + unitSize);
                const unitNum = Math.floor(i / unitSize) + 1;

                units.push({
                    unit: `Unit ${unitNum}`,
                    words: chunk.map(c => c.id),
                    sentences: chunk.flatMap(c => c.sentences)
                });
            }

            book.units = units;
            await book.save();
            console.log(`Saved ${bookInfo.bookName} with ${units.length} units and ${wordDataList.length} words.`);
        }

        console.log("All tasks completed!");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

importData();
