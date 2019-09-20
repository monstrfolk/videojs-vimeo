import videojs from 'video.js';
import VimeoPlayer from '@vimeo/player';

const Component = videojs.getComponent('Component');
const Tech = videojs.getComponent('Tech');
let cssInjected = false;
let _isOnMobile = videojs.browser.IS_IOS || videojs.browser.IS_ANDROID;

// Since the iframe can't be touched using Vimeo's way of embedding,
// let's add a new styling rule to have the same style as `vjs-tech`
function injectCss() {
  if (cssInjected) {
    return;
  }
  cssInjected = true;
  const css = `
    .vjs-vimeo iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;
  const head = document.head || document.getElementsByTagName('head')[0];

  const style = document.createElement('style');

  style.type = 'text/css';

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }

  head.appendChild(style);
}

/**
 * Vimeo - Wrapper for Video Player API
 *
 * @param {Object=} options Object of option names and values
 * @param {Function=} ready Ready callback function
 * @extends Tech
 * @class Vimeo
 */
class Vimeo extends Tech {
  constructor(options, ready) {
    super(options, ready);

    injectCss();
    this.setPoster(options.poster);
    this.setSrc(this.options_.source);
    this.initVimeoPlayer();
  }

  initVimeoPlayer() {
    const vimeoOptions = {
      byline: false,
      portrait: false,
      title: false
    };

    if (this.source) {
      vimeoOptions.url = this.source.src;
    }
    if (this.options_.autoplay) {
      vimeoOptions.autoplay = true;
    }
    if (this.options_.height) {
      vimeoOptions.height = this.options_.height;
    }
    if (this.options_.width) {
      vimeoOptions.width = this.options_.width;
    }
    if (this.options_.maxheight) {
      vimeoOptions.maxheight = this.options_.maxheight;
    }
    if (this.options_.maxwidth) {
      vimeoOptions.maxwidth = this.options_.maxwidth;
    }
    if (this.options_.loop) {
      vimeoOptions.loop = this.options_.loop;
    }
    if (this.options_.color) {
      // vimeo is the only API on earth to reject hex color with leading #
      vimeoOptions.color = this.options_.color.replace(/^#/, '');
    }

    this._player = new VimeoPlayer(this.el(), vimeoOptions);
    this.initVimeoState();

    if (this.options_.muted) {
      this.setMuted(true);
    }

    ['play', 'pause', 'ended', 'timeupdate', 'progress', 'seeked'].forEach(e => {
      this._player.on(e, (progress) => {
        if (this._vimeoState.progress.duration !== progress.duration) {
          this.trigger('durationchange');
        }
        this._vimeoState.progress = progress;
        this.trigger(e);
      });
    });

    this._player.on('pause', () => this._vimeoState.playing = false);
    this._player.on('play', () => {
      this._vimeoState.playing = true;
      this._vimeoState.ended = false;
    });
    this._player.on('ended', () => {
      this._vimeoState.playing = false;
      this._vimeoState.ended = true;
    });
    this._player.on('volumechange', (v) => this._vimeoState.volume = v);
    this._player.on('error', e => this.trigger('error', e));

    this.triggerReady();
  }

  initVimeoState() {
    const state = this._vimeoState = {
      ended: false,
      playing: false,
      volume: 0,
      progress: {
        seconds: 0,
        percent: 0,
        duration: 0
      }
    };

    this._player.getCurrentTime().then(time => state.progress.seconds = time);
    this._player.getDuration().then(time => state.progress.duration = time);
    this._player.getPaused().then(paused => state.playing = !paused);
    this._player.getVolume().then(volume => state.volume = volume);
  }

  createEl() {
    const div = videojs.createEl('div', {
      id: this.options_.techId
    });

    div.style.cssText = 'width:100%;height:100%;top:0;left:0;position:absolute';
    div.className = 'vjs-vimeo';

    return div;
  }

  controls() {
    return true;
  }

  supportsFullScreen() {
    return true;
  }

  src(src) {
    if (src) {
      this.setSrc({src: src}); // eslint-disable-line
    }

    return this.source;
  }

  poster() {
    // You can't start programmatically a video with a mobile
    // through the iframe so we hide the poster and the play button (with CSS)
    if (_isOnMobile) {
      return null;
    }

    return this.poster_;
  }

  setPoster(poster) {
    this.poster_ = poster;
  }

  setSrc(source) {
    if (!source || !source.src) {
      return;
    }

    delete this.errorNumber;
    this.source = source;
    this.url = Vimeo.parseUrl(source.src);

    // if (!this.options_.poster) {
    if (this.url.videoId) {
      // Check if their is a high res
      this.checkHighResPoster();
    }
    // }
  }

  currentSrc() {
    return this.options_.source.src;
  }

  currentTime() {
    return this._vimeoState.progress.seconds;
  }

  setCurrentTime(time) {
    this._player.setCurrentTime(time);
  }

  volume() {
    return this._vimeoState.volume;
  }

  setVolume(volume) {
    return this._player.setVolume(volume);
  }

  duration() {
    return this._vimeoState.progress.duration;
  }

  buffered() {
    const progress = this._vimeoState.progress;

    return videojs.createTimeRange(0, progress.percent * progress.duration);
  }

  paused() {
    return !this._vimeoState.playing;
  }

  pause() {
    if (this._player) {
      this._player.pause();
    }
  }

  play() {
    if (!this.url || !this.url.videoId) {
      return;
    }

    this.wasPausedBeforeSeek = false;

    if (this.isReady_) {
      if (this.activeVideoId === this.url.videoId) {
        this._player.play();
      } else {
        // this.loadVideoById_(this.url.videoId);
        this.activeVideoId = this.url.videoId;
      }
    } else {
      this.trigger('waiting');
      this.playOnReady = true;
    }
  }

  muted() {
    return this._vimeoState.volume === 0;
  }

  ended() {
    return this._vimeoState.ended;
  }

  load() {
    let self = this; // eslint-disable-line

    if (this.url && this.url.videoId) {
      this._player.unload().then(function() {
        self._player.loadVideo(self.url.videoId).then(function() {
          if (self.options_.muted) {
            self.setMuted(true);
          }
          if (self.options_.autoplay && !_isOnMobile) {
            if (self.isReady_) {
              self.play();
            } else {
              self.playOnReady = true;
            }
          } else if (self.activeVideoId !== self.url.videoId) {
            if (self.isReady_) {
              // this.cueVideoById_(this.url.videoId);
              self.activeVideoId = self.url.videoId;
            } else {
              self.cueOnReady = true;
            }
          }
        }).catch(function(error) {
          throw new Error(error);
        });
      }).catch(function(error) {
        throw new Error(error);
      });
    }
  }

  reset() {}

  checkHighResPoster() {
    let self = this; // eslint-disable-line
    let https = require('https');

    const options = {
      hostname: 'vimeo.com',
      port: 443,
      path: '/api/v2/video/' + this.url.videoId + '.json',
      method: 'GET',
      withCredentials: false
    };

    /*
    let options = {
      url: 'https://vimeo.com/api/v2/video/' + this.url.videoId + '.json',
      withCredentials: false
    }
    */

    https.get(options, function(res) {
      let body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        let data = JSON.parse(body);

        self.poster_ = data[0].thumbnail_large;

        self.trigger('posterchange');

      });
    }).on('error', function(error) {
      throw new Error(error);
    });
  }

  setMuted(mute) {
    if (mute) {
      Vimeo.unmuteVolume = this._player.getVolume();
      this._player.setVolume(0);
    } else {
      this._player.setVolume(Vimeo.unmuteVolume);
    }

    this._vimeoState.volume = this._player.getVolume();
  }
}

Vimeo.prototype.featuresTimeupdateEvents = true;
Vimeo.prototype.unmuteVolume = null;

Vimeo.isSupported = function() {
  return true;
};

Vimeo.canPlayType = function(e) {
  return (e === 'video/vimeo');
};

Vimeo.canPlaySource = function(e) {
  return Vimeo.canPlayType(e.type);
};

Vimeo.parseUrl = function(url) {
  let result = {
    videoId: null
  };

  let regex =
    /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;

  let match = regex.exec(url);

  if (match && match[5]) {
    result.videoId = match[5];
  }

  return result;
};

Component.registerComponent('Vimeo', Vimeo);
Tech.registerTech('Vimeo', Vimeo);

// Include the version number.
Vimeo.VERSION = '0.0.1';

export default Vimeo;
