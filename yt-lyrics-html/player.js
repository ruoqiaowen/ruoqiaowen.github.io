let player;
let timestamps = [];
let currentWordIndex = 0;
let subtitleData = []; // 存放已載入的字幕時間軸
let currentOddLineIndex = 1;  // 初始為第一行（奇數）
let currentEvenLineIndex = 2; // 初始為第二行（偶數）
let currentFontSize = 30; // 預設字體大小

window.onload = function () {
    // **確保 #player-container 存在**
    let playerContainer = document.getElementById("player-container");
    if (!playerContainer) {
        let container = document.createElement("div");
        container.id = "player-container";
        document.body.prepend(container);
    }

    // **確保 #player 存在**
    let playerDiv = document.getElementById("player");
    if (!playerDiv) {
        playerDiv = document.createElement("div");
        playerDiv.id = "player";
        document.getElementById("player-container").appendChild(playerDiv);
    }

    // **初始化 YouTube 播放器**
    onYouTubeIframeAPIReady();

    // **清空字幕上傳狀態**
    document.getElementById("fileName").textContent = "尚未選擇任何檔案";

    // **清空字幕顯示區**
    document.getElementById("lyricsDisplay").innerHTML = "";
};

// 載入字型
document.getElementById("fontSelector").addEventListener("change", function () {
    let selectedFont = this.value;
    document.getElementById("lyricsDisplay").style.fontFamily = selectedFont;
});

// 監聽使用者選擇的變色字體顏色
document.getElementById("highlightTextColor").addEventListener("input", updateHighlightColor);
document.getElementById("highlightShadowColor").addEventListener("input", updateHighlightColor);

function updateHighlightColor() {
    let highlightTextColor = document.getElementById("highlightTextColor").value;
    let highlightShadowColor = document.getElementById("highlightShadowColor").value;

    // ✅ 變更所有 `.highlight-text` 的顏色
    document.querySelectorAll(".highlight-text").forEach(text => {
        text.style.color = highlightTextColor;
        text.style.textShadow = `2px 2px 5px ${highlightShadowColor}`;
    });
}

// 監聽使用者調整字體大小
document.getElementById("fontSizeSlider").addEventListener("input", updateFontSize);

document.getElementById("fontSizeSlider").addEventListener("input", updateFontSize);

function updateFontSize() {
    let fontSize = document.getElementById("fontSizeSlider").value;
    currentFontSize = fontSize; // ✅ 更新全域變數
    document.getElementById("fontSizeValue").textContent = fontSize + "px";

    // ✅ 直接變更 `lyricsDisplay` 的字體大小
    document.getElementById("lyricsDisplay").style.fontSize = fontSize + "px";
}

// 監聽字幕時間滑桿變化
let currentOffset = 0; // 目前字幕的時間微調值 (預設為 0)

// 監聽滑桿變化
document.getElementById("subtitleOffset").addEventListener("input", function () {
    let newOffset = parseFloat(this.value); // 取得新的微調值
    let delta = newOffset - currentOffset; // 計算變化量

    // 更新顯示數值（讓它更直覺）
    let displayText = "";
    if (newOffset < 0) {
        displayText = `調快 ${Math.abs(newOffset).toFixed(2)}s`; // ✅ 提前
    } else if (newOffset > 0) {
        displayText = `調慢 ${Math.abs(newOffset).toFixed(2)}s`; // ✅ 延遲
    } else {
        displayText = "未微調"; // ✅ 預設狀態
    }

    document.getElementById("subtitleOffsetValue").textContent = displayText;

    // 調整字幕時間
    subtitleData.forEach(entry => {
        entry.startTime += delta;
        entry.endTime += delta;
    });

    // 更新全域變數
    currentOffset = newOffset;

    // 立即更新字幕顯示
    updateLyricsDisplay(player.getCurrentTime());
});

function onYouTubeIframeAPIReady() {
    if (!player) { // 只有當 player 尚未初始化時才建立新播放器
        player = new YT.Player('player', {
            events: {
                'onReady': startSyncTimer // 影片載入完成後，啟動計時器
            }
        });
    }
}

// 遮罩相關變數
let isMaskVisible = false;
let maskBtnTimeout;

