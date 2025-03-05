
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
    timestamps = [];

    displayLyrics();
    updateProgressBar(); // 確保進度條歸零
}

// 解析單行歌詞，處理 `[]` 並拆分詞組
function parseLyricsLine(line) {
    let result = [];
    let buffer = "";
    let insideBrackets = false;

    for (let i = 0; i < line.length; i++) {
        let char = line[i];

        if (char === "[") {
            insideBrackets = true;
            if (buffer.trim()) {
                result.push(...splitWords(buffer)); // 處理 `[]` 之前的部分
            }
            buffer = "";
        } else if (char === "]") {
            insideBrackets = false;
            if (buffer.trim()) {
                result.push(buffer); // `[]` 內的內容視為單一詞組
            }
            buffer = "";
        } else {
            buffer += char;
        }
    }

    if (buffer.trim()) {
        result.push(...splitWords(buffer)); // 處理 `[]` 之後的部分
    }

    return result;
}

// 拆分 `[]` 之外的詞，確保所有字符都能正確識別
function splitWords(text) {
    return text.match(/[\p{Script=Latin}’]+(?:\s+)?|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}](?:\s+)?|[？！?,.\uFF01\uFF1F\uFF0C\u3002]|[\p{P}\p{S}]/gu) || [];
}

// 顯示當前行的歌詞
function displayLyrics() {
    let displayArea = document.getElementById("lyricsDisplay");

    displayArea.innerHTML = lyrics[currentLineIndex]
        .filter(word => word.trim() !== "") // 過濾掉純空格
        .map((word, index) => {
            return `<span id="word-${index}" class="word">${word}</span>`;
        }).join("");
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
    if (currentWordIndex > 0) {
        addButtonEffect("prevCharBtn"); // 仍使用原本的按鈕效果

        // 刪除當前行的所有時間戳記
        timestamps = timestamps.filter(t => t.line !== currentLineIndex + 1);

        // 移除當前行所有字的 highlight 樣式
        document.querySelectorAll(`#lyricsDisplay .word`).forEach(word => {
            word.classList.remove("highlight");
        });

        // 重置索引，回到本行第一個字
        currentWordIndex = 0;
        updateTimestampsDisplay();
    }
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
        // 刪除當前行和上一行的所有時間紀錄
        timestamps = timestamps.filter(t => t.line !== currentLineIndex + 1 && t.line !== currentLineIndex);

        // 移動到上一行
        currentLineIndex--;
        currentWordIndex = 0;
        displayLyrics();
        updateTimestampsDisplay();
    } else {
        // 如果已經在第一行則清除所有時間紀錄
        timestamps = [];
        currentLineIndex = 0;
        currentWordIndex = 0;
        displayLyrics();
        updateTimestampsDisplay();
    }
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

// 更新逐字時間碼
function updateTimestampsDisplay() {
    let displayArea = document.getElementById("timestampsDisplay");

    // 將時間紀錄格式化為清晰的換行顯示
    let formattedText = timestamps.map(t =>
        `Line ${t.line} | Word ${t.wordIndex} | ${t.start} → ${t.end} | ${t.word}`
    ).join("\n");

    displayArea.value = formattedText;

    // 自動捲動到最後一行
    displayArea.scrollTop = displayArea.scrollHeight;

    updateProgressBar()
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