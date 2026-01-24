import AlertRenderer from './alertrenderer.js';
import { StatusCodes } from 'http-status-codes';
import SpecViz from './specviz.js';
import OverlaySongPlayer from './songplayer.js';
import SoundSequencer from './soundsequencer.js';
import EventDispatcher from './eventdispatcher.js';

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
overlaySongElement.volume = 0.8;
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

let brbSongs = [];

const voxSequencer = new SoundSequencer("vox", "wav");
voxSequencer.onChatMessage = (self, e) => {
    if (e.channel_points_custom_reward_id === "59a3780e-9fa6-41f2-b03a-5483537ecafd")
        self.startSpeaking(e.message.text);
};

const commandLibrary = {};
function registerCommand(commandText, handler) {
    commandLibrary[commandText.toUpperCase()] = handler;
}

let lastDennisTime = Date.now();
const baseDennisTimeout = 1000;
let dennisTimeout = baseDennisTimeout;
function parseAndExecuteCommand(userId, text) {
    if (!text.startsWith("!"))
        return;
    const commandKey = text.split(/\s+/)[0].split("!")[1].toUpperCase().replace(/\s/g, "").replace(/[^\x00-\x7F]/g, "");
    if (commandLibrary[commandKey] == null)
        return;
    const now = Date.now();
    if (userId !== streamerUserId) {
        if (now - lastDennisTime > dennisTimeout)
            document.getElementById("dennis").cloneNode().play();
        lastDennisTime = now;
        dennisTimeout += baseDennisTimeout;
        return;
    }

    const params = text.split(/\s+/).slice(1);
    commandLibrary[commandKey](...params);
}

registerCommand("brb", (song) => {
    document.getElementById("brb-text").style.display = "block";
    const songMetaData = document.getElementById("song-metadata");
    if (song != null && song.toUpperCase() === "SILENT") {
        overlaySongPlayer.stopSong();
        audioVisualizer.hide();
        songMetaData.style.display = "none";
        return;
    }

    audioVisualizer.show();
    const songElement = overlaySongElement;
    function loadSong(songInd) {
        let songIndex = parseInt(songInd);
        if (isNaN(songIndex) || songIndex >= brbSongs.length) {
            songIndex = Math.floor(Math.random() * brbSongs.length);
        }

        const songPath = `./songs/${brbSongs[songIndex]}.mp3`;
        songElement.src = songPath;
        songElement.load();
        const songPromise = new Promise(resolve => {
            songElement.addEventListener("canplaythrough", () => { resolve(); }, { once: true });
            if (songElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) resolve();
        });

        songPromise.then(() => {
            handleCanSongPlaythrough();
            fetch(songPath)
            .then(response => {
                if (!response.ok)
                    return;
                console.log("Got mp3 blob. Reading tags...");
                return response.blob();
            })
            .then(data => {
                if (!data)
                    return;
                const reader = new FileReader();
                reader.onload = (e) => {
                const data = e.target.result;
                    const tagData = data.slice(data.byteLength - 128, data.byteLength - 1);
                    const decoder = new TextDecoder("windows-1252");
                    const tagText = decoder.decode(tagData);
                    if (tagText.slice(0, 3) === "TAG") {
                        const title = tagText.slice(3, 33).replaceAll("\0", "");
                        const artist = tagText.slice(33, 63).replaceAll("\0", "");
                        const album = tagText.slice(63, 93).replaceAll("\0", "");
                        document.getElementById("song-title").textContent = title;
                        document.getElementById("album-title").textContent = album;
                        document.getElementById("artist-title").textContent = artist;
                    } else {
                        console.log("No ID3 tag found.");
                    }
                };

                reader.readAsArrayBuffer(data);
            });
        })
    }

    function handleCanSongPlaythrough() {
        overlaySongPlayer.playSong(songElement, false);
        requestAnimationFrame(drawVisualizer);
        songElement.addEventListener("ended", handleSongEnded, { once: true });
    }

    function handleSongEnded() {
        console.log("Song end event fired.");
        loadSong();
    }

    function drawVisualizer(timeStamp) {
        if (!overlaySongPlayer.isPlaying)
            return;
        audioVisualizer.draw();
        requestAnimationFrame(drawVisualizer);
    }

    fetch("./brbsongs.json")
        .then(response => response.json())
        .then(json => { if (brbSongs.length === 0) brbSongs = json.brbSongs; })
        .then(() => loadSong(song) );
    songMetaData.style.display = "block"; 
});

registerCommand("back", () => {
    overlaySongPlayer.stopSong();
    audioVisualizer.hide();
    document.getElementById("song-metadata").style.display = "none";
    document.getElementById("brb-text").style.display = "none";
});

registerCommand("volume", (percentage) => {
    const songElement = overlaySongElement;
    const value = parseInt(percentage);
    if (isNaN(value))
        return;
    if (percentage.startsWith("+") || percentage.startsWith("-"))
        songElement.volume += value / 100;
    else
        songElement.volume = value / 100;
});

registerCommand("stopvoice", () => {
    eventDispatcher.dispatch("voicestop", null);
    document.getElementById("shutup-sound").play();
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
eventDispatcher.subscribe(subTypes.chatMessage, voxSequencer, voxSequencer.onChatMessage);
eventDispatcher.subscribe("voicestop", hgruntSequencer, hgruntSequencer.onVoiceStop);
eventDispatcher.subscribe("voicestop", voxSequencer, voxSequencer.onVoiceStop);
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

    return false; // don't close connection
};

eventSocket.onclose = (e) => {
    console.log("Socket closed.");
}
