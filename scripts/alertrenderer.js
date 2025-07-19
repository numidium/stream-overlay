const Queue = require('./queue.js')

module.exports = class AlertRenderer {
    soundCommands;
    alertQueue;
    isAlertAnimRunning;
    stateEnum;
    attentionHorseId = "66c634dd-ff8a-4193-9f03-16c0cb648c08";
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
                let spamAlerts = [
                    { alertTitle: `${userName} is on sound timeout for ${cooldown.time / 1000} seconds.`, alertMessage: "Enough!", sound: "enough-sound", image: "enough" },
                    { alertTitle: `${userName} is on sound timeout for ${cooldown.time / 1000} seconds.`, alertMessage: "Shut up!", sound: "shutup-sound", image: "shutup" }
                ];

                this.queueAlertAnim(spamAlerts[Math.floor(Math.random() * 2)]);
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
            for (let i = 0; i < cheermoteData.length; i++) {
                if (message.indexOf(cheermoteData[i].prefix) === -1)
                    continue;
                const markup = `<img src='${cheermoteData[i].tiers[0].images.light.animated["4"]}' />`;
                message = message.replaceAll(cheermoteData[i].prefix, markup);
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
                    const alertImages = document.getElementById("alert-area").querySelectorAll("img");
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
}
