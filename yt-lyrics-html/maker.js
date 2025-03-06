
// 載入影片
let player;
function loadVideo() {
    let url = document.getElementById("videoUrl").value;
    let videoId = extractVideoId(url);

    if (!videoId) {
        alert("請輸入有效的 YouTube 影片網址！");
        return;
    }

    // 若player已存在，先銷毀再重新載入
    if (player) {
        player.destroy();
    }

    player = new YT.Player('player', {
        height: '315',
        width: '560',
        videoId: videoId,
        playerVars: { 'autoplay': 1, 'controls': 1 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 擷取影片ID
function extractVideoId(url) {
    let videoId = null;

    // 嘗試匹配不同的 YouTube 影片網址格式
    let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([^#\&\?]{11})/);

    if (match) {
        videoId = match[1]; // 取得影片 ID
    }

    return videoId;
}

// 通知YouTubeAPI載入
function onYouTubeIframeAPIReady() {
    console.log("YouTube API 已載入");
}


// 載入Timer
let timer = 0;
function onPlayerReady(event) {
    console.log("🎥 影片已載入");
    updateTimer();
}
function updateTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (player && typeof player.getCurrentTime === "function") {
            timer = player.getCurrentTime();
            document.getElementById("timer").textContent = timer.toFixed(2);
        }
    }, 100);
}

// 影片播放時確保Timer同步
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        updateTimer();
    } else {
        clearInterval(timerInterval);
    }
}
let timerInterval;


// 歌詞變數定義
let lyrics = [];  // 儲存逐字拆分的歌詞
let currentWordIndex = 0;  // 當前變色的字索引
let timestamps = [];  // 記錄按鍵時間

// 讀取歌詞
let totalWordsInSong = 0; 
function loadLyrics() {
    let inputText = document.getElementById("lyricsInput").value.trim();
    if (!inputText) {
        alert("❌ 請輸入歌詞！");
        return;
    }

    // 將歌詞按行拆分並過濾空行
    lyrics = inputText.split("\n")
        .map(line => parseLyricsLine(line)) // 解析 `[]` 並拆分詞組
        .filter(line => line.length > 0); // 移除空行

    totalWordsInSong = lyrics.reduce((sum, line) => sum + line.length, 0); // 計算總詞數
    currentWordIndex = 0;
    currentLineIndex = 0;

    displayLyrics();
    updateProgressBar(); // 確保進度條歸零
}

// 解析單行歌詞，根據 `/` 來標示獨立字元組
function parseLyricsLine(line) {
    // **如果該行已經有 `/`，直接拆分**
    if (line.includes("/")) {
        return splitBySlashes(line);
    }

    // **標記 `/`**
    let markedLine = addSlashesToWords(line);

    // **根據 `/` 拆分成字元組**
    return splitBySlashes(markedLine);
}

// **逐字標記 `/`**
function addSlashesToWords(line) {
    let result = "";
    let len = line.length;
    let thirdSymbolCount = 0; // 記錄 `"` 出現次數

    for (let i = 0; i < len; i++) {
        let char = line[i];
        let nextChar = line[i + 1] || ""; // 下一個字元，若無則為空字串

        result += char; // 先加當前字元

        // **定義字元類型**
        let isLatin = /[\p{Script=Latin}’\u0300-\u036F]/u.test(char);
        let isCJK = /[\p{Script=Han}\p{Script=Hangul}]/u.test(char);
        let isNumber = /[1234567890１２３４５６７８９０]/u.test(char);
        let isHiraganaKatakana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char);
        let isKanaLongOrSmall = /[ぁぃぅぇぉゅょゃっーァィゥェォュョャッ]/u.test(char);
        let isPunctuationOrSpace = /[ \-,　.;:?!，。；：？！、」)）”]/u.test(char);
        let isSecondClassPunctuation = /[「(（¿¡]/u.test(char);
        let isThirdClassPunctuation = /["]/u.test(char); // `"`

        let isNextLatin = /[\p{Script=Latin}’\u0300-\u036F]/u.test(nextChar);
        let isNextCJK = /[\p{Script=Han}\p{Script=Hangul}]/u.test(nextChar);
        let isNextNumber = /[1234567890１２３４５６７８９０]/u.test(nextChar);
        let isNextHiraganaKatakana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(nextChar);
        let isNextKanaLongOrSmall = /[ぁぃぅぇぉゅょゃっーァィゥェォュョャッ]/u.test(nextChar);
        let isNextPunctuationOrSpace = /[ \-,　.;:?!，。；：？！、」)）”]/u.test(nextChar);
        let isNextSecondClassPunctuation = /[「(（¿¡]/u.test(nextChar);
        let isNextThirdClassPunctuation = /["]/u.test(nextChar);

        // **規則 0: 當前字元為最後一個字元，無條件加 `/`**
        if (i === len - 1) {
            result += "/";
            continue;
        }

        // **規則 1: 當前字元為拉丁字母**
        if (isLatin) {
            if (!(isNextLatin || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 2: 當前字元為漢字或韓文字**
        if (isCJK) {
            if (!(isNextKanaLongOrSmall || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 3: 當前字元為空格或第一類標點符號**
        if (isPunctuationOrSpace) {
            if (!(isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 4: 當前字元為第二類標點符號**
        if (isSecondClassPunctuation) {
            continue; // 直接跳過，不加 `/`
        }

        // **規則 5: 當前字元為第三類標點符號 (`"`)**
        if (isThirdClassPunctuation) {
            thirdSymbolCount++;
            if (thirdSymbolCount % 2 === 0) {
                result += "/"; // 偶數次 `" "`
            }
            continue;
        }

        // **規則 6: 當前字元為日文字**
        if (isHiraganaKatakana) {
            if (!(isNextKanaLongOrSmall || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }

        // **規則 7: 當前字元為日文字的半音或長音**
        if (isKanaLongOrSmall) {
            if (!(isNextKanaLongOrSmall)) {
                result += "/";
            }
            continue;
        }

        // **規則 8: 當前字元為數字**
        if (isNumber) {
            if (!(isNextNumber || isNextPunctuationOrSpace)) {
                result += "/";
            }
            continue;
        }
        
    }

    return result;
}

// **根據 `/` 來拆分字元組**
function splitBySlashes(line) {
    return line.split("/").filter(word => word.trim().length > 0);
}

// 讓使用者點擊歌詞輸入框時，能夠切換當前顯示的行
document.getElementById("lyricsInput").addEventListener("click", function (event) {
    let textarea = event.target;
    let clickedLineIndex = getClickedLineIndex(textarea, event);

    if (clickedLineIndex !== null && clickedLineIndex < lyrics.length) {
        currentLineIndex = clickedLineIndex; // 更新當前行索引
        displayLyrics(); // 重新顯示該行的 KTV 歌詞
        currentWordIndex = 0;
    }
});

// **取得使用者點擊的行數（對應 `lyrics` 的非空行）**
function getClickedLineIndex(textarea, event) {
    let text = textarea.value.substr(0, textarea.selectionStart); // 取得游標之前的文字
    let inputLines = textarea.value.split("\n"); // 取得所有行（包含空行）
    
    let nonEmptyLines = inputLines
        .map((line, index) => ({ index, text: line.trim() }))
        .filter(line => line.text.length > 0); // 過濾掉純空行

    let lineIndex = text.split("\n").length - 1; // 取得使用者點擊的行數

    // **確保行數對應到 `lyrics` 的非空行**
    let mappedIndex = nonEmptyLines.findIndex(line => line.index === lineIndex);

    return mappedIndex !== -1 ? mappedIndex : null;
}

// **顯示當前行的 KTV 歌詞**
function displayLyrics() {
    let displayArea = document.getElementById("lyricsDisplay");

    if (lyrics.length === 0 || currentLineIndex >= lyrics.length) {
        displayArea.innerHTML = ""; // 如果沒有歌詞或索引超出範圍，清空顯示
        return;
    }

    displayArea.innerHTML = lyrics[currentLineIndex]
        .filter(word => word.trim() !== "") // 過濾掉純空格
        .map((word, index) => {
            return `<span id="word-${index}" class="word">${word}</span>`;
        }).join("");

    updateLyricsStatus()
}

// 轉換秒數格式
function formatTime(seconds) {
    let min = Math.floor(seconds / 60).toString().padStart(2, '0');
    let sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    let ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
    return `${min}:${sec}:${ms}`;
}

// 監聽鍵盤事件
document.addEventListener("keydown", (event) => {
    // 取得當前焦點元素
    let activeElement = document.activeElement;
    
    // 如果焦點在輸入框 (input 或 textarea)，則讓按鍵保持預設行為
    if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        return; // 不攔截按鍵，讓使用者可以自由輸入
    }

    // 否則，執行 KTV 字幕的快捷鍵
    if (event.code === "Space" || event.code === "ArrowRight") {  
        event.preventDefault();  
        nextChar();
    } else if (event.code === "ArrowLeft") {  
        event.preventDefault();
        restartCurrentLine();
    } else if (event.code === "ArrowUp") {  
        event.preventDefault();
        prevLine();
    } else if (event.code === "ArrowDown") {  
        event.preventDefault();
        nextLine();
    }
});

function nextLine() {
    while (currentLineIndex < lyrics.length - 1) {
        currentLineIndex++;
        currentWordIndex = 0;

        // 檢查當前行是否為空，若是則跳過
        if (lyrics[currentLineIndex].length > 0) {
            displayLyrics();
            return;
        }
    }
}

// 模擬按鈕的 hover 效果
function addButtonEffect(buttonId) {
    let button = document.getElementById(buttonId);
    if (button) {
        button.classList.add("active"); // 添加 active 效果
        setTimeout(() => {
            button.classList.remove("active"); // 0.1 秒後移除
        }, 100);
    }
}

// 控制按鈕
function restartCurrentLine() {
    addButtonEffect("prevCharBtn"); // 仍使用原本的按鈕效果

    // **先找到該行第一個字的時間戳記**
    let firstTimestamp = findFirstTimestampOfCurrentLine();

    // **刪除當前行的所有時間戳記**
    timestamps = timestamps.filter(t => t.line !== currentLineIndex + 1);

    // 移除當前行所有字的 highlight 樣式
    document.querySelectorAll(`#lyricsDisplay .word`).forEach(word => {
        word.classList.remove("highlight");
    });

    // 重置索引，回到本行第一個字
    currentWordIndex = 0;

    // **更新 UI**
    updateTimestampsDisplay();
    updateLyricsStatus();

    // **設定 YouTube 播放器時間為 該行第一個字的時間戳記 -1.5 秒**
    if (firstTimestamp !== null && player && typeof player.seekTo === "function") {
        let targetTime = Math.max(0, firstTimestamp - 1.5);
        player.seekTo(targetTime, true);
    }
}

// **找到該行第一個字的時間戳記**
function findFirstTimestampOfCurrentLine() {
    for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i].line === currentLineIndex + 1) {
            return parseTimeToSeconds(timestamps[i].start); // **返回該行第一個字的時間**
        }
    }
    return null;
}