// 遮罩按鈕 & 遮罩層
let maskBtn = document.getElementById("toggleMaskBtn");
let videoMask = document.getElementById("videoMask");

// 📌 監聽全螢幕變化，顯示/隱藏遮罩按鈕
document.addEventListener("fullscreenchange", function () {
    if (document.fullscreenElement) {
        maskBtn.classList.remove("hidden"); // 顯示遮罩按鈕
    } else {
        maskBtn.classList.add("hidden"); // 退出全螢幕時隱藏按鈕
        videoMask.classList.add("hidden"); // 確保遮罩關閉
        isMaskVisible = false;
        maskBtn.textContent = "開啟遮罩";
    }
});

// 📌 按下 "開啟遮罩" 按鈕時，切換遮罩顯示
maskBtn.addEventListener("click", function () {
    isMaskVisible = !isMaskVisible;
    if (isMaskVisible) {
        videoMask.classList.remove("hidden");
        maskBtn.textContent = "關閉遮罩";
    } else {
        videoMask.classList.add("hidden");
        maskBtn.textContent = "開啟遮罩";
    }
});

// 📌 監聽 hover，沒 hover 超過 3 秒就隱藏按鈕
maskBtn.addEventListener("mouseenter", function () {
    maskBtn.classList.remove("hidden-btn");
    clearTimeout(maskBtnTimeout);
});

maskBtn.addEventListener("mouseleave", function () {
    if (document.fullscreenElement) {
        maskBtnTimeout = setTimeout(() => {
            maskBtn.classList.add("hidden-btn");
        }, 3000);
    }
});

// 🎵 計時器 - 每 1ms 更新一次時間
function startSyncTimer() {
    setInterval(() => {
        if (player && player.getCurrentTime) {
            let currentTime = parseFloat(player.getCurrentTime().toFixed(2)); // 取得影片當前時間
            updateLyricsDisplay(currentTime);
        }
    }, 1); // 1ms 更新一次，確保流暢
}

