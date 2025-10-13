module.exports = class SoundSequencer {
    isReady;
    fileNames;
    path;
    extension;
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
        let currentWord = null;
        let wordIndex = 0;
        const sayCurrentWord = () => {
            if (currentWord != null) {
                currentWord.removeEventListener("ended", sayCurrentWord);
                currentWord.removeEventListener("error", sayCurrentWord);
            }

            if (wordIndex === currentWords.length)
                return;
            currentWord = currentWords[wordIndex++];
            currentWord.play();
            currentWord.addEventListener("ended", sayCurrentWord);
            currentWord.addEventListener("error", sayCurrentWord);
        }

        const currentWords = [];
        let loadedWords = 0;
        const wordLoaded = () => {
            if (++loadedWords >= currentWords.length) {
                for (let i = 0; i < currentWords.length; i++)
                    currentWords[i].removeEventListener("canplaythrough", wordLoaded);
                sayCurrentWord();
            }
        }

        const tokens = text.toLowerCase().split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
            if (this.fileNames.indexOf(tokens[i]) === -1)
                continue;
            const audio = new Audio(`${this.path}${tokens[i]}.${this.extension}`);
            audio.volume = 0.2;
            currentWords.push(audio);
            audio.addEventListener("canplaythrough", wordLoaded);
        }
    }

    onChatMessage(self, e) {}
}