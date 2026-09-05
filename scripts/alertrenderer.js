import Queue from './queue.js';

export default class AlertRenderer {
    soundCommands;
    alertQueue;
    isAlertAnimRunning;
    stateEnum;
    attentionHorseId = "66c634dd-ff8a-4193-9f03-16c0cb648c08";
    cheermoteData;
    emoteDict7tv = {};
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
            const commandTokens = this.soundCommands[i].split(" ");
            const messageTokens = message.toLowerCase().split(" ");
            if (commandTokens.length > messageTokens.length)
                continue;
            for (let j = 0; j < commandTokens.length; j++) {
                if (commandTokens[j] != messageTokens[j])
                    break;
                if (j === commandTokens.length - 1)
                    soundCommand = this.soundCommands[i];
            }
        }
        
        if (soundCommand !== null) {
            if (this.cooldowns[userName] == null) {
                this.cooldowns[userName] = { lastCmdTime: Date.now(), spamCount: 0, time: 0, cooling: false };
            }

            const cooldown = this.cooldowns[userName];
            const baseCoolDownTime = 60000;
            const spamWindow = 10000;
            const spamThreshold = 4;
            const timeSinceLastCmd = Date.now() - cooldown.lastCmdTime;
            if (timeSinceLastCmd >= cooldown.time)
            cooldown.cooling = false;
            if (cooldown.cooling) {
                return;
            }

            cooldown.spamCount = timeSinceLastCmd <= spamWindow ? cooldown.spamCount + 1 : 1;
            if (cooldown.spamCount >= spamThreshold) {
                cooldown.cooling = true;
                cooldown.time += baseCoolDownTime;
                this.queueAlertAnim({ alertTitle: `${userName} is silenced for ${cooldown.time / 1000} seconds.`, alertMessage: "Shut up!", sound: "shutup-sound", image: "shutup" });
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

    enqueueChatMessage(messageText, fragments, userName, customRewardId) {
        this.parseCommandAndPlaySound(messageText, userName);
        let text = messageText;
        text = this.getMessageWith7tvEmotes(text);
        const twitchEmotes = this.getTwitchEmotesFromFragments(fragments);
        text = this.getMessageWithTwitchEmotes(text, twitchEmotes);
        if (customRewardId === this.attentionHorseId) {
            this.queueAlertAnim({ alertTitle: `${userName} is an attention horse!`, alertMessage: text, sound: "horse-sound", image: "attention-horse" });
        }
    }

    enqueueCheer(messageText, cheermoteData, userName, bits) {
        if (cheermoteData) {
            const data = cheermoteData.data;
            for (let i = 0; i < data.length; i++) {
                for (let j = data[i].tiers.length - 1; j >= 0; j--) {
                    if (messageText.indexOf(`${data[i].prefix}${data[i].tiers[j].id}`) === -1)
                        continue;
                    let tier = 0;
                    const imageMarkup = `<img src='${data[i].tiers[j].images.light.animated["3"]}' />`;
                    messageText = messageText.replaceAll(data[i].prefix, imageMarkup);
                }
            }
        }

        const bigCheerThreshold = 1000;
        if (bits < bigCheerThreshold)
            this.queueAlertAnim({ alertTitle: `${userName} sent ${bits} bits!`, alertMessage: messageText, sound: "bits1-sound" });
        else
            this.queueAlertAnim({ alertTitle: `BIG CHEER! ${userName} sent ${bits} bits!!`, alertMessage: messageText, sound: "bits2-sound" });
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
        const months = Math.floor(cumulativeMonths);
        let messageText = this.getMessageWith7tvEmotes(message.text);
        const twitchEmotes = this.getTwitchEmotesFromMessage(message);
        messageText = this.getMessageWithTwitchEmotes(messageText, twitchEmotes);
        this.queueAlertAnim({ alertTitle: `${userName} has been subbed for ${months} months total!`, alertMessage: messageText, sound: "subscriber-sound" });
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

    getMessageWith7tvEmotes(messageText) {
        const words = messageText.split(/\s+/);
        let changedMessageText = messageText;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const emoteId = this.emoteDict7tv[word];
            if (emoteId == null) continue;
            changedMessageText = changedMessageText.replaceAll(word, `<img src='https://cdn.7tv.app/emote/${emoteId}/1x.webp'>`);
        }

        return changedMessageText;
    }

    getTwitchEmotesFromFragments(fragments) {
        const emoteDict = {};
        for (let i = 0; i < fragments.length; i++) {
            const fragment = fragments[i];
            if (fragment.type != "emote") continue;
            emoteDict[fragment.text] = fragment.emote.id;
        }

        return emoteDict;
    }

    getTwitchEmotesFromMessage(message) {
        const messageText = message.text;
        const emotes = message.emotes;
        const emoteDict = {};
        if (emotes == null)
            return emoteDict;
        for (let i = 0; i < emotes.length; i++) {
            const emote = emotes[i];
            const key = messageText.substring(emote.begin, emote.end);
            emoteDict[key] = emote.id;
        }

        return emoteDict;
    }

    getMessageWithTwitchEmotes(messageText, emotes) {
        const words = messageText.split(/\s+/);
        let changedMessageText = messageText;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const emoteId = emotes[word];
            if (emoteId == null) continue;
            changedMessageText = changedMessageText.replaceAll(word, `<img src='https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0'>`);
        }

        return changedMessageText;
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
        self.enqueueResubMessage(e.user_name, e.cumulative_months, e.message);
    }

    onChatMessage(self, e) {
        const userName = e.chatter_user_name;
        const messageText = e.message.text;
        const fragments = e.message.fragments;
        const rewardId = e.channel_points_custom_reward_id;
        self.enqueueChatMessage(messageText, fragments, userName, rewardId);
    }

    onCheer(self, e) {
        const messageText = self.getMessageWith7tvEmotes(e.message);
        const userName = self.getName(e);
        const bits = Number(e.bits);
        self.enqueueCheer(messageText, self.cheermoteData, userName, bits);
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
        if (e.status !== "completed") // statuses: completed, archived, terminated
            return;
        const voteQuestion = e.title;
        const choices = e.choices;
        self.enqueuePollEnd(voteQuestion, choices);
    }
}