// 從網址提取 YouTube 影片 ID
function extractVideoId(url) {
    let videoId = null;

    // 嘗試匹配不同的 YouTube 影片網址格式
    let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([^#\&\?]{11})/);

    if (match) {
        videoId = match[1]; // 取得影片 ID
    }

    return videoId;
}

document.getElementById("subtitleFile").addEventListener("change", function() {
    const fileInput = this;
    const fileNameDisplay = document.getElementById("fileName");

    if (fileInput.files.length > 0) {
        // 取得檔名（不含副檔名）
        let fileName = fileInput.files[0].name.replace(/\.[^/.]+$/, "");
        fileNameDisplay.textContent = fileName; // ✅ 只顯示檔名，不含副檔名
    } else {
        fileNameDisplay.textContent = "尚未選擇任何檔案";
    }
});

// 🎵 讀取時間紀錄並自動載入影片
function loadSubtitleFile() {
    const fileInput = document.getElementById("subtitleFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("❌ 請選擇字幕檔案！");
        return;
    }

    console.log("📂 選擇的檔案：", file.name);

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        parseSubtitleFormat(text);
    };

    reader.onerror = function() {
        alert("⚠️ 讀取檔案時發生錯誤！");
    };

    reader.readAsText(file, "UTF-8");
}

function parseSubtitleFormat(text) {
    // **拆分成行，保留行內空格**
    const lines = text.split("\n").filter(line => line !== ""); 

    if (lines.length < 3) {
        alert("❌ 字幕檔案格式錯誤！");
        return;
    }

    const videoUrl = lines[1]; // 第二行是影片網址
    const subtitleLines = lines.slice(2); // 從第三行開始是字幕內容

    // 直接載入 YouTube 影片
    let videoId = extractVideoId(videoUrl);
    if (!videoId) {
        alert("❌ 字幕檔內的影片網址無效！");
        return;
    }

    if (player) {
        player.loadVideoById(videoId);
    }

    subtitleData = [];

    subtitleLines.forEach((line, index) => {
        // **解析但不影響空格**
        const match = line.match(/Line (\d+) \| Word (\d+) \| (\d{2}:\d{2}:\d{2}) → (\d{2}:\d{2}:\d{2}) \| (.+)/);
        if (match) {
            let wordText = match[5]; // **直接從 match 取得字串，保持原始空格**
            
            subtitleData.push({
                line: parseInt(match[1]),
                wordIndex: parseInt(match[2]),
                startTime: timeToSeconds(match[3]),
                endTime: timeToSeconds(match[4]),
                word: wordText.replace(/ /g, "␣").replace(/　/g, "␣␣") // 將空格標記起來待後續轉換
            });
        }
    });

    if (subtitleData.length === 0) {
        alert("❌ 無法解析字幕，可能是格式錯誤！");
        return;
    }

}

// ⏲ 轉換時間格式 (00:18:98 → 秒數)
function timeToSeconds(time) {
    let [min, sec, ms] = time.split(":").map(parseFloat);
    return min * 60 + sec + (ms / 100); // 轉換成秒數（支援毫秒）
}

// 📺 影片狀態變更
function onPlayerStateChange(event) {
    if (event.data !== YT.PlayerState.PLAYING) {
        clearInterval(syncInterval);
    }
}

// 監聽全螢幕按鈕
let fullscreenBtn = document.getElementById("customFullscreenBtn");
let hideFullscreenTimeout; // 計時器

document.getElementById("customFullscreenBtn").addEventListener("click", toggleCustomFullScreen);

function toggleCustomFullScreen() {
    if (!document.fullscreenElement) {
        // **進入真正的全螢幕模式**
        document.documentElement.requestFullscreen().then(() => {
            document.body.classList.add("fullscreen");
            fullscreenBtn.textContent = "退出全螢幕";

            // 設定 3 秒後讓按鈕透明
            hideFullscreenTimeout = setTimeout(() => {
                fullscreenBtn.classList.add("hide-fullscreen-btn");
            }, 3000);
        }).catch(err => {
            console.error("🔴 無法進入全螢幕模式:", err);
        });
    } else {
        // **退出全螢幕模式**
        document.exitFullscreen().then(() => {
            document.body.classList.remove("fullscreen");
            fullscreenBtn.textContent = "全螢幕播放";
            fullscreenBtn.classList.remove("hide-fullscreen-btn"); // 立即顯示按鈕
            clearTimeout(hideFullscreenTimeout);
        }).catch(err => {
            console.error("🔴 無法退出全螢幕模式:", err);
        });
    }
}

// 滑鼠移動到按鈕時，取消隱藏
fullscreenBtn.addEventListener("mouseenter", function () {
    fullscreenBtn.classList.remove("hide-fullscreen-btn"); // 重新顯示按鈕
    clearTimeout(hideFullscreenTimeout);
});

// 滑鼠離開後，重新啟動 3 秒後隱藏計時
fullscreenBtn.addEventListener("mouseleave", function () {
    if (document.fullscreenElement) {
        hideFullscreenTimeout = setTimeout(() => {
            fullscreenBtn.classList.add("hide-fullscreen-btn");
        }, 3000);
    }
});

// 監聽 Esc 鍵來退出全螢幕模式
document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) {
        document.body.classList.remove("fullscreen");
        fullscreenBtn.textContent = "全螢幕播放";
        fullscreenBtn.classList.remove("hide-fullscreen-btn"); // 立即顯示按鈕
        clearTimeout(hideFullscreenTimeout);
    }
});

// 🎤 更新 KTV 字幕動畫
let lastUpdateTime = 0; // 記錄上一次的時間戳