// **解析時間格式（mm:ss:ms）轉換為秒數**
function parseTimeToSeconds(timeString) {
    let parts = timeString.split(":");
    if (parts.length === 3) {
        let minutes = parseInt(parts[0], 10);
        let seconds = parseInt(parts[1], 10);
        let milliseconds = parseInt(parts[2], 10);
        return minutes * 60 + seconds + milliseconds / 100;
    }
    return null;
}

function nextChar() {
    if (currentWordIndex < lyrics[currentLineIndex].length) {
        addButtonEffect("nextCharBtn");
        let currentTime = player.getCurrentTime();
        let startTime = formatTime(currentTime);
        let endTime = formatTime(currentTime + 1);

        // 更新上一個字的結束時間
        if (currentWordIndex > 0) {
            let lastTimestamp = timestamps.find(t => 
                t.line === currentLineIndex + 1 && t.wordIndex === currentWordIndex
            );
            if (lastTimestamp) {
                lastTimestamp.end = startTime; // ✅ 更新上一個字的結束時間
            }
        }

        // 記錄當前字的時間
        let isLastWord = (currentWordIndex === lyrics[currentLineIndex].length - 1);
        let newTimestamp = {
            line: currentLineIndex + 1,
            wordIndex: currentWordIndex + 1,  // ✅ 讓 wordIndex 從 1 開始
            start: startTime,
            end: isLastWord ? endTime : "",  // ✅ 如果是最後一個字，設定 endTime
            word: lyrics[currentLineIndex][currentWordIndex]
        };

        // 推送時間紀錄
        timestamps.push(newTimestamp);

        // 讓當前字變色
        document.getElementById(`word-${currentWordIndex}`).classList.add("highlight");
        currentWordIndex++;
        updateTimestampsDisplay();

        // 按完最後一個字後自動換行
        if (currentWordIndex >= lyrics[currentLineIndex].length) {
            setTimeout(() => { 
                nextLine();
            }, 200);
        }
    }
    updateProgressBar();
}

