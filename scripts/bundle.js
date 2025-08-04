(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Queue = require('./queue.js')

module.exports = class AlertRenderer {
    soundCommands;
    alertQueue;
    isAlertAnimRunning;
    stateEnum;
    attentionHorseId = "66c634dd-ff8a-4193-9f03-16c0cb648c08";
    cheermoteData;
    cooldowns = [];

    constructor(_soundCommands, queueSize) {
        this.soundCommands = _soundCommands;
        this.alertQueue = new Queue(queueSize);
        this.isAlertAnimRunning = false;
        this.stateEnum = {
            initialize: 0,
            fadeIn: 1,
            stay: 2,
            fadeOut: 3,
            end: 4
        };

    }

    playSound(selector) {
        const sound = document.querySelector(selector);
        sound.cloneNode().play();
    }

    parseCommandAndPlaySound(message, userName) {
        let soundCommand = null;
        for (let i = 0; i < this.soundCommands.length; i++) {
            if (message.toLowerCase().startsWith(this.soundCommands[i])) {
                soundCommand = this.soundCommands[i];
                break;
            }
        }
        
        if (soundCommand !== null) {
            if (this.cooldowns[userName] == null) {
                this.cooldowns[userName] = { lastCmdTime: Date.now(), spamCount: 0, time: 0, cooling: false };
            }

            const cooldown = this.cooldowns[userName];
            const baseCoolDownTime = 60000;
            const spamWindow = 15000;
            const spamThreshold = 5;
            const timeSinceLastCmd = Date.now() - cooldown.lastCmdTime;
            if (timeSinceLastCmd >= baseCoolDownTime)
                cooldown.cooling = false;
            if (cooldown.cooling) {
                return;
            }

            cooldown.spamCount = timeSinceLastCmd <= spamWindow ? cooldown.spamCount + 1 : 1;
            if (cooldown.spamCount >= spamThreshold) {
                cooldown.cooling = true;
                cooldown.time += baseCoolDownTime;
                this.queueAlertAnim({ alertTitle: `${userName} is on command timeout for ${cooldown.time / 1000} seconds.`, alertMessage: "Shut up!", sound: "shutup-sound", image: "shutup" });
            }
            else {
                const attributeValue = soundCommand.replaceAll("'", "\\'");
                this.playSound(`audio[command='${attributeValue}']`);
            }

            cooldown.lastCmdTime = Date.now();
        }
    }

    queueAlertAnim(alert) {
        this.alertQueue.enqueue(alert);
        if (!this.isAlertAnimRunning)
            this.startAlertAnims();
    }

    enqueueChatMessage(message, userName, customRewardId) {
        this.parseCommandAndPlaySound(message, userName);
        // attention horse
        if (customRewardId === this.attentionHorseId) {
            this.queueAlertAnim({ alertTitle: `${userName} is an attention horse!`, alertMessage: message, sound: "horse-sound", image: "attention-horse" });
        }
    }

    enqueueCheer(message, cheermoteData, userName, bits) {
        if (cheermoteData) {
            const data = cheermoteData.data;
            for (let i = 0; i < data.length; i++) {
                for (let j = data[i].tiers.length - 1; j >= 0; j--) {
                    if (message.indexOf(`${data[i].prefix}${data[i].tiers[j].id}`) === -1)
                        continue;
                    let tier = 0;
                    const imageMarkup = `<img src='${data[i].tiers[j].images.light.animated["3"]}' />`;
                    message = message.replaceAll(data[i].prefix, imageMarkup);
                }
            }
        }

        const bigCheerThreshold = 1000;
        if (bits < bigCheerThreshold)
            this.queueAlertAnim({ alertTitle: `${userName} sent ${bits} bits!`, alertMessage: message, sound: "bits1-sound" });
        else
            this.queueAlertAnim({ alertTitle: `BIG CHEER! ${userName} sent ${bits} bits!!`, alertMessage: message, sound: "bits2-sound" });
    }

    enqueueRaid(userName, viewers) {
        this.queueAlertAnim({ alertTitle: `${userName} raided with ${viewers} viewers!`, alertMessage: "Welcome, raiders!", sound: "raid-sound" });
    }

    enqueueNewFollower(userName) {
        this.queueAlertAnim({ alertTitle: `${userName} is now a follower!`, alertMessage: "Greetings!", sound: "follower-sound" });
    }
    
    enqueueNewSubscriber(userName, tier) {
        this.queueAlertAnim({ alertTitle: `${userName} joined the Mages' Guild!`, alertMessage: tier > 1 ? `Tier ${tier} sub.` : "Welcome!", sound: "spell-sound" });
    }

    enqueueSubGift(userName, numGifts, tierText) {
        this.queueAlertAnim({ alertTitle: `${userName} gifted ${numGifts} ${tierText}subs!`, alertMessage: "Christmas came early!", sound: "subscriber-sound" });
    }

    enqueueResubMessage(userName, cumulativeMonths, message) {
        this.queueAlertAnim({ alertTitle: `${userName} has been subbed for ${cumulativeMonths} months total!`, alertMessage: message, sound: "subscriber-sound" });
    }

    enqueuePollStart(voteQuestion, choices) {
        let choicesText = "";
        for (let i = 0; i < choices.length; i++) {
            choicesText += `* ${choices[i].title}<br />`;
        }

        this.queueAlertAnim({ alertTitle: `Poll started: ${voteQuestion}`, alertMessage: choicesText, sound: "vote-sound" });
    }

    enqueuePollEnd(voteQuestion, choices) {
        let choicesMarkup = "";
        let maxVotes = 0;
        let sortedChoices = choices.slice().sort((a, b) => {
            if (maxVotes === 0)
                if (a.votes > b.votes)
                    maxVotes = a.votes;
                else
                    maxVotes = b.votes;
            else if (a.votes > maxVotes)
                maxVotes = a.votes;
            else if (b.votes > maxVotes)
                maxVotes = b.votes;
            if (a.votes > b.votes)
                return 1;
            if (a.votes < b.votes)
                return -1;
            return 0;
        });

        let tieWays = 1;
        for (let i = sortedChoices.length - 1; i > 0; i--) {
            if (sortedChoices[i].votes === sortedChoices[i - 1].votes && sortedChoices[i].votes === maxVotes) {
                tieWays++;
            }
        }
        
        const isTied = tieWays > 1;
        const winColor = isTied ? "crimson" : "limegreen";
        const winStyleAttr = ` style="color: ${winColor};"`;
        for (let i = 0; i < choices.length; i++) {
            let choiceAttr = choices[i].votes === maxVotes ? winStyleAttr : "";
            choicesMarkup += `<span${choiceAttr}>* ${choices[i].title} - (${choices[i].votes})</span><br />`;
        }

        let tieText = isTied ? ` (${tieWays}-way tie) ` : "";
        this.queueAlertAnim({ alertTitle: `Poll ended${tieText}: ${voteQuestion}`, alertMessage: choicesMarkup, sound: (isTied ? "vote-fail-sound" : "vote-pass-sound") });
    }

    startAlertAnims() {
        this.isAlertAnimRunning = true;
        let timeLast = document.timeline.currentTime;
        let state = 0;
        let opacity = 0;
        let stayTime = 0;
        const alertElement = document.getElementById("alert-area");
        const fadeTimeLimit = 2000;
        const stayTimeLimit = 5000;
        const animStep = (timeStamp) => {
            const timeDelta = timeStamp - timeLast;
            timeLast = timeStamp;
            switch (state) {
                case this.stateEnum.initialize:
                    let item = this.alertQueue.dequeue();
                    document.getElementById("sub-title").textContent = item.alertTitle;
                    document.getElementById("sub-message").innerHTML = item.alertMessage;
                    const alertImages = document.getElementById("alert-area").querySelectorAll(".alert-image");
                    for (let i = 0; i < alertImages.length; i++) {
                        alertImages[i].style.display = "none";
                    }
                    
                    if (item.image != null)
                        document.getElementById(item.image).style.display = "inline";
                    this.playSound(`#${item.sound}`);
                    state++;
                    break;
                case this.stateEnum.fadeIn:
                    if (opacity < 1) {
                        alertElement.style.opacity = opacity;
                        opacity += timeDelta / fadeTimeLimit;
                    }
                    else {
                        alertElement.style.opacity = 1;
                        state++;
                    }

                    break;
                case this.stateEnum.stay:
                    if (stayTime < stayTimeLimit) {
                        stayTime += timeDelta;
                    }
                    else {
                        stayTime = 0;
                        state++;
                    }

                    break;
                case this.stateEnum.fadeOut:
                    if (opacity > 0) {
                        alertElement.style.opacity = opacity;
                        opacity -= timeDelta / fadeTimeLimit;
                    }
                    else {
                        alertElement.style.opacity = 0;
                        state++;
                    }

                    break;
                case this.stateEnum.end: // End
                    if (this.alertQueue.isEmpty()) {
                        this.isAlertAnimRunning = false;
                        return;
                    }
                    else {
                        state = 0;
                    }

                    break;
                default:
                    break;
            }

            requestAnimationFrame(animStep);
        }

        requestAnimationFrame(animStep);
    }

    getName(e) {
        return e.is_anonymous ? "Anonymous" : e.user_name;
    }

    onNewFollower(self, e) {
        self.enqueueNewFollower(e.user_name);
    }

    onNewSubscriber(self, e) {
        self.enqueueNewSubscriber(e.user_name, Number(e.tier) / 1000);
    }

    onSubGift(self, e) {
        const userName = self.getName(e);
        const numGifts = e.total;
        const tier = Number(e.tier) / 1000;
        const tierText = tier > 1 ? `tier ${tier} ` : "";
        self.enqueueSubGift(userName, numGifts, tierText);
    }

    onResub(self, e) {
        const message = e.message.text;
        const cumulativeMonths = Math.floor(e.cumulative_months);
        self.enqueueResubMessage(e.user_name, cumulativeMonths, message);
    }

    onChatMessage(self, e) {
        const userName = e.chatter_user_name;
        const message = e.message.text;
        const rewardId = e.channel_points_custom_reward_id;
        self.enqueueChatMessage(message, userName, rewardId);
    }

    onCheer(self, e) {
        let message = e.message;
        const userName = self.getName(e);
        const bits = Number(e.bits);
        self.enqueueCheer(message, self.cheermoteData, userName, bits);
    }

    onRaid(self, e) {
        const userName = e.from_broadcaster_user_name;
        const viewers = e.viewers;
        self.enqueueRaid(userName, viewers);
    }

    onPollBegin(self, e) {
        const voteQuestion = e.title;
        const choices = e.choices;
        self.enqueuePollStart(voteQuestion, choices);
    }

    onPollEnd(self, e) {
        const voteQuestion = e.title;
        const choices = e.choices;
        self.enqueuePollEnd(voteQuestion, choices);
    }
}

},{"./queue.js":3}],2:[function(require,module,exports){
const AlertRenderer = require('./alertrenderer.js');
const { StatusCodes } = require('http-status-codes');
const SpecViz = require('./specviz.js');
const OverlaySongPlayer = require('./songplayer.js');
const SoundSequencer = require('./soundsequencer.js');

class EventDispatcher {
    subscriptions;
    constructor() {
        this.subscriptions = {};
    }

    subscribe(eventType, obj, handler) {
        if (this.subscriptions[eventType] == null)
            this.subscriptions[eventType] = [];
        const index = this.subscriptions[eventType].length;
        this.subscriptions[eventType][index] = { target: obj, method: handler };
    }

    dispatch(eventType, event) {
        const eventSubscriptions = this.subscriptions[eventType];
        if (eventSubscriptions == null)
            return;
        for (let i = 0; i < eventSubscriptions.length; i++) {
            eventSubscriptions[i].method(eventSubscriptions[i].target, event);
        }
    }
}

const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const streamerUserId = "66293282"; // numidium3rd
const token = (new URLSearchParams(document.location.hash.substring(1))).get("access_token");
const queueSize = 15;
const alertRenderer = new AlertRenderer(soundCommands, queueSize);
let cheermotes;
(function requestCheermotes() {
    const req = new XMLHttpRequest();
    req.open("GET", `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${streamerUserId}`, true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status >= StatusCodes.OK && req.status < StatusCodes.BAD_REQUEST) {
            cheermotes = JSON.parse(req.response);
            alertRenderer.cheermoteData = cheermotes;
        }
    };

    req.send();
})();


const canvas = document.getElementById("spectrum-surface");
const overlaySongElement = document.getElementById("song-player-audio");
const overlayAudioContext = new AudioContext();
const songAudioSource = overlayAudioContext.createMediaElementSource(overlaySongElement);
songAudioSource.connect(overlayAudioContext.destination);
const drawContext = canvas.getContext("2d");
const audioVisualizer = new SpecViz(overlayAudioContext, drawContext, 2);
songAudioSource.connect(audioVisualizer.analyser);
const overlaySongPlayer = new OverlaySongPlayer(overlayAudioContext);
const hgruntSequencer = new SoundSequencer("hgrunt", "wav");
hgruntSequencer.onChatMessage = (self, e) => {
    if (e.channel_points_custom_reward_id === "aa8336f9-b612-4df9-ac13-174c253edeee")
        self.startSpeaking(e.message.text);
};

const commandLibrary = {};
function registerCommand(commandText, handler) {
    commandLibrary[commandText.toUpperCase()] = handler;
}

let lastDennisTime = new Date();
const baseDennisTimeout = 1000;
let dennisTimeout = baseDennisTimeout;
function parseAndExecuteCommand(userId, text) {
    if (!text.startsWith("!"))
        return;
    const commandKey = text.split(/\s+/)[0].split("!")[1].toUpperCase().replace(/\s/g, "").replace(/[^\x00-\x7F]/g, "");
    if (commandLibrary[commandKey] == null)
        return;
    const now = new Date();
    if (userId !== streamerUserId && now - lastDennisTime > dennisTimeout) {
        document.getElementById("dennis").cloneNode().play();
        lastDennisTime = now;
        dennisTimeout += baseDennisTimeout;
        return;
    }

    const params = text.split(/\s+/).slice(1);
    commandLibrary[commandKey](...params);
}

registerCommand("brb", (song) => {
    const brbText = document.getElementById("brb-text");
    if (brbText.style.display !== "block")
        brbText.style.display = "block";
    else
        brbText.style.display = "";
    if (song.toUpperCase() === "SILENT") {
        overlaySongPlayer.stopSong();
        audioVisualizer.hide();
        return;
    }

    audioVisualizer.show();
    const songElement = document.getElementById("song-player-audio");
    const brbSongs = ["22", "23", "03 Raptor Rap", "Star Control 2 Orbit III OST"];
    let songIndex = parseInt(song);
    if (isNaN(songIndex) || songIndex >= brbSongs.length) {
        songIndex = Math.floor(Math.random() * brbSongs.length);
    }

    songElement.src = `./songs/${brbSongs[songIndex]}.mp3`;
    songElement.load();
    if (!overlaySongPlayer.isPlaying)
        overlaySongPlayer.playSong(songElement);
    else
        overlaySongPlayer.stopSong();

    function drawVisualizer(timeStamp) {
        if (!overlaySongPlayer.isPlaying)
            return;
        audioVisualizer.draw();
        requestAnimationFrame(drawVisualizer);
    }

    requestAnimationFrame(drawVisualizer);
});

registerCommand("back", () => {
    overlaySongPlayer.stopSong();
    audioVisualizer.hide();
    document.getElementById("brb-text").style.display = "none";
});

registerCommand("volume", (percentage) => {
    const songElement = document.getElementById("song-player-audio");
    const value = parseInt(percentage);
    if (isNaN(value))
        return;
    songElement.volume = value / 100;
});

registerCommand("testbits", (cheermote_, bitCount_) => {
    let bitCount = isNaN(bitCount_) ? 1 : bitCount_;
    let cheermote = cheermote_ == null ? "SeemsGood" : cheermote_;
    alertRenderer.enqueueCheer(`${cheermote} <-- an image should be over there`,
        cheermotes,
        "Dummy User",
        bitCount
    );
});

registerCommand("hgrunt", (word1, word2, word3, word4) => {
    hgruntSequencer.startSpeaking(`${word1} ${word2} ${word3} ${word4}`);
});

const subTypes = {
    follow: "channel.follow",
    subscribe: "channel.subscribe",
    gift: "channel.subscription.gift",
    resub: "channel.subscription.message",
    chatMessage: "channel.chat.message",
    cheer: "channel.cheer",
    raid: "channel.raid",
    pollBegin: "channel.poll.begin",
    pollEnd: "channel.poll.end"
};

const eventDispatcher = new EventDispatcher();
eventDispatcher.subscribe(subTypes.follow, alertRenderer, alertRenderer.onNewFollower);
eventDispatcher.subscribe(subTypes.subscribe, alertRenderer, alertRenderer.onNewSubscriber);
eventDispatcher.subscribe(subTypes.gift, alertRenderer, alertRenderer.onSubGift);
eventDispatcher.subscribe(subTypes.resub, alertRenderer, alertRenderer.onResub);
eventDispatcher.subscribe(subTypes.chatMessage, null, (self, e) => { parseAndExecuteCommand(e.chatter_user_id, e.message.text); });
eventDispatcher.subscribe(subTypes.chatMessage, alertRenderer, alertRenderer.onChatMessage);
eventDispatcher.subscribe(subTypes.chatMessage, hgruntSequencer, hgruntSequencer.onChatMessage);
eventDispatcher.subscribe(subTypes.cheer, alertRenderer, alertRenderer.onCheer);
eventDispatcher.subscribe(subTypes.raid, alertRenderer, alertRenderer.onRaid);
eventDispatcher.subscribe(subTypes.pollBegin, alertRenderer, alertRenderer.onPollBegin);
eventDispatcher.subscribe(subTypes.pollEnd, alertRenderer, alertRenderer.onPollEnd);

let sessionId = null;
function subscribeToTwitchEvent(subType) {
    const subscription = {
        type: subType,
        version: "1",
        condition: {},
        transport: {
            method: "websocket",
            session_id: sessionId
        }
    };
    
    if (subType === subTypes.follow) {
        subscription.version = "2";
        subscription.condition.moderator_user_id = streamerUserId;
    }
    else if (subType === subTypes.chatMessage)
        subscription.condition.user_id = streamerUserId;
    if (subType === subTypes.raid)
        subscription.condition.to_broadcaster_user_id = streamerUserId;
    else
        subscription.condition.broadcaster_user_id = streamerUserId;

    const req = new XMLHttpRequest();
    req.open("POST", "https://api.twitch.tv/helix/eventsub/subscriptions", true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
    };
    
    req.send(JSON.stringify(subscription));
}

const eventSocket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
eventSocket.onopen = () => {
    console.log("Socket connected.");
    return false;
};

eventSocket.onerror = (error) => {
    console.log(`Socket error: ${error}`);
};

eventSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const messageType = data.metadata.message_type;
    if (messageType === "session_welcome") {
        sessionId = data.payload.session.id;
        subscribeToTwitchEvent(subTypes.chatMessage);
        subscribeToTwitchEvent(subTypes.follow);
        subscribeToTwitchEvent(subTypes.subscribe);
        subscribeToTwitchEvent(subTypes.gift);
        subscribeToTwitchEvent(subTypes.resub);
        subscribeToTwitchEvent(subTypes.cheer);
        subscribeToTwitchEvent(subTypes.raid);
        subscribeToTwitchEvent(subTypes.pollBegin);
        subscribeToTwitchEvent(subTypes.pollEnd);
    }
    else if (messageType === "notification") {
        const subType = JSON.parse(e.data).payload.subscription.type;
        const payloadEvent = data.payload.event;
        switch (subType) {
            case subTypes.follow:
            case subTypes.subscribe:
            case subTypes.gift:
            case subTypes.resub:
            case subTypes.chatMessage:
            case subTypes.cheer:
            case subTypes.raid:
            case subTypes.pollBegin:
            case subTypes.pollEnd:
                eventDispatcher.dispatch(subType, payloadEvent);
            default:
                break;
        }
    }

    //console.log(data);
    return false; // don't close connection
};

