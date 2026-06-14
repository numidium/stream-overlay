export default class OverlaySongPlayer {
    audioContext;
    mediaElement;
    isPlaying;
    songPath;
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

    loadSong(songInd, songList) {
        let songIndex = parseInt(songInd);
        if (isNaN(songIndex) || songIndex >= songList.length) {
            songIndex = Math.floor(Math.random() * songList.length);
        }

        this.songPath = `./songs/${songList[songIndex]}.mp3`;
        this.mediaElement.src = this.songPath;
        this.mediaElement.load();
        return new Promise(resolve => {
            this.mediaElement.addEventListener("canplaythrough", () => { resolve(); }, { once: true });
            if (this.mediaElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) resolve();
        });
    }
}