function prevLine() {
    if (currentLineIndex > 0) {
        addButtonEffect("prevLineBtn");

        // **1️⃣ 先抓取上一句（currentLineIndex - 1）的第一個字的時間戳記**
        let firstTimestamp = findFirstTimestampOfLine(currentLineIndex - 1);

        // **2️⃣ 設定 YouTube 播放器時間為 該時間戳記 -1 秒**
        if (firstTimestamp !== null && player && typeof player.seekTo === "function") {
            let targetTime = Math.max(0, firstTimestamp - 1); // 🔥 這裡可以調整秒數
            player.seekTo(targetTime, true);
        }

        // **3️⃣ 刪除本行及上一行的所有時間戳記**
        timestamps = timestamps.filter(t => t.line !== currentLineIndex + 1 && t.line !== currentLineIndex);

        // **4️⃣ 移動到上一行並更新顯示**
        currentLineIndex--;
        currentWordIndex = 0;
        displayLyrics();
        updateTimestampsDisplay();
    } else {
        // **如果已經在第一行則不做回溯，只是重置行索引**
        timestamps = [];
        currentLineIndex = 0;
        currentWordIndex = 0;
        displayLyrics();
        updateTimestampsDisplay();
    }
}

// **找到指定行的第一個字的時間戳記**
function findFirstTimestampOfLine(lineIndex) {
    for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i].line === lineIndex + 1) { // **找到該行第一個字**
            return parseTimeToSeconds(timestamps[i].start);
        }
    }
    return null;
}