eventSocket.onclose = (e) => {
    console.log("Socket closed.");
}

},{"./alertrenderer.js":1,"./songplayer.js":4,"./soundsequencer.js":5,"./specviz.js":6,"http-status-codes":7}],3:[function(require,module,exports){
module.exports = class Queue {
    constructor(size) {
        this.items = new Array(size);
        this.backIndex = 0;
    }

    enqueue(item) {
        if (this.backIndex < this.items.length) {
            this.items[this.backIndex++] = item;
            return true;
        }

        return false;
    }

    dequeue() {
        const item = this.items[0];
        for (let i = 0; i < this.backIndex; i++) {
            this.items[i] = this.items[i + 1];
        }

        if (this.backIndex > 0)
            --this.backIndex;
        delete this.items[this.backIndex];
        return item;
    }

    isEmpty() {
        return this.items[0] === undefined;
    }
}
},{}],4:[function(require,module,exports){
module.exports = class OverlaySongPlayer {
    audioContext;
    mediaElement;
    isPlaying;
    constructor(audioContext, mediaElement) {
        this.audioContext = audioContext;
        this.mediaElement = mediaElement;
    }

    playSong(mediaElement, loop = true) {
        if (this.mediaElement != null) {
            this.mediaElement.pause();
            this.mediaElement.currentTime = 0;
        }

        this.mediaElement = mediaElement;
        this.mediaElement.loop = loop;
        this.mediaElement.play();
        this.isPlaying = true;
    }

    stopSong() {
        if (this.mediaElement != null) {
            this.mediaElement.pause();
            this.mediaElement.currentTime = 0;
        }

        this.isPlaying = false;
    }
}
},{}],5:[function(require,module,exports){
module.exports = class SoundSequencer {
    isReady;
    fileNames;
    path;
    extension;
    currentWords;
    currentWord;
    wordIndex;
    constructor(soundSet, extension) {
        this.isReady = false;
        fetch(`./${soundSet}.json`)
            .then((response) => response.json())
            .then((json) => { this.fileNames = json; this.isReady = true; });
        this.path = `./sounds/${soundSet}/`;
        this.extension = extension;
        this.wordIndex = 0;
    }

    startSpeaking(text) {
        if (!this.isReady)
            return;
        const tokens = text.toLowerCase().split(/\s+/);
        this.currentWords = [];
        for (let i = 0; i < tokens.length; i++) {
            if (this.fileNames.indexOf(tokens[i]) === -1)
                continue;
            const audio = new Audio(`${this.path}${tokens[i]}.${this.extension}`);
            audio.volume = 0.3;
            this.currentWords.push(audio);
        }

        this.wordIndex = 0;
        const sayCurrentWord = () => {
            if (this.currentWord != null) {
                this.currentWord.removeEventListener("ended", sayCurrentWord);
                this.currentWord.removeEventListener("error", sayCurrentWord);
            }

            if (this.wordIndex >= this.currentWords.length)
                return;
            this.currentWord = this.currentWords[this.wordIndex++];
            this.currentWord.play();
            this.currentWord.addEventListener("ended", sayCurrentWord);
            this.currentWord.addEventListener("error", sayCurrentWord);    
        }

        sayCurrentWord();
    }

    onChatMessage(self, e) {}
}
},{}],6:[function(require,module,exports){
module.exports = class SpecViz {
    audioContext;
    analyser;
    canvas;
    context;
    sliceWidth;
    sampleStep;
    sampleBuffer;
    ampZoom;

    constructor(audioContext, drawContext, ampZoom = 1) {
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.sampleBuffer = new Uint8Array(this.analyser.fftSize);
        this.ampZoom = ampZoom;

        this.canvas = document.getElementById("spectrum-surface");
        this.sampleStep = Math.round(this.analyser.fftSize / this.canvas.width);
        this.context = drawContext;
        this.context.imageSmoothingEnabled = false;
        this.blankCanvas();
    }

    blankCanvas() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getYValue(amplitude) {
        const neutralAmp = 128;
        const maxAmp = 256;
        return ((neutralAmp + (amplitude - neutralAmp) * this.ampZoom) / maxAmp) * this.canvas.height;
    }

    draw() {
        this.blankCanvas();
        this.context.strokeStyle = "teal";
        this.analyser.getByteTimeDomainData(this.sampleBuffer);
        const steps = this.analyser.fftSize / this.sampleStep;
        for (let i = 0; i < steps - 1; i++) {
            const sampleVal = this.sampleBuffer[i * this.sampleStep];
            const nextSampleVal = this.sampleBuffer[i * this.sampleStep + this.sampleStep];
            const ampPosition = this.getYValue(sampleVal);
            const nextAmpPosition = this.getYValue(nextSampleVal);
            this.context.beginPath();
            this.context.moveTo(i, ampPosition);
            this.context.lineTo(i + 1, nextAmpPosition);
            this.context.stroke();
        }
    }

    show() {
        this.canvas.style.display = "block";
    }

    hide() {
        this.canvas.style.display = "";
    }
}


},{}],7:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var legacy_1 = __importDefault(require("./legacy"));
var utils_functions_1 = require("./utils-functions");
var utils_functions_2 = require("./utils-functions");
Object.defineProperty(exports, "getStatusCode", { enumerable: true, get: function () { return utils_functions_2.getStatusCode; } });
Object.defineProperty(exports, "getReasonPhrase", { enumerable: true, get: function () { return utils_functions_2.getReasonPhrase; } });
Object.defineProperty(exports, "getStatusText", { enumerable: true, get: function () { return utils_functions_2.getStatusText; } });
var status_codes_1 = require("./status-codes");
Object.defineProperty(exports, "StatusCodes", { enumerable: true, get: function () { return status_codes_1.StatusCodes; } });
var reason_phrases_1 = require("./reason-phrases");
Object.defineProperty(exports, "ReasonPhrases", { enumerable: true, get: function () { return reason_phrases_1.ReasonPhrases; } });
__exportStar(require("./legacy"), exports);
exports.default = __assign(__assign({}, legacy_1.default), { getStatusCode: utils_functions_1.getStatusCode,
    getStatusText: utils_functions_1.getStatusText });

},{"./legacy":8,"./reason-phrases":9,"./status-codes":10,"./utils-functions":11}],8:[function(require,module,exports){
"use strict";
// Exporting constants directly to maintain compatability with v1
// These are deprecated. Please don't add any new codes here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.USE_PROXY = exports.UNSUPPORTED_MEDIA_TYPE = exports.UNPROCESSABLE_ENTITY = exports.UNAUTHORIZED = exports.TOO_MANY_REQUESTS = exports.TEMPORARY_REDIRECT = exports.SWITCHING_PROTOCOLS = exports.SERVICE_UNAVAILABLE = exports.SEE_OTHER = exports.RESET_CONTENT = exports.REQUESTED_RANGE_NOT_SATISFIABLE = exports.REQUEST_URI_TOO_LONG = exports.REQUEST_TOO_LONG = exports.REQUEST_TIMEOUT = exports.REQUEST_HEADER_FIELDS_TOO_LARGE = exports.PROXY_AUTHENTICATION_REQUIRED = exports.PROCESSING = exports.PRECONDITION_REQUIRED = exports.PRECONDITION_FAILED = exports.PERMANENT_REDIRECT = exports.PAYMENT_REQUIRED = exports.PARTIAL_CONTENT = exports.OK = exports.NOT_MODIFIED = exports.NOT_IMPLEMENTED = exports.NOT_FOUND = exports.NOT_ACCEPTABLE = exports.NON_AUTHORITATIVE_INFORMATION = exports.NO_CONTENT = exports.NETWORK_AUTHENTICATION_REQUIRED = exports.MULTIPLE_CHOICES = exports.MULTI_STATUS = exports.MOVED_TEMPORARILY = exports.MOVED_PERMANENTLY = exports.METHOD_NOT_ALLOWED = exports.METHOD_FAILURE = exports.LOCKED = exports.LENGTH_REQUIRED = exports.INTERNAL_SERVER_ERROR = exports.INSUFFICIENT_STORAGE = exports.INSUFFICIENT_SPACE_ON_RESOURCE = exports.IM_A_TEAPOT = exports.HTTP_VERSION_NOT_SUPPORTED = exports.GONE = exports.GATEWAY_TIMEOUT = exports.FORBIDDEN = exports.FAILED_DEPENDENCY = exports.EXPECTATION_FAILED = exports.CREATED = exports.CONTINUE = exports.CONFLICT = exports.BAD_REQUEST = exports.BAD_GATEWAY = exports.ACCEPTED = void 0;
/**
 * @deprecated Please use StatusCodes.ACCEPTED
 *
 * */
exports.ACCEPTED = 202;
/**
 * @deprecated Please use StatusCodes.BAD_GATEWAY
 *
 * */
exports.BAD_GATEWAY = 502;
/**
 * @deprecated Please use StatusCodes.BAD_REQUEST
 *
 * */
exports.BAD_REQUEST = 400;
/**
 * @deprecated Please use StatusCodes.CONFLICT
 *
 * */
exports.CONFLICT = 409;
/**
 * @deprecated Please use StatusCodes.CONTINUE
 *
 * */
exports.CONTINUE = 100;
/**
 * @deprecated Please use StatusCodes.CREATED
 *
 * */
exports.CREATED = 201;
/**
 * @deprecated Please use StatusCodes.EXPECTATION_FAILED
 *
 * */
exports.EXPECTATION_FAILED = 417;
/**
 * @deprecated Please use StatusCodes.FAILED_DEPENDENCY
 *
 * */
exports.FAILED_DEPENDENCY = 424;
/**
 * @deprecated Please use StatusCodes.FORBIDDEN
 *
 * */
exports.FORBIDDEN = 403;
/**
 * @deprecated Please use StatusCodes.GATEWAY_TIMEOUT
 *
 * */
exports.GATEWAY_TIMEOUT = 504;
/**
 * @deprecated Please use StatusCodes.GONE
 *
 * */
exports.GONE = 410;
/**
 * @deprecated Please use StatusCodes.HTTP_VERSION_NOT_SUPPORTED
 *
 * */
exports.HTTP_VERSION_NOT_SUPPORTED = 505;
/**
 * @deprecated Please use StatusCodes.IM_A_TEAPOT
 *
 * */
exports.IM_A_TEAPOT = 418;
/**
 * @deprecated Please use StatusCodes.INSUFFICIENT_SPACE_ON_RESOURCE
 *
 * */
exports.INSUFFICIENT_SPACE_ON_RESOURCE = 419;
/**
 * @deprecated Please use StatusCodes.INSUFFICIENT_STORAGE
 *
 * */
exports.INSUFFICIENT_STORAGE = 507;
/**
 * @deprecated Please use StatusCodes.INTERNAL_SERVER_ERROR
 *
 * */
exports.INTERNAL_SERVER_ERROR = 500;
/**
 * @deprecated Please use StatusCodes.LENGTH_REQUIRED
 *
 * */
exports.LENGTH_REQUIRED = 411;
/**
 * @deprecated Please use StatusCodes.LOCKED
 *
 * */
exports.LOCKED = 423;
/**
 * @deprecated Please use StatusCodes.METHOD_FAILURE
 *
 * */
exports.METHOD_FAILURE = 420;
/**
 * @deprecated Please use StatusCodes.METHOD_NOT_ALLOWED
 *
 * */
exports.METHOD_NOT_ALLOWED = 405;
/**
 * @deprecated Please use StatusCodes.MOVED_PERMANENTLY
 *
 * */
exports.MOVED_PERMANENTLY = 301;
/**
 * @deprecated Please use StatusCodes.MOVED_TEMPORARILY
 *
 * */
exports.MOVED_TEMPORARILY = 302;
/**
 * @deprecated Please use StatusCodes.MULTI_STATUS
 *
 * */
exports.MULTI_STATUS = 207;
/**
 * @deprecated Please use StatusCodes.MULTIPLE_CHOICES
 *
 * */
exports.MULTIPLE_CHOICES = 300;
/**
 * @deprecated Please use StatusCodes.NETWORK_AUTHENTICATION_REQUIRED
 *
 * */
exports.NETWORK_AUTHENTICATION_REQUIRED = 511;
/**
 * @deprecated Please use StatusCodes.NO_CONTENT
 *
 * */
exports.NO_CONTENT = 204;
/**
 * @deprecated Please use StatusCodes.NON_AUTHORITATIVE_INFORMATION
 *
 * */
exports.NON_AUTHORITATIVE_INFORMATION = 203;
/**
 * @deprecated Please use StatusCodes.NOT_ACCEPTABLE
 *
 * */
exports.NOT_ACCEPTABLE = 406;
/**
 * @deprecated Please use StatusCodes.NOT_FOUND
 *
 * */
exports.NOT_FOUND = 404;
/**
 * @deprecated Please use StatusCodes.NOT_IMPLEMENTED
 *
 * */
exports.NOT_IMPLEMENTED = 501;
/**
 * @deprecated Please use StatusCodes.NOT_MODIFIED
 *
 * */
exports.NOT_MODIFIED = 304;
/**
 * @deprecated Please use StatusCodes.OK
 *
 * */
exports.OK = 200;
/**
 * @deprecated Please use StatusCodes.PARTIAL_CONTENT
 *
 * */
exports.PARTIAL_CONTENT = 206;
/**
 * @deprecated Please use StatusCodes.PAYMENT_REQUIRED
 *
 * */
exports.PAYMENT_REQUIRED = 402;
/**
 * @deprecated Please use StatusCodes.PERMANENT_REDIRECT
 *
 * */
exports.PERMANENT_REDIRECT = 308;
/**
 * @deprecated Please use StatusCodes.PRECONDITION_FAILED
 *
 * */
exports.PRECONDITION_FAILED = 412;
/**
 * @deprecated Please use StatusCodes.PRECONDITION_REQUIRED
 *
 * */
exports.PRECONDITION_REQUIRED = 428;
/**
 * @deprecated Please use StatusCodes.PROCESSING
 *
 * */
exports.PROCESSING = 102;
/**
 * @deprecated Please use StatusCodes.PROXY_AUTHENTICATION_REQUIRED
 *
 * */
exports.PROXY_AUTHENTICATION_REQUIRED = 407;
/**
 * @deprecated Please use StatusCodes.REQUEST_HEADER_FIELDS_TOO_LARGE
 *
 * */
exports.REQUEST_HEADER_FIELDS_TOO_LARGE = 431;
/**
 * @deprecated Please use StatusCodes.REQUEST_TIMEOUT
 *
 * */
exports.REQUEST_TIMEOUT = 408;
/**
 * @deprecated Please use StatusCodes.REQUEST_TOO_LONG
 *
 * */
exports.REQUEST_TOO_LONG = 413;
/**
 * @deprecated Please use StatusCodes.REQUEST_URI_TOO_LONG
 *
 * */
exports.REQUEST_URI_TOO_LONG = 414;
/**
 * @deprecated Please use StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE
 *
 * */
exports.REQUESTED_RANGE_NOT_SATISFIABLE = 416;
/**
 * @deprecated Please use StatusCodes.RESET_CONTENT
 *
 * */
exports.RESET_CONTENT = 205;
/**
 * @deprecated Please use StatusCodes.SEE_OTHER
 *
 * */
exports.SEE_OTHER = 303;
/**
 * @deprecated Please use StatusCodes.SERVICE_UNAVAILABLE
 *
 * */
exports.SERVICE_UNAVAILABLE = 503;
/**
 * @deprecated Please use StatusCodes.SWITCHING_PROTOCOLS
 *
 * */
exports.SWITCHING_PROTOCOLS = 101;
/**
 * @deprecated Please use StatusCodes.TEMPORARY_REDIRECT
 *
 * */
exports.TEMPORARY_REDIRECT = 307;
/**
 * @deprecated Please use StatusCodes.TOO_MANY_REQUESTS
 *
 * */
exports.TOO_MANY_REQUESTS = 429;
/**
 * @deprecated Please use StatusCodes.UNAUTHORIZED
 *
 * */
exports.UNAUTHORIZED = 401;
/**
 * @deprecated Please use StatusCodes.UNPROCESSABLE_ENTITY
 *
 * */
exports.UNPROCESSABLE_ENTITY = 422;
/**
 * @deprecated Please use StatusCodes.UNSUPPORTED_MEDIA_TYPE
 *
 * */
exports.UNSUPPORTED_MEDIA_TYPE = 415;
/**
 * @deprecated Please use StatusCodes.USE_PROXY
 *
 * */
exports.USE_PROXY = 305;
exports.default = {
    ACCEPTED: exports.ACCEPTED,
    BAD_GATEWAY: exports.BAD_GATEWAY,
    BAD_REQUEST: exports.BAD_REQUEST,
    CONFLICT: exports.CONFLICT,
    CONTINUE: exports.CONTINUE,
    CREATED: exports.CREATED,
    EXPECTATION_FAILED: exports.EXPECTATION_FAILED,
    FORBIDDEN: exports.FORBIDDEN,
    GATEWAY_TIMEOUT: exports.GATEWAY_TIMEOUT,
    GONE: exports.GONE,
    HTTP_VERSION_NOT_SUPPORTED: exports.HTTP_VERSION_NOT_SUPPORTED,
    IM_A_TEAPOT: exports.IM_A_TEAPOT,
    INSUFFICIENT_SPACE_ON_RESOURCE: exports.INSUFFICIENT_SPACE_ON_RESOURCE,
    INSUFFICIENT_STORAGE: exports.INSUFFICIENT_STORAGE,
    INTERNAL_SERVER_ERROR: exports.INTERNAL_SERVER_ERROR,
    LENGTH_REQUIRED: exports.LENGTH_REQUIRED,
    LOCKED: exports.LOCKED,
    METHOD_FAILURE: exports.METHOD_FAILURE,
    METHOD_NOT_ALLOWED: exports.METHOD_NOT_ALLOWED,
    MOVED_PERMANENTLY: exports.MOVED_PERMANENTLY,
    MOVED_TEMPORARILY: exports.MOVED_TEMPORARILY,
    MULTI_STATUS: exports.MULTI_STATUS,
    MULTIPLE_CHOICES: exports.MULTIPLE_CHOICES,
    NETWORK_AUTHENTICATION_REQUIRED: exports.NETWORK_AUTHENTICATION_REQUIRED,
    NO_CONTENT: exports.NO_CONTENT,
    NON_AUTHORITATIVE_INFORMATION: exports.NON_AUTHORITATIVE_INFORMATION,
    NOT_ACCEPTABLE: exports.NOT_ACCEPTABLE,
    NOT_FOUND: exports.NOT_FOUND,
    NOT_IMPLEMENTED: exports.NOT_IMPLEMENTED,
    NOT_MODIFIED: exports.NOT_MODIFIED,
    OK: exports.OK,
    PARTIAL_CONTENT: exports.PARTIAL_CONTENT,
    PAYMENT_REQUIRED: exports.PAYMENT_REQUIRED,
    PERMANENT_REDIRECT: exports.PERMANENT_REDIRECT,
    PRECONDITION_FAILED: exports.PRECONDITION_FAILED,
    PRECONDITION_REQUIRED: exports.PRECONDITION_REQUIRED,
    PROCESSING: exports.PROCESSING,
    PROXY_AUTHENTICATION_REQUIRED: exports.PROXY_AUTHENTICATION_REQUIRED,
    REQUEST_HEADER_FIELDS_TOO_LARGE: exports.REQUEST_HEADER_FIELDS_TOO_LARGE,
    REQUEST_TIMEOUT: exports.REQUEST_TIMEOUT,
    REQUEST_TOO_LONG: exports.REQUEST_TOO_LONG,
    REQUEST_URI_TOO_LONG: exports.REQUEST_URI_TOO_LONG,
    REQUESTED_RANGE_NOT_SATISFIABLE: exports.REQUESTED_RANGE_NOT_SATISFIABLE,
    RESET_CONTENT: exports.RESET_CONTENT,
    SEE_OTHER: exports.SEE_OTHER,
    SERVICE_UNAVAILABLE: exports.SERVICE_UNAVAILABLE,
    SWITCHING_PROTOCOLS: exports.SWITCHING_PROTOCOLS,
    TEMPORARY_REDIRECT: exports.TEMPORARY_REDIRECT,
    TOO_MANY_REQUESTS: exports.TOO_MANY_REQUESTS,
    UNAUTHORIZED: exports.UNAUTHORIZED,
    UNPROCESSABLE_ENTITY: exports.UNPROCESSABLE_ENTITY,
    UNSUPPORTED_MEDIA_TYPE: exports.UNSUPPORTED_MEDIA_TYPE,
    USE_PROXY: exports.USE_PROXY,
};

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasonPhrases = void 0;
// Generated file. Do not edit
var ReasonPhrases;
(function (ReasonPhrases) {
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.3
     *
     * The request has been received but not yet acted upon. It is non-committal, meaning that there is no way in HTTP to later send an asynchronous response indicating the outcome of processing the request. It is intended for cases where another process or server handles the request, or for batch processing.
     */
    ReasonPhrases["ACCEPTED"] = "Accepted";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.3
     *
     * This error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response.
     */
    ReasonPhrases["BAD_GATEWAY"] = "Bad Gateway";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.1
     *
     * This response means that server could not understand the request due to invalid syntax.
     */
    ReasonPhrases["BAD_REQUEST"] = "Bad Request";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.8
     *
     * This response is sent when a request conflicts with the current state of the server.
     */
    ReasonPhrases["CONFLICT"] = "Conflict";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.2.1
     *
     * This interim response indicates that everything so far is OK and that the client should continue with the request or ignore it if it is already finished.
     */
    ReasonPhrases["CONTINUE"] = "Continue";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.2
     *
     * The request has succeeded and a new resource has been created as a result of it. This is typically the response sent after a PUT request.
     */
    ReasonPhrases["CREATED"] = "Created";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.14
     *
     * This response code means the expectation indicated by the Expect request header field can't be met by the server.
     */
    ReasonPhrases["EXPECTATION_FAILED"] = "Expectation Failed";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.5
     *
     * The request failed due to failure of a previous request.
     */
    ReasonPhrases["FAILED_DEPENDENCY"] = "Failed Dependency";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.3
     *
     * The client does not have access rights to the content, i.e. they are unauthorized, so server is rejecting to give proper response. Unlike 401, the client's identity is known to the server.
     */
    ReasonPhrases["FORBIDDEN"] = "Forbidden";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.5
     *
     * This error response is given when the server is acting as a gateway and cannot get a response in time.
     */
    ReasonPhrases["GATEWAY_TIMEOUT"] = "Gateway Timeout";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.9
     *
     * This response would be sent when the requested content has been permenantly deleted from server, with no forwarding address. Clients are expected to remove their caches and links to the resource. The HTTP specification intends this status code to be used for "limited-time, promotional services". APIs should not feel compelled to indicate resources that have been deleted with this status code.
     */
    ReasonPhrases["GONE"] = "Gone";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.6
     *
     * The HTTP version used in the request is not supported by the server.
     */
    ReasonPhrases["HTTP_VERSION_NOT_SUPPORTED"] = "HTTP Version Not Supported";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2324#section-2.3.2
     *
     * Any attempt to brew coffee with a teapot should result in the error code "418 I'm a teapot". The resulting entity body MAY be short and stout.
     */
    ReasonPhrases["IM_A_TEAPOT"] = "I'm a teapot";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.6
     *
     * The 507 (Insufficient Storage) status code means the method could not be performed on the resource because the server is unable to store the representation needed to successfully complete the request. This condition is considered to be temporary. If the request which received this status code was the result of a user action, the request MUST NOT be repeated until it is requested by a separate user action.
     */
    ReasonPhrases["INSUFFICIENT_SPACE_ON_RESOURCE"] = "Insufficient Space on Resource";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.6
     *
     * The server has an internal configuration error: the chosen variant resource is configured to engage in transparent content negotiation itself, and is therefore not a proper end point in the negotiation process.
     */
    ReasonPhrases["INSUFFICIENT_STORAGE"] = "Insufficient Storage";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.1
     *
     * The server encountered an unexpected condition that prevented it from fulfilling the request.
     */
    ReasonPhrases["INTERNAL_SERVER_ERROR"] = "Internal Server Error";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.10
     *
     * The server rejected the request because the Content-Length header field is not defined and the server requires it.
     */
    ReasonPhrases["LENGTH_REQUIRED"] = "Length Required";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.4
     *
     * The resource that is being accessed is locked.
     */
    ReasonPhrases["LOCKED"] = "Locked";
    /**
     * @deprecated
     * Official Documentation @ https://tools.ietf.org/rfcdiff?difftype=--hwdiff&url2=draft-ietf-webdav-protocol-06.txt
     *
     * A deprecated response used by the Spring Framework when a method has failed.
     */
    ReasonPhrases["METHOD_FAILURE"] = "Method Failure";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.5
     *
     * The request method is known by the server but has been disabled and cannot be used. For example, an API may forbid DELETE-ing a resource. The two mandatory methods, GET and HEAD, must never be disabled and should not return this error code.
     */
    ReasonPhrases["METHOD_NOT_ALLOWED"] = "Method Not Allowed";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.2
     *
     * This response code means that URI of requested resource has been changed. Probably, new URI would be given in the response.
     */
    ReasonPhrases["MOVED_PERMANENTLY"] = "Moved Permanently";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.3
     *
     * This response code means that URI of requested resource has been changed temporarily. New changes in the URI might be made in the future. Therefore, this same URI should be used by the client in future requests.
     */
    ReasonPhrases["MOVED_TEMPORARILY"] = "Moved Temporarily";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.2
     *
     * A Multi-Status response conveys information about multiple resources in situations where multiple status codes might be appropriate.
     */
    ReasonPhrases["MULTI_STATUS"] = "Multi-Status";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.1
     *
     * The request has more than one possible responses. User-agent or user should choose one of them. There is no standardized way to choose one of the responses.
     */
    ReasonPhrases["MULTIPLE_CHOICES"] = "Multiple Choices";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-6
     *
     * The 511 status code indicates that the client needs to authenticate to gain network access.
     */
    ReasonPhrases["NETWORK_AUTHENTICATION_REQUIRED"] = "Network Authentication Required";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.5
     *
     * There is no content to send for this request, but the headers may be useful. The user-agent may update its cached headers for this resource with the new ones.
     */
    ReasonPhrases["NO_CONTENT"] = "No Content";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.4
     *
     * This response code means returned meta-information set is not exact set as available from the origin server, but collected from a local or a third party copy. Except this condition, 200 OK response should be preferred instead of this response.
     */
    ReasonPhrases["NON_AUTHORITATIVE_INFORMATION"] = "Non Authoritative Information";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.6
     *
     * This response is sent when the web server, after performing server-driven content negotiation, doesn't find any content following the criteria given by the user agent.
     */
    ReasonPhrases["NOT_ACCEPTABLE"] = "Not Acceptable";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.4
     *
     * The server can not find requested resource. In the browser, this means the URL is not recognized. In an API, this can also mean that the endpoint is valid but the resource itself does not exist. Servers may also send this response instead of 403 to hide the existence of a resource from an unauthorized client. This response code is probably the most famous one due to its frequent occurence on the web.
     */
    ReasonPhrases["NOT_FOUND"] = "Not Found";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.2
     *
     * The request method is not supported by the server and cannot be handled. The only methods that servers are required to support (and therefore that must not return this code) are GET and HEAD.
     */
    ReasonPhrases["NOT_IMPLEMENTED"] = "Not Implemented";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7232#section-4.1
     *
     * This is used for caching purposes. It is telling to client that response has not been modified. So, client can continue to use same cached version of response.
     */
    ReasonPhrases["NOT_MODIFIED"] = "Not Modified";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.1
     *
     * The request has succeeded. The meaning of a success varies depending on the HTTP method:
     * GET: The resource has been fetched and is transmitted in the message body.
     * HEAD: The entity headers are in the message body.
     * POST: The resource describing the result of the action is transmitted in the message body.
     * TRACE: The message body contains the request message as received by the server
     */
    ReasonPhrases["OK"] = "OK";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7233#section-4.1
     *
     * This response code is used because of range header sent by the client to separate download into multiple streams.
     */
    ReasonPhrases["PARTIAL_CONTENT"] = "Partial Content";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.2
     *
     * This response code is reserved for future use. Initial aim for creating this code was using it for digital payment systems however this is not used currently.
     */
    ReasonPhrases["PAYMENT_REQUIRED"] = "Payment Required";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7538#section-3
     *
     * This means that the resource is now permanently located at another URI, specified by the Location: HTTP Response header. This has the same semantics as the 301 Moved Permanently HTTP response code, with the exception that the user agent must not change the HTTP method used: if a POST was used in the first request, a POST must be used in the second request.
     */
    ReasonPhrases["PERMANENT_REDIRECT"] = "Permanent Redirect";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7232#section-4.2
     *
     * The client has indicated preconditions in its headers which the server does not meet.
     */
    ReasonPhrases["PRECONDITION_FAILED"] = "Precondition Failed";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-3
     *
     * The origin server requires the request to be conditional. Intended to prevent the 'lost update' problem, where a client GETs a resource's state, modifies it, and PUTs it back to the server, when meanwhile a third party has modified the state on the server, leading to a conflict.
     */
    ReasonPhrases["PRECONDITION_REQUIRED"] = "Precondition Required";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.1
     *
     * This code indicates that the server has received and is processing the request, but no response is available yet.
     */
    ReasonPhrases["PROCESSING"] = "Processing";
    /**
     * Official Documentation @ https://www.rfc-editor.org/rfc/rfc8297#page-3
     *
     * This code indicates to the client that the server is likely to send a final response with the header fields included in the informational response.
     */
    ReasonPhrases["EARLY_HINTS"] = "Early Hints";
    /**
     * Official Documentation @ https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.15
     *
     * The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol.
     */
    ReasonPhrases["UPGRADE_REQUIRED"] = "Upgrade Required";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7235#section-3.2
     *
     * This is similar to 401 but authentication is needed to be done by a proxy.
     */
    ReasonPhrases["PROXY_AUTHENTICATION_REQUIRED"] = "Proxy Authentication Required";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-5
     *
     * The server is unwilling to process the request because its header fields are too large. The request MAY be resubmitted after reducing the size of the request header fields.
     */
    ReasonPhrases["REQUEST_HEADER_FIELDS_TOO_LARGE"] = "Request Header Fields Too Large";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.7
     *
     * This response is sent on an idle connection by some servers, even without any previous request by the client. It means that the server would like to shut down this unused connection. This response is used much more since some browsers, like Chrome, Firefox 27+, or IE9, use HTTP pre-connection mechanisms to speed up surfing. Also note that some servers merely shut down the connection without sending this message.
     */
    ReasonPhrases["REQUEST_TIMEOUT"] = "Request Timeout";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.11
     *
     * Request entity is larger than limits defined by server; the server might close the connection or return an Retry-After header field.
     */
    ReasonPhrases["REQUEST_TOO_LONG"] = "Request Entity Too Large";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.12
     *
     * The URI requested by the client is longer than the server is willing to interpret.
     */
    ReasonPhrases["REQUEST_URI_TOO_LONG"] = "Request-URI Too Long";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7233#section-4.4
     *
     * The range specified by the Range header field in the request can't be fulfilled; it's possible that the range is outside the size of the target URI's data.
     */
    ReasonPhrases["REQUESTED_RANGE_NOT_SATISFIABLE"] = "Requested Range Not Satisfiable";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.6
     *
     * This response code is sent after accomplishing request to tell user agent reset document view which sent this request.
     */
    ReasonPhrases["RESET_CONTENT"] = "Reset Content";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.4
     *
     * Server sent this response to directing client to get requested resource to another URI with an GET request.
     */
    ReasonPhrases["SEE_OTHER"] = "See Other";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.4
     *
     * The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded. Note that together with this response, a user-friendly page explaining the problem should be sent. This responses should be used for temporary conditions and the Retry-After: HTTP header should, if possible, contain the estimated time before the recovery of the service. The webmaster must also take care about the caching-related headers that are sent along with this response, as these temporary condition responses should usually not be cached.
     */
    ReasonPhrases["SERVICE_UNAVAILABLE"] = "Service Unavailable";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.2.2
     *
     * This code is sent in response to an Upgrade request header by the client, and indicates the protocol the server is switching too.
     */
    ReasonPhrases["SWITCHING_PROTOCOLS"] = "Switching Protocols";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.7
     *
     * Server sent this response to directing client to get requested resource to another URI with same method that used prior request. This has the same semantic than the 302 Found HTTP response code, with the exception that the user agent must not change the HTTP method used: if a POST was used in the first request, a POST must be used in the second request.
     */
    ReasonPhrases["TEMPORARY_REDIRECT"] = "Temporary Redirect";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-4
     *
     * The user has sent too many requests in a given amount of time ("rate limiting").
     */
    ReasonPhrases["TOO_MANY_REQUESTS"] = "Too Many Requests";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7235#section-3.1
     *
     * Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.
     */
    ReasonPhrases["UNAUTHORIZED"] = "Unauthorized";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7725
     *
     * The user-agent requested a resource that cannot legally be provided, such as a web page censored by a government.
     */
    ReasonPhrases["UNAVAILABLE_FOR_LEGAL_REASONS"] = "Unavailable For Legal Reasons";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.3
     *
     * The request was well-formed but was unable to be followed due to semantic errors.
     */
    ReasonPhrases["UNPROCESSABLE_ENTITY"] = "Unprocessable Entity";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.13
     *
     * The media format of the requested data is not supported by the server, so the server is rejecting the request.
     */
    ReasonPhrases["UNSUPPORTED_MEDIA_TYPE"] = "Unsupported Media Type";
    /**
     * @deprecated
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.6
     *
     * Was defined in a previous version of the HTTP specification to indicate that a requested response must be accessed by a proxy. It has been deprecated due to security concerns regarding in-band configuration of a proxy.
     */
    ReasonPhrases["USE_PROXY"] = "Use Proxy";
    /**
     * Official Documentation @ https://datatracker.ietf.org/doc/html/rfc7540#section-9.1.2
     *
     * Defined in the specification of HTTP/2 to indicate that a server is not able to produce a response for the combination of scheme and authority that are included in the request URI.
     */
    ReasonPhrases["MISDIRECTED_REQUEST"] = "Misdirected Request";
})(ReasonPhrases = exports.ReasonPhrases || (exports.ReasonPhrases = {}));

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCodes = void 0;
// Generated file. Do not edit
var StatusCodes;
(function (StatusCodes) {
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.2.1
     *
     * This interim response indicates that everything so far is OK and that the client should continue with the request or ignore it if it is already finished.
     */
    StatusCodes[StatusCodes["CONTINUE"] = 100] = "CONTINUE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.2.2
     *
     * This code is sent in response to an Upgrade request header by the client, and indicates the protocol the server is switching too.
     */
    StatusCodes[StatusCodes["SWITCHING_PROTOCOLS"] = 101] = "SWITCHING_PROTOCOLS";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.1
     *
     * This code indicates that the server has received and is processing the request, but no response is available yet.
     */
    StatusCodes[StatusCodes["PROCESSING"] = 102] = "PROCESSING";
    /**
     * Official Documentation @ https://www.rfc-editor.org/rfc/rfc8297#page-3
     *
     * This code indicates to the client that the server is likely to send a final response with the header fields included in the informational response.
     */
    StatusCodes[StatusCodes["EARLY_HINTS"] = 103] = "EARLY_HINTS";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.1
     *
     * The request has succeeded. The meaning of a success varies depending on the HTTP method:
     * GET: The resource has been fetched and is transmitted in the message body.
     * HEAD: The entity headers are in the message body.
     * POST: The resource describing the result of the action is transmitted in the message body.
     * TRACE: The message body contains the request message as received by the server
     */
    StatusCodes[StatusCodes["OK"] = 200] = "OK";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.2
     *
     * The request has succeeded and a new resource has been created as a result of it. This is typically the response sent after a PUT request.
     */
    StatusCodes[StatusCodes["CREATED"] = 201] = "CREATED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.3
     *
     * The request has been received but not yet acted upon. It is non-committal, meaning that there is no way in HTTP to later send an asynchronous response indicating the outcome of processing the request. It is intended for cases where another process or server handles the request, or for batch processing.
     */
    StatusCodes[StatusCodes["ACCEPTED"] = 202] = "ACCEPTED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.4
     *
     * This response code means returned meta-information set is not exact set as available from the origin server, but collected from a local or a third party copy. Except this condition, 200 OK response should be preferred instead of this response.
     */
    StatusCodes[StatusCodes["NON_AUTHORITATIVE_INFORMATION"] = 203] = "NON_AUTHORITATIVE_INFORMATION";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.5
     *
     * There is no content to send for this request, but the headers may be useful. The user-agent may update its cached headers for this resource with the new ones.
     */
    StatusCodes[StatusCodes["NO_CONTENT"] = 204] = "NO_CONTENT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.3.6
     *
     * This response code is sent after accomplishing request to tell user agent reset document view which sent this request.
     */
    StatusCodes[StatusCodes["RESET_CONTENT"] = 205] = "RESET_CONTENT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7233#section-4.1
     *
     * This response code is used because of range header sent by the client to separate download into multiple streams.
     */
    StatusCodes[StatusCodes["PARTIAL_CONTENT"] = 206] = "PARTIAL_CONTENT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.2
     *
     * A Multi-Status response conveys information about multiple resources in situations where multiple status codes might be appropriate.
     */
    StatusCodes[StatusCodes["MULTI_STATUS"] = 207] = "MULTI_STATUS";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.1
     *
     * The request has more than one possible responses. User-agent or user should choose one of them. There is no standardized way to choose one of the responses.
     */
    StatusCodes[StatusCodes["MULTIPLE_CHOICES"] = 300] = "MULTIPLE_CHOICES";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.2
     *
     * This response code means that URI of requested resource has been changed. Probably, new URI would be given in the response.
     */
    StatusCodes[StatusCodes["MOVED_PERMANENTLY"] = 301] = "MOVED_PERMANENTLY";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.3
     *
     * This response code means that URI of requested resource has been changed temporarily. New changes in the URI might be made in the future. Therefore, this same URI should be used by the client in future requests.
     */
    StatusCodes[StatusCodes["MOVED_TEMPORARILY"] = 302] = "MOVED_TEMPORARILY";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.4
     *
     * Server sent this response to directing client to get requested resource to another URI with an GET request.
     */
    StatusCodes[StatusCodes["SEE_OTHER"] = 303] = "SEE_OTHER";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7232#section-4.1
     *
     * This is used for caching purposes. It is telling to client that response has not been modified. So, client can continue to use same cached version of response.
     */
    StatusCodes[StatusCodes["NOT_MODIFIED"] = 304] = "NOT_MODIFIED";
    /**
     * @deprecated
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.6
     *
     * Was defined in a previous version of the HTTP specification to indicate that a requested response must be accessed by a proxy. It has been deprecated due to security concerns regarding in-band configuration of a proxy.
     */
    StatusCodes[StatusCodes["USE_PROXY"] = 305] = "USE_PROXY";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.4.7
     *
     * Server sent this response to directing client to get requested resource to another URI with same method that used prior request. This has the same semantic than the 302 Found HTTP response code, with the exception that the user agent must not change the HTTP method used: if a POST was used in the first request, a POST must be used in the second request.
     */
    StatusCodes[StatusCodes["TEMPORARY_REDIRECT"] = 307] = "TEMPORARY_REDIRECT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7538#section-3
     *
     * This means that the resource is now permanently located at another URI, specified by the Location: HTTP Response header. This has the same semantics as the 301 Moved Permanently HTTP response code, with the exception that the user agent must not change the HTTP method used: if a POST was used in the first request, a POST must be used in the second request.
     */
    StatusCodes[StatusCodes["PERMANENT_REDIRECT"] = 308] = "PERMANENT_REDIRECT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.1
     *
     * This response means that server could not understand the request due to invalid syntax.
     */
    StatusCodes[StatusCodes["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7235#section-3.1
     *
     * Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.
     */
    StatusCodes[StatusCodes["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.2
     *
     * This response code is reserved for future use. Initial aim for creating this code was using it for digital payment systems however this is not used currently.
     */
    StatusCodes[StatusCodes["PAYMENT_REQUIRED"] = 402] = "PAYMENT_REQUIRED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.3
     *
     * The client does not have access rights to the content, i.e. they are unauthorized, so server is rejecting to give proper response. Unlike 401, the client's identity is known to the server.
     */
    StatusCodes[StatusCodes["FORBIDDEN"] = 403] = "FORBIDDEN";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.4
     *
     * The server can not find requested resource. In the browser, this means the URL is not recognized. In an API, this can also mean that the endpoint is valid but the resource itself does not exist. Servers may also send this response instead of 403 to hide the existence of a resource from an unauthorized client. This response code is probably the most famous one due to its frequent occurence on the web.
     */
    StatusCodes[StatusCodes["NOT_FOUND"] = 404] = "NOT_FOUND";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.5
     *
     * The request method is known by the server but has been disabled and cannot be used. For example, an API may forbid DELETE-ing a resource. The two mandatory methods, GET and HEAD, must never be disabled and should not return this error code.
     */
    StatusCodes[StatusCodes["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.6
     *
     * This response is sent when the web server, after performing server-driven content negotiation, doesn't find any content following the criteria given by the user agent.
     */
    StatusCodes[StatusCodes["NOT_ACCEPTABLE"] = 406] = "NOT_ACCEPTABLE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7235#section-3.2
     *
     * This is similar to 401 but authentication is needed to be done by a proxy.
     */
    StatusCodes[StatusCodes["PROXY_AUTHENTICATION_REQUIRED"] = 407] = "PROXY_AUTHENTICATION_REQUIRED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.7
     *
     * This response is sent on an idle connection by some servers, even without any previous request by the client. It means that the server would like to shut down this unused connection. This response is used much more since some browsers, like Chrome, Firefox 27+, or IE9, use HTTP pre-connection mechanisms to speed up surfing. Also note that some servers merely shut down the connection without sending this message.
     */
    StatusCodes[StatusCodes["REQUEST_TIMEOUT"] = 408] = "REQUEST_TIMEOUT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.8
     *
     * This response is sent when a request conflicts with the current state of the server.
     */
    StatusCodes[StatusCodes["CONFLICT"] = 409] = "CONFLICT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.9
     *
     * This response would be sent when the requested content has been permenantly deleted from server, with no forwarding address. Clients are expected to remove their caches and links to the resource. The HTTP specification intends this status code to be used for "limited-time, promotional services". APIs should not feel compelled to indicate resources that have been deleted with this status code.
     */
    StatusCodes[StatusCodes["GONE"] = 410] = "GONE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.10
     *
     * The server rejected the request because the Content-Length header field is not defined and the server requires it.
     */
    StatusCodes[StatusCodes["LENGTH_REQUIRED"] = 411] = "LENGTH_REQUIRED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7232#section-4.2
     *
     * The client has indicated preconditions in its headers which the server does not meet.
     */
    StatusCodes[StatusCodes["PRECONDITION_FAILED"] = 412] = "PRECONDITION_FAILED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.11
     *
     * Request entity is larger than limits defined by server; the server might close the connection or return an Retry-After header field.
     */
    StatusCodes[StatusCodes["REQUEST_TOO_LONG"] = 413] = "REQUEST_TOO_LONG";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.12
     *
     * The URI requested by the client is longer than the server is willing to interpret.
     */
    StatusCodes[StatusCodes["REQUEST_URI_TOO_LONG"] = 414] = "REQUEST_URI_TOO_LONG";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.13
     *
     * The media format of the requested data is not supported by the server, so the server is rejecting the request.
     */
    StatusCodes[StatusCodes["UNSUPPORTED_MEDIA_TYPE"] = 415] = "UNSUPPORTED_MEDIA_TYPE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7233#section-4.4
     *
     * The range specified by the Range header field in the request can't be fulfilled; it's possible that the range is outside the size of the target URI's data.
     */
    StatusCodes[StatusCodes["REQUESTED_RANGE_NOT_SATISFIABLE"] = 416] = "REQUESTED_RANGE_NOT_SATISFIABLE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.5.14
     *
     * This response code means the expectation indicated by the Expect request header field can't be met by the server.
     */
    StatusCodes[StatusCodes["EXPECTATION_FAILED"] = 417] = "EXPECTATION_FAILED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2324#section-2.3.2
     *
     * Any attempt to brew coffee with a teapot should result in the error code "418 I'm a teapot". The resulting entity body MAY be short and stout.
     */
    StatusCodes[StatusCodes["IM_A_TEAPOT"] = 418] = "IM_A_TEAPOT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.6
     *
     * The 507 (Insufficient Storage) status code means the method could not be performed on the resource because the server is unable to store the representation needed to successfully complete the request. This condition is considered to be temporary. If the request which received this status code was the result of a user action, the request MUST NOT be repeated until it is requested by a separate user action.
     */
    StatusCodes[StatusCodes["INSUFFICIENT_SPACE_ON_RESOURCE"] = 419] = "INSUFFICIENT_SPACE_ON_RESOURCE";
    /**
     * @deprecated
     * Official Documentation @ https://tools.ietf.org/rfcdiff?difftype=--hwdiff&url2=draft-ietf-webdav-protocol-06.txt
     *
     * A deprecated response used by the Spring Framework when a method has failed.
     */
    StatusCodes[StatusCodes["METHOD_FAILURE"] = 420] = "METHOD_FAILURE";
    /**
     * Official Documentation @ https://datatracker.ietf.org/doc/html/rfc7540#section-9.1.2
     *
     * Defined in the specification of HTTP/2 to indicate that a server is not able to produce a response for the combination of scheme and authority that are included in the request URI.
     */
    StatusCodes[StatusCodes["MISDIRECTED_REQUEST"] = 421] = "MISDIRECTED_REQUEST";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.3
     *
     * The request was well-formed but was unable to be followed due to semantic errors.
     */
    StatusCodes[StatusCodes["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.4
     *
     * The resource that is being accessed is locked.
     */
    StatusCodes[StatusCodes["LOCKED"] = 423] = "LOCKED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.5
     *
     * The request failed due to failure of a previous request.
     */
    StatusCodes[StatusCodes["FAILED_DEPENDENCY"] = 424] = "FAILED_DEPENDENCY";
    /**
     * Official Documentation @ https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.15
     *
     * The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol.
     */
    StatusCodes[StatusCodes["UPGRADE_REQUIRED"] = 426] = "UPGRADE_REQUIRED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-3
     *
     * The origin server requires the request to be conditional. Intended to prevent the 'lost update' problem, where a client GETs a resource's state, modifies it, and PUTs it back to the server, when meanwhile a third party has modified the state on the server, leading to a conflict.
     */
    StatusCodes[StatusCodes["PRECONDITION_REQUIRED"] = 428] = "PRECONDITION_REQUIRED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-4
     *
     * The user has sent too many requests in a given amount of time ("rate limiting").
     */
    StatusCodes[StatusCodes["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-5
     *
     * The server is unwilling to process the request because its header fields are too large. The request MAY be resubmitted after reducing the size of the request header fields.
     */
    StatusCodes[StatusCodes["REQUEST_HEADER_FIELDS_TOO_LARGE"] = 431] = "REQUEST_HEADER_FIELDS_TOO_LARGE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7725
     *
     * The user-agent requested a resource that cannot legally be provided, such as a web page censored by a government.
     */
    StatusCodes[StatusCodes["UNAVAILABLE_FOR_LEGAL_REASONS"] = 451] = "UNAVAILABLE_FOR_LEGAL_REASONS";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.1
     *
     * The server encountered an unexpected condition that prevented it from fulfilling the request.
     */
    StatusCodes[StatusCodes["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.2
     *
     * The request method is not supported by the server and cannot be handled. The only methods that servers are required to support (and therefore that must not return this code) are GET and HEAD.
     */
    StatusCodes[StatusCodes["NOT_IMPLEMENTED"] = 501] = "NOT_IMPLEMENTED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.3
     *
     * This error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response.
     */
    StatusCodes[StatusCodes["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.4
     *
     * The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded. Note that together with this response, a user-friendly page explaining the problem should be sent. This responses should be used for temporary conditions and the Retry-After: HTTP header should, if possible, contain the estimated time before the recovery of the service. The webmaster must also take care about the caching-related headers that are sent along with this response, as these temporary condition responses should usually not be cached.
     */
    StatusCodes[StatusCodes["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.5
     *
     * This error response is given when the server is acting as a gateway and cannot get a response in time.
     */
    StatusCodes[StatusCodes["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc7231#section-6.6.6
     *
     * The HTTP version used in the request is not supported by the server.
     */
    StatusCodes[StatusCodes["HTTP_VERSION_NOT_SUPPORTED"] = 505] = "HTTP_VERSION_NOT_SUPPORTED";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc2518#section-10.6
     *
     * The server has an internal configuration error: the chosen variant resource is configured to engage in transparent content negotiation itself, and is therefore not a proper end point in the negotiation process.
     */
    StatusCodes[StatusCodes["INSUFFICIENT_STORAGE"] = 507] = "INSUFFICIENT_STORAGE";
    /**
     * Official Documentation @ https://tools.ietf.org/html/rfc6585#section-6
     *
     * The 511 status code indicates that the client needs to authenticate to gain network access.
     */
    StatusCodes[StatusCodes["NETWORK_AUTHENTICATION_REQUIRED"] = 511] = "NETWORK_AUTHENTICATION_REQUIRED";
})(StatusCodes = exports.StatusCodes || (exports.StatusCodes = {}));

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusText = exports.getStatusCode = exports.getReasonPhrase = void 0;
var utils_1 = require("./utils");
/**
 * Returns the reason phrase for the given status code.
 * If the given status code does not exist, an error is thrown.
 *
 * @param {number|string} statusCode The HTTP status code
 * @returns {string} The associated reason phrase (e.g. "Bad Request", "OK")
 * */
function getReasonPhrase(statusCode) {
    var result = utils_1.statusCodeToReasonPhrase[statusCode.toString()];
    if (!result) {
        throw new Error("Status code does not exist: " + statusCode);
    }
    return result;
}
exports.getReasonPhrase = getReasonPhrase;
/**
 * Returns the status code for the given reason phrase.
 * If the given reason phrase does not exist, undefined is returned.
 *
 * @param {string} reasonPhrase The HTTP reason phrase (e.g. "Bad Request", "OK")
 * @returns {string} The associated status code
 * */
function getStatusCode(reasonPhrase) {
    var result = utils_1.reasonPhraseToStatusCode[reasonPhrase];
    if (!result) {
        throw new Error("Reason phrase does not exist: " + reasonPhrase);
    }
    return result;
}
exports.getStatusCode = getStatusCode;
/**
 * @deprecated
 *
 * Returns the reason phrase for the given status code.
 * If the given status code does not exist, undefined is returned.
 *
 * Deprecated in favor of getReasonPhrase
 *
 * @param {number|string} statusCode The HTTP status code
 * @returns {string|undefined} The associated reason phrase (e.g. "Bad Request", "OK")
 * */
exports.getStatusText = getReasonPhrase;

},{"./utils":12}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reasonPhraseToStatusCode = exports.statusCodeToReasonPhrase = void 0;
// Generated file. Do not edit
exports.statusCodeToReasonPhrase = {
    "202": "Accepted",
    "502": "Bad Gateway",
    "400": "Bad Request",
    "409": "Conflict",
    "100": "Continue",
    "201": "Created",
    "417": "Expectation Failed",
    "424": "Failed Dependency",
    "403": "Forbidden",
    "504": "Gateway Timeout",
    "410": "Gone",
    "505": "HTTP Version Not Supported",
    "418": "I'm a teapot",
    "419": "Insufficient Space on Resource",
    "507": "Insufficient Storage",
    "500": "Internal Server Error",
    "411": "Length Required",
    "423": "Locked",
    "420": "Method Failure",
    "405": "Method Not Allowed",
    "301": "Moved Permanently",
    "302": "Moved Temporarily",
    "207": "Multi-Status",
    "300": "Multiple Choices",
    "511": "Network Authentication Required",
    "204": "No Content",
    "203": "Non Authoritative Information",
    "406": "Not Acceptable",
    "404": "Not Found",
    "501": "Not Implemented",
    "304": "Not Modified",
    "200": "OK",
    "206": "Partial Content",
    "402": "Payment Required",
    "308": "Permanent Redirect",
    "412": "Precondition Failed",
    "428": "Precondition Required",
    "102": "Processing",
    "103": "Early Hints",
    "426": "Upgrade Required",
    "407": "Proxy Authentication Required",
    "431": "Request Header Fields Too Large",
    "408": "Request Timeout",
    "413": "Request Entity Too Large",
    "414": "Request-URI Too Long",
    "416": "Requested Range Not Satisfiable",
    "205": "Reset Content",
    "303": "See Other",
    "503": "Service Unavailable",
    "101": "Switching Protocols",
    "307": "Temporary Redirect",
    "429": "Too Many Requests",
    "401": "Unauthorized",
    "451": "Unavailable For Legal Reasons",
    "422": "Unprocessable Entity",
    "415": "Unsupported Media Type",
    "305": "Use Proxy",
    "421": "Misdirected Request"
};
exports.reasonPhraseToStatusCode = {
    "Accepted": 202,
    "Bad Gateway": 502,
    "Bad Request": 400,
    "Conflict": 409,
    "Continue": 100,
    "Created": 201,
    "Expectation Failed": 417,
    "Failed Dependency": 424,
    "Forbidden": 403,
    "Gateway Timeout": 504,
    "Gone": 410,
    "HTTP Version Not Supported": 505,
    "I'm a teapot": 418,
    "Insufficient Space on Resource": 419,
    "Insufficient Storage": 507,
    "Internal Server Error": 500,
    "Length Required": 411,
    "Locked": 423,
    "Method Failure": 420,
    "Method Not Allowed": 405,
    "Moved Permanently": 301,
    "Moved Temporarily": 302,
    "Multi-Status": 207,
    "Multiple Choices": 300,
    "Network Authentication Required": 511,
    "No Content": 204,
    "Non Authoritative Information": 203,
    "Not Acceptable": 406,
    "Not Found": 404,
    "Not Implemented": 501,
    "Not Modified": 304,
    "OK": 200,
    "Partial Content": 206,
    "Payment Required": 402,
    "Permanent Redirect": 308,
    "Precondition Failed": 412,
    "Precondition Required": 428,
    "Processing": 102,
    "Early Hints": 103,
    "Upgrade Required": 426,
    "Proxy Authentication Required": 407,
    "Request Header Fields Too Large": 431,
    "Request Timeout": 408,
    "Request Entity Too Large": 413,
    "Request-URI Too Long": 414,
    "Requested Range Not Satisfiable": 416,
    "Reset Content": 205,
    "See Other": 303,
    "Service Unavailable": 503,
    "Switching Protocols": 101,
    "Temporary Redirect": 307,
    "Too Many Requests": 429,
    "Unauthorized": 401,
    "Unavailable For Legal Reasons": 451,
    "Unprocessable Entity": 422,
    "Unsupported Media Type": 415,
    "Use Proxy": 305,
    "Misdirected Request": 421
};

},{}]},{},[2]);
