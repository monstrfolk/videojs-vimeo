'use strict';

exports.__esModule = true;

var _video = require('video.js');

var _video2 = _interopRequireDefault(_video);

var _player = require('@vimeo/player');

var _player2 = _interopRequireDefault(_player);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Component = _video2.default.getComponent('Component');
var Tech = _video2.default.getComponent('Tech');
var cssInjected = false;
var _isOnMobile = _video2.default.browser.IS_IOS || _video2.default.browser.IS_ANDROID;

// Since the iframe can't be touched using Vimeo's way of embedding,
// let's add a new styling rule to have the same style as `vjs-tech`
function injectCss() {
  if (cssInjected) {
    return;
  }
  cssInjected = true;
  var css = '\n    .vjs-vimeo iframe {\n      position: absolute;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n    }\n  ';
  var head = document.head || document.getElementsByTagName('head')[0];

  var style = document.createElement('style');

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

var Vimeo = function (_Tech) {
  _inherits(Vimeo, _Tech);

  function Vimeo(options, ready) {
    _classCallCheck(this, Vimeo);

    var _this = _possibleConstructorReturn(this, _Tech.call(this, options, ready));

    injectCss();
    _this.setPoster(options.poster);
    _this.setSrc(_this.options_.source);
    _this.initVimeoPlayer();
    return _this;
  }

  Vimeo.prototype.initVimeoPlayer = function initVimeoPlayer() {
    var _this2 = this;

    var vimeoOptions = {
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

    this._player = new _player2.default(this.el(), vimeoOptions);
    this.initVimeoState();

    if (this.options_.muted) {
      this.setMuted(true);
    }

    ['play', 'pause', 'ended', 'timeupdate', 'progress', 'seeked'].forEach(function (e) {
      _this2._player.on(e, function (progress) {
        if (_this2._vimeoState.progress.duration !== progress.duration) {
          _this2.trigger('durationchange');
        }
        _this2._vimeoState.progress = progress;
        _this2.trigger(e);
      });
    });

    this._player.on('pause', function () {
      return _this2._vimeoState.playing = false;
    });
    this._player.on('play', function () {
      _this2._vimeoState.playing = true;
      _this2._vimeoState.ended = false;
    });
    this._player.on('ended', function () {
      _this2._vimeoState.playing = false;
      _this2._vimeoState.ended = true;
    });
    this._player.on('volumechange', function (v) {
      return _this2._vimeoState.volume = v;
    });
    this._player.on('error', function (e) {
      return _this2.trigger('error', e);
    });

    this.triggerReady();
  };

  Vimeo.prototype.initVimeoState = function initVimeoState() {
    var state = this._vimeoState = {
      ended: false,
      playing: false,
      volume: 0,
      progress: {
        seconds: 0,
        percent: 0,
        duration: 0
      }
    };

    this._player.getCurrentTime().then(function (time) {
      return state.progress.seconds = time;
    });
    this._player.getDuration().then(function (time) {
      return state.progress.duration = time;
    });
    this._player.getPaused().then(function (paused) {
      return state.playing = !paused;
    });
    this._player.getVolume().then(function (volume) {
      return state.volume = volume;
    });
  };

  Vimeo.prototype.createEl = function createEl() {
    var div = _video2.default.createEl('div', {
      id: this.options_.techId
    });

    div.style.cssText = 'width:100%;height:100%;top:0;left:0;position:absolute';
    div.className = 'vjs-vimeo';

    return div;
  };

  Vimeo.prototype.controls = function controls() {
    return true;
  };

  Vimeo.prototype.supportsFullScreen = function supportsFullScreen() {
    return true;
  };

  Vimeo.prototype.src = function src(_src) {
    if (_src) {
      this.setSrc({ src: _src }); // eslint-disable-line
    }

    return this.source;
  };

  Vimeo.prototype.poster = function poster() {
    // You can't start programmatically a video with a mobile
    // through the iframe so we hide the poster and the play button (with CSS)
    if (_isOnMobile) {
      return null;
    }

    return this.poster_;
  };

  Vimeo.prototype.setPoster = function setPoster(poster) {
    this.poster_ = poster;
  };

  Vimeo.prototype.setSrc = function setSrc(source) {
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
  };

  Vimeo.prototype.currentSrc = function currentSrc() {
    return this.options_.source.src;
  };

  Vimeo.prototype.currentTime = function currentTime() {
    return this._vimeoState.progress.seconds;
  };

  Vimeo.prototype.setCurrentTime = function setCurrentTime(time) {
    this._player.setCurrentTime(time);
  };

  Vimeo.prototype.volume = function volume() {
    return this._vimeoState.volume;
  };

  Vimeo.prototype.setVolume = function setVolume(volume) {
    return this._player.setVolume(volume);
  };

  Vimeo.prototype.duration = function duration() {
    return this._vimeoState.progress.duration;
  };

  Vimeo.prototype.buffered = function buffered() {
    var progress = this._vimeoState.progress;

    return _video2.default.createTimeRange(0, progress.percent * progress.duration);
  };

  Vimeo.prototype.paused = function paused() {
    return !this._vimeoState.playing;
  };

  Vimeo.prototype.pause = function pause() {
    if (this._player) {
      this._player.pause();
    }
  };

  Vimeo.prototype.play = function play() {
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
  };

  Vimeo.prototype.muted = function muted() {
    return this._vimeoState.volume === 0;
  };

  Vimeo.prototype.ended = function ended() {
    return this._vimeoState.ended;
  };

  Vimeo.prototype.load = function load() {
    var self = this; // eslint-disable-line

    if (this.url && this.url.videoId) {
      this._player.unload().then(function () {
        self._player.loadVideo(self.url.videoId).then(function () {
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
        }).catch(function (error) {
          throw new Error(error);
        });
      }).catch(function (error) {
        throw new Error(error);
      });
    }
  };

  Vimeo.prototype.reset = function reset() {};

  Vimeo.prototype.checkHighResPoster = function checkHighResPoster() {
    var self = this; // eslint-disable-line
    var https = require('https');

    var options = {
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

    https.get(options, function (res) {
      var body = '';

      res.on('data', function (chunk) {
        body += chunk;
      });

      res.on('end', function () {
        var data = JSON.parse(body);

        self.poster_ = data[0].thumbnail_large;

        self.trigger('posterchange');
      });
    }).on('error', function (error) {
      throw new Error(error);
    });
  };

  Vimeo.prototype.setMuted = function setMuted(mute) {
    if (mute) {
      Vimeo.unmuteVolume = this._player.getVolume();
      this._player.setVolume(0);
    } else {
      this._player.setVolume(Vimeo.unmuteVolume);
    }

    this._vimeoState.volume = this._player.getVolume();
  };

  return Vimeo;
}(Tech);

Vimeo.prototype.featuresTimeupdateEvents = true;
Vimeo.prototype.unmuteVolume = null;

Vimeo.isSupported = function () {
  return true;
};

Vimeo.canPlayType = function (e) {
  return e === 'video/vimeo';
};

Vimeo.canPlaySource = function (e) {
  return Vimeo.canPlayType(e.type);
};

Vimeo.parseUrl = function (url) {
  var result = {
    videoId: null
  };

  var regex = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;

  var match = regex.exec(url);

  if (match && match[5]) {
    result.videoId = match[5];
  }

  return result;
};

Component.registerComponent('Vimeo', Vimeo);
Tech.registerTech('Vimeo', Vimeo);

// Include the version number.
Vimeo.VERSION = '0.0.1';

exports.default = Vimeo;