function nextLine() {
    if (currentLineIndex < lyrics.length - 1) {
        addButtonEffect("nextLineBtn");
        currentLineIndex++;
        currentWordIndex = 0;
        displayLyrics();
    }
}
function resetAll() {
    currentLineIndex = 0;
    currentWordIndex = 0;
    timestamps = [];  // 清除時間碼紀錄
    displayLyrics();
    updateTimestampsDisplay();
}

let lastTimestampsUpdate = 0; // 記錄最後一次 timestamps 變動時間
// 更新逐字時間碼
function updateTimestampsDisplay() {
    let displayArea = document.getElementById("timestampsDisplay");

    // 使用 Map 來確保每個 `line-wordIndex` 只有一個紀錄，避免重複
    let uniqueTimestamps = new Map();

    timestamps.forEach(t => {
        let key = `${t.line}-${t.wordIndex}`;
        uniqueTimestamps.set(key, t); // 若重複則覆蓋
    });

    // 轉回陣列並排序，確保按照行數 & 單字索引排列
    timestamps = Array.from(uniqueTimestamps.values()).sort((a, b) =>
        a.line === b.line ? a.wordIndex - b.wordIndex : a.line - b.line
    );

    // 將時間紀錄格式化為清晰的換行顯示
    let formattedText = timestamps.map(t =>
        `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`
    ).join("\n");

    displayArea.value = formattedText;

    // 自動捲動到最後一行
    displayArea.scrollTop = displayArea.scrollHeight;

    updateProgressBar();
    updateLyricsStatus();
    lastTimestampsUpdate = Date.now();
}

function updateProgressBar() {
    let progressBar = document.getElementById("progressBar");
    if (!progressBar) return;

    // 計算已紀錄的字數（每一行最後一個已紀錄的 wordIndex 加總）
    let recordedWords = new Set();
    timestamps.forEach(t => recordedWords.add(`${t.line}-${t.wordIndex}`)); // 避免重複計算
    let recordedCount = recordedWords.size; // 取得已記錄的字數

    // 計算進度
    let percentage = totalWordsInSong > 0 ? (recordedCount / totalWordsInSong) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
}

// 匯出影片資訊
let videoTitle = player.getVideoData().title || "ktv_timestamps";
let videoUrl = document.getElementById("videoUrl").value || "未知網址";