function updateLyricsDisplay(currentTime) {
    let displayArea = document.getElementById("lyricsDisplay");
    displayArea.innerHTML = ""; // 清空字幕區域

    // 獲取字幕的最大行數
    const maxLine = Math.max(...subtitleData.map(entry => entry.line));

    // 找到當前時間對應的行數
    let activeLines = new Set();
    let closestEntry = null;
    let minFutureEntry = null;

    subtitleData.forEach(entry => {
        if (currentTime >= entry.startTime && currentTime <= entry.endTime) {
            activeLines.add(entry.line);
        }
        if (entry.startTime >= currentTime && (minFutureEntry === null || entry.startTime < minFutureEntry.startTime)) {
            minFutureEntry = entry;
        }
    });

    // 若當前時間未匹配任何行，則使用最接近的未來字幕行
    if (activeLines.size === 0 && minFutureEntry) {
        activeLines.add(minFutureEntry.line);
    }

    // 找到當前時間應該顯示的字幕行
    let closestLine = Math.min(...activeLines);

    // 判斷是否發生快進快退
    if (Math.abs(currentTime - lastUpdateTime) > 0.5) {
        let nearestEntry = subtitleData.find(entry => entry.startTime >= currentTime);
        if (nearestEntry) {
            if (nearestEntry.line % 2 === 1) {
                currentOddLineIndex = nearestEntry.line;
                currentEvenLineIndex = currentOddLineIndex + 1;
            } else {
                currentEvenLineIndex = nearestEntry.line;
                currentOddLineIndex = currentEvenLineIndex + 1;
            }
        }
    }
    lastUpdateTime = currentTime; // 更新時間戳

    // 取得當前行數的字幕
    let upperLyrics = subtitleData.filter(entry => entry.line === currentOddLineIndex);
    let lowerLyrics = subtitleData.filter(entry => entry.line === currentEvenLineIndex);

    let upperLineDiv = document.createElement("div");
    upperLineDiv.classList.add("lyrics-line");
    upperLineDiv.style.fontSize = currentFontSize + "px";

    let lowerLineDiv = document.createElement("div");
    lowerLineDiv.classList.add("lyrics-line");
    lowerLineDiv.style.fontSize = currentFontSize + "px";

    function createWordSpan(entry) {
        let wordSpan = document.createElement("span");
        wordSpan.classList.add("word");
        wordSpan.style.fontSize = currentFontSize + "px";

        let baseText = document.createElement("span");
        baseText.classList.add("base-text");
        baseText.innerHTML = entry.word.replace(/␣␣/g, "&nbsp;&nbsp;").replace(/␣/g, "&nbsp;");
        baseText.style.fontSize = currentFontSize + "px";

        let highlightText = document.createElement("span");
        highlightText.classList.add("highlight-text");
        highlightText.innerHTML = entry.word.replace(/␣␣/g, "&nbsp;&nbsp;").replace(/␣/g, "&nbsp;");
        highlightText.style.fontSize = currentFontSize + "px";

        wordSpan.appendChild(baseText);
        wordSpan.appendChild(highlightText);

        animateWordHighlight(entry, highlightText, currentTime);

        return wordSpan;
    }

    function animateWordHighlight(entry, highlightText, currentTime) {
        let totalDuration = entry.endTime - entry.startTime;
        let elapsedTime = Math.max(0, currentTime - entry.startTime);
        let progress = Math.min(1, elapsedTime / totalDuration);

        let highlightTextColor = document.getElementById("highlightTextColor").value;
        let highlightShadowColor = document.getElementById("highlightShadowColor").value;

        highlightText.style.clipPath = `inset(0 ${100 - progress * 100}% 0 0)`;
        highlightText.style.color = highlightTextColor;
        highlightText.style.textShadow = `2px 2px 5px ${highlightShadowColor}`;

        if (progress < 1) {
            requestAnimationFrame(() => animateWordHighlight(entry, highlightText, player.getCurrentTime()));
        }
    }

    upperLyrics.forEach(entry => {
        upperLineDiv.appendChild(createWordSpan(entry));
    });

    lowerLyrics.forEach(entry => {
        lowerLineDiv.appendChild(createWordSpan(entry));
    });

    displayArea.appendChild(upperLineDiv);
    displayArea.appendChild(lowerLineDiv);

    // **字幕換行條件**
    if (
        upperLyrics.length > 0 &&
        currentTime > upperLyrics[upperLyrics.length - 1].endTime + 0.6 &&
        maxLine >= currentOddLineIndex + 2
    ) {
        currentOddLineIndex += 2;
    }

    if (
        lowerLyrics.length > 0 &&
        currentTime > lowerLyrics[lowerLyrics.length - 1].endTime + 0.6 &&
        maxLine >= currentEvenLineIndex + 2
    ) {
        currentEvenLineIndex += 2;
    }
}