function exportTimestamps() {
    if (timestamps.length === 0) {
        alert("❌ 沒有可下載的時間紀錄！");
        return;
    }

    // 取得 YouTube 影片標題 & 網址
    let videoTitle = player.getVideoData().title || "ktv_timestamps";
    let videoUrl = document.getElementById("videoUrl").value || "未知網址";

    // 產生時間紀錄的內容，包含標題與網址
    let content = `${videoTitle}\n${videoUrl}\n\n` +
        timestamps.map(t =>
            `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`
        ).join("\n");

    // 創建下載連結
    let blob = new Blob([content], { type: "text/plain" });
    let a = document.createElement("a");
    
    // 設定下載的檔案名稱為影片標題
    let safeTitle = videoTitle.replace(/[<>:"/\\|?*]+/g, ""); // 避免非法字元
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.txt`; // 使用影片標題作為檔名
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateLyricsStatus() {
    let totalLines = lyrics.length; // 取得總行數
    let currentLine = currentLineIndex + 1; // 目前正在編輯的行數 (1-based index)
    let totalWordsInLine = lyrics[currentLineIndex]?.length || 0; // 取得當行總字數

    // 🔹 修正計算當行已完成的字元數：
    // 只計算 "start" 和 "end" 都有值的時間戳記
    let recordedWordsInLine = timestamps.filter(t => 
        t.line === currentLine && t.start && t.end
    ).length;

    let statusElement = document.getElementById("lyricsStatus");

    // 🔥 確保所有行的所有字元都有 "start" 和 "end"
    let allCompleted = lyrics.every((line, index) => {
        let wordsInThisLine = line.length;
        let recordedWords = timestamps.filter(t => 
            t.line === index + 1 && t.start && t.end
        ).length;
        return recordedWords >= wordsInThisLine;
    });

    if (allCompleted) {
        statusElement.classList.add("complete");
        statusElement.innerHTML = `🎆 逐字時間紀錄已完成，快下載吧！ 🎆`;

        // 🔥 檢查 timestamps 是否有變動，確保煙火不會無限重播
        if (Date.now() - lastTimestampsUpdate < 1000) {
            launchFireworks(); // 🎆 只有在 timestamps 變動過後才會放煙火
        }
    } else {
        // 如果只是某一行完成，就按照原本的顯示
        if (recordedWordsInLine >= totalWordsInLine && totalWordsInLine > 0) {
            statusElement.classList.add("complete");
            statusElement.innerHTML = `✅ 第 ${currentLine} 行已完成所有字元的時間紀錄`;
        } else {
            statusElement.classList.remove("complete");
            statusElement.innerHTML = `第 ${currentLine} 行 / 共 ${totalLines} 行，本行已完成 ${recordedWordsInLine} 個字元的時間紀錄`;
        }
    }
}

function launchFireworks() {
    let fireworksContainer = document.getElementById("fireworks-container");
    let overlay = document.getElementById("fireworks-overlay");

    // 避免重複播放煙火
    if (fireworksContainer.classList.contains("active")) return;
    
    // 🌙 啟動黑色半透明背景
    overlay.classList.add("active");

    fireworksContainer.classList.add("active");

    for (let i = 0; i < 10; i++) { // 限制煙火數量
        setTimeout(() => {
            let firework = document.createElement("div");
            firework.classList.add("firework");

            let x = Math.random() * window.innerWidth;
            let y = Math.random() * window.innerHeight * 0.5;
            let color = `hsl(${Math.random() * 360}, 100%, 70%)`;

            firework.style.left = `${x}px`;
            firework.style.top = `${y}px`;
            firework.style.backgroundColor = color;

            fireworksContainer.appendChild(firework);

            // 🎇 產生粒子爆炸
            for (let j = 0; j < 15; j++) {
                let particle = document.createElement("div");
                particle.classList.add("particle");

                let angle = Math.random() * Math.PI * 2;
                let distance = Math.random() * 80 + 20;
                let particleX = Math.cos(angle) * distance;
                let particleY = Math.sin(angle) * distance;

                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                particle.style.backgroundColor = color;

                particle.style.setProperty("--x", `${particleX}px`);
                particle.style.setProperty("--y", `${particleY}px`);

                fireworksContainer.appendChild(particle);

                setTimeout(() => {
                    particle.remove();
                }, 1500);
            }

            setTimeout(() => {
                firework.remove();
            }, 1500);
        }, i * 300);
    }

    // 4 秒後清除煙火 & 移除黑底
    setTimeout(() => {
        fireworksContainer.classList.remove("active");
        overlay.classList.remove("active"); // 🌙 移除黑色背景
    }, 4000);
}