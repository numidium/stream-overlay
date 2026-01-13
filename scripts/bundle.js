(() => {
  // scripts/queue.js
  var Queue = class {
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
      return this.items[0] === void 0;
    }
  };

  // scripts/alertrenderer.js
  var AlertRenderer = class {
    soundCommands;
    alertQueue;
    isAlertAnimRunning;
    stateEnum;
    attentionHorseId = "66c634dd-ff8a-4193-9f03-16c0cb648c08";
    cheermoteData;
    cooldowns = [];
    constructor(_soundCommands, queueSize2) {
      this.soundCommands = _soundCommands;
      this.alertQueue = new Queue(queueSize2);
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
        const baseCoolDownTime = 6e4;
        const spamWindow = 15e3;
        const spamThreshold = 5;
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
          this.queueAlertAnim({ alertTitle: `${userName} is on command timeout for ${cooldown.time / 1e3} seconds.`, alertMessage: "Shut up!", sound: "shutup-sound", image: "shutup" });
        } else {
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
      const bigCheerThreshold = 1e3;
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
      this.queueAlertAnim({ alertTitle: `Poll ended${tieText}: ${voteQuestion}`, alertMessage: choicesMarkup, sound: isTied ? "vote-fail-sound" : "vote-pass-sound" });
    }
    startAlertAnims() {
      this.isAlertAnimRunning = true;
      let timeLast = document.timeline.currentTime;
      let state = 0;
      let opacity = 0;
      let stayTime = 0;
      const alertElement = document.getElementById("alert-area");
      const fadeTimeLimit = 2e3;
      const stayTimeLimit = 5e3;
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
            } else {
              alertElement.style.opacity = 1;
              state++;
            }
            break;
          case this.stateEnum.stay:
            if (stayTime < stayTimeLimit) {
              stayTime += timeDelta;
            } else {
              stayTime = 0;
              state++;
            }
            break;
          case this.stateEnum.fadeOut:
            if (opacity > 0) {
              alertElement.style.opacity = opacity;
              opacity -= timeDelta / fadeTimeLimit;
            } else {
              alertElement.style.opacity = 0;
              state++;
            }
            break;
          case this.stateEnum.end:
            if (this.alertQueue.isEmpty()) {
              this.isAlertAnimRunning = false;
              return;
            } else {
              state = 0;
            }
            break;
          default:
            break;
        }
        requestAnimationFrame(animStep);
      };
      requestAnimationFrame(animStep);
    }
    getName(e) {
      return e.is_anonymous ? "Anonymous" : e.user_name;
    }
    onNewFollower(self, e) {
      self.enqueueNewFollower(e.user_name);
    }
    onNewSubscriber(self, e) {
      self.enqueueNewSubscriber(e.user_name, Number(e.tier) / 1e3);
    }
    onSubGift(self, e) {
      const userName = self.getName(e);
      const numGifts = e.total;
      const tier = Number(e.tier) / 1e3;
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
      if (e.status !== "completed")
        return;
      const voteQuestion = e.title;
      const choices = e.choices;
      self.enqueuePollEnd(voteQuestion, choices);
    }
  };

  // ../../../node_modules/http-status-codes/build/es/legacy.js
  var ACCEPTED = 202;
  var BAD_GATEWAY = 502;
  var BAD_REQUEST = 400;
  var CONFLICT = 409;
  var CONTINUE = 100;
  var CREATED = 201;
  var EXPECTATION_FAILED = 417;
  var FORBIDDEN = 403;
  var GATEWAY_TIMEOUT = 504;
  var GONE = 410;
  var HTTP_VERSION_NOT_SUPPORTED = 505;
  var IM_A_TEAPOT = 418;
  var INSUFFICIENT_SPACE_ON_RESOURCE = 419;
  var INSUFFICIENT_STORAGE = 507;
  var INTERNAL_SERVER_ERROR = 500;
  var LENGTH_REQUIRED = 411;
  var LOCKED = 423;
  var METHOD_FAILURE = 420;
  var METHOD_NOT_ALLOWED = 405;
  var MOVED_PERMANENTLY = 301;
  var MOVED_TEMPORARILY = 302;
  var MULTI_STATUS = 207;
  var MULTIPLE_CHOICES = 300;
  var NETWORK_AUTHENTICATION_REQUIRED = 511;
  var NO_CONTENT = 204;
  var NON_AUTHORITATIVE_INFORMATION = 203;
  var NOT_ACCEPTABLE = 406;
  var NOT_FOUND = 404;
  var NOT_IMPLEMENTED = 501;
  var NOT_MODIFIED = 304;
  var OK = 200;
  var PARTIAL_CONTENT = 206;
  var PAYMENT_REQUIRED = 402;
  var PERMANENT_REDIRECT = 308;
  var PRECONDITION_FAILED = 412;
  var PRECONDITION_REQUIRED = 428;
  var PROCESSING = 102;
  var PROXY_AUTHENTICATION_REQUIRED = 407;
  var REQUEST_HEADER_FIELDS_TOO_LARGE = 431;
  var REQUEST_TIMEOUT = 408;
  var REQUEST_TOO_LONG = 413;
  var REQUEST_URI_TOO_LONG = 414;
  var REQUESTED_RANGE_NOT_SATISFIABLE = 416;
  var RESET_CONTENT = 205;
  var SEE_OTHER = 303;
  var SERVICE_UNAVAILABLE = 503;
  var SWITCHING_PROTOCOLS = 101;
  var TEMPORARY_REDIRECT = 307;
  var TOO_MANY_REQUESTS = 429;
  var UNAUTHORIZED = 401;
  var UNPROCESSABLE_ENTITY = 422;
  var UNSUPPORTED_MEDIA_TYPE = 415;
  var USE_PROXY = 305;
  var legacy_default = {
    ACCEPTED,
    BAD_GATEWAY,
    BAD_REQUEST,
    CONFLICT,
    CONTINUE,
    CREATED,
    EXPECTATION_FAILED,
    FORBIDDEN,
    GATEWAY_TIMEOUT,
    GONE,
    HTTP_VERSION_NOT_SUPPORTED,
    IM_A_TEAPOT,
    INSUFFICIENT_SPACE_ON_RESOURCE,
    INSUFFICIENT_STORAGE,
    INTERNAL_SERVER_ERROR,
    LENGTH_REQUIRED,
    LOCKED,
    METHOD_FAILURE,
    METHOD_NOT_ALLOWED,
    MOVED_PERMANENTLY,
    MOVED_TEMPORARILY,
    MULTI_STATUS,
    MULTIPLE_CHOICES,
    NETWORK_AUTHENTICATION_REQUIRED,
    NO_CONTENT,
    NON_AUTHORITATIVE_INFORMATION,
    NOT_ACCEPTABLE,
    NOT_FOUND,
    NOT_IMPLEMENTED,
    NOT_MODIFIED,
    OK,
    PARTIAL_CONTENT,
    PAYMENT_REQUIRED,
    PERMANENT_REDIRECT,
    PRECONDITION_FAILED,
    PRECONDITION_REQUIRED,
    PROCESSING,
    PROXY_AUTHENTICATION_REQUIRED,
    REQUEST_HEADER_FIELDS_TOO_LARGE,
    REQUEST_TIMEOUT,
    REQUEST_TOO_LONG,
    REQUEST_URI_TOO_LONG,
    REQUESTED_RANGE_NOT_SATISFIABLE,
    RESET_CONTENT,
    SEE_OTHER,
    SERVICE_UNAVAILABLE,
    SWITCHING_PROTOCOLS,
    TEMPORARY_REDIRECT,
    TOO_MANY_REQUESTS,
    UNAUTHORIZED,
    UNPROCESSABLE_ENTITY,
    UNSUPPORTED_MEDIA_TYPE,
    USE_PROXY
  };

  // ../../../node_modules/http-status-codes/build/es/utils.js
  var statusCodeToReasonPhrase = {
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
  var reasonPhraseToStatusCode = {
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

  // ../../../node_modules/http-status-codes/build/es/utils-functions.js
  function getReasonPhrase(statusCode) {
    var result = statusCodeToReasonPhrase[statusCode.toString()];
    if (!result) {
      throw new Error("Status code does not exist: " + statusCode);
    }
    return result;
  }
  function getStatusCode(reasonPhrase) {
    var result = reasonPhraseToStatusCode[reasonPhrase];
    if (!result) {
      throw new Error("Reason phrase does not exist: " + reasonPhrase);
    }
    return result;
  }
  var getStatusText = getReasonPhrase;

  // ../../../node_modules/http-status-codes/build/es/status-codes.js
  var StatusCodes;
  (function(StatusCodes2) {
    StatusCodes2[StatusCodes2["CONTINUE"] = 100] = "CONTINUE";
    StatusCodes2[StatusCodes2["SWITCHING_PROTOCOLS"] = 101] = "SWITCHING_PROTOCOLS";
    StatusCodes2[StatusCodes2["PROCESSING"] = 102] = "PROCESSING";
    StatusCodes2[StatusCodes2["EARLY_HINTS"] = 103] = "EARLY_HINTS";
    StatusCodes2[StatusCodes2["OK"] = 200] = "OK";
    StatusCodes2[StatusCodes2["CREATED"] = 201] = "CREATED";
    StatusCodes2[StatusCodes2["ACCEPTED"] = 202] = "ACCEPTED";
    StatusCodes2[StatusCodes2["NON_AUTHORITATIVE_INFORMATION"] = 203] = "NON_AUTHORITATIVE_INFORMATION";
    StatusCodes2[StatusCodes2["NO_CONTENT"] = 204] = "NO_CONTENT";
    StatusCodes2[StatusCodes2["RESET_CONTENT"] = 205] = "RESET_CONTENT";
    StatusCodes2[StatusCodes2["PARTIAL_CONTENT"] = 206] = "PARTIAL_CONTENT";
    StatusCodes2[StatusCodes2["MULTI_STATUS"] = 207] = "MULTI_STATUS";
    StatusCodes2[StatusCodes2["MULTIPLE_CHOICES"] = 300] = "MULTIPLE_CHOICES";
    StatusCodes2[StatusCodes2["MOVED_PERMANENTLY"] = 301] = "MOVED_PERMANENTLY";
    StatusCodes2[StatusCodes2["MOVED_TEMPORARILY"] = 302] = "MOVED_TEMPORARILY";
    StatusCodes2[StatusCodes2["SEE_OTHER"] = 303] = "SEE_OTHER";
    StatusCodes2[StatusCodes2["NOT_MODIFIED"] = 304] = "NOT_MODIFIED";
    StatusCodes2[StatusCodes2["USE_PROXY"] = 305] = "USE_PROXY";
    StatusCodes2[StatusCodes2["TEMPORARY_REDIRECT"] = 307] = "TEMPORARY_REDIRECT";
    StatusCodes2[StatusCodes2["PERMANENT_REDIRECT"] = 308] = "PERMANENT_REDIRECT";
    StatusCodes2[StatusCodes2["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    StatusCodes2[StatusCodes2["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    StatusCodes2[StatusCodes2["PAYMENT_REQUIRED"] = 402] = "PAYMENT_REQUIRED";
    StatusCodes2[StatusCodes2["FORBIDDEN"] = 403] = "FORBIDDEN";
    StatusCodes2[StatusCodes2["NOT_FOUND"] = 404] = "NOT_FOUND";
    StatusCodes2[StatusCodes2["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
    StatusCodes2[StatusCodes2["NOT_ACCEPTABLE"] = 406] = "NOT_ACCEPTABLE";
    StatusCodes2[StatusCodes2["PROXY_AUTHENTICATION_REQUIRED"] = 407] = "PROXY_AUTHENTICATION_REQUIRED";
    StatusCodes2[StatusCodes2["REQUEST_TIMEOUT"] = 408] = "REQUEST_TIMEOUT";
    StatusCodes2[StatusCodes2["CONFLICT"] = 409] = "CONFLICT";
    StatusCodes2[StatusCodes2["GONE"] = 410] = "GONE";
    StatusCodes2[StatusCodes2["LENGTH_REQUIRED"] = 411] = "LENGTH_REQUIRED";
    StatusCodes2[StatusCodes2["PRECONDITION_FAILED"] = 412] = "PRECONDITION_FAILED";
    StatusCodes2[StatusCodes2["REQUEST_TOO_LONG"] = 413] = "REQUEST_TOO_LONG";
    StatusCodes2[StatusCodes2["REQUEST_URI_TOO_LONG"] = 414] = "REQUEST_URI_TOO_LONG";
    StatusCodes2[StatusCodes2["UNSUPPORTED_MEDIA_TYPE"] = 415] = "UNSUPPORTED_MEDIA_TYPE";
    StatusCodes2[StatusCodes2["REQUESTED_RANGE_NOT_SATISFIABLE"] = 416] = "REQUESTED_RANGE_NOT_SATISFIABLE";
    StatusCodes2[StatusCodes2["EXPECTATION_FAILED"] = 417] = "EXPECTATION_FAILED";
    StatusCodes2[StatusCodes2["IM_A_TEAPOT"] = 418] = "IM_A_TEAPOT";
    StatusCodes2[StatusCodes2["INSUFFICIENT_SPACE_ON_RESOURCE"] = 419] = "INSUFFICIENT_SPACE_ON_RESOURCE";
    StatusCodes2[StatusCodes2["METHOD_FAILURE"] = 420] = "METHOD_FAILURE";
    StatusCodes2[StatusCodes2["MISDIRECTED_REQUEST"] = 421] = "MISDIRECTED_REQUEST";
    StatusCodes2[StatusCodes2["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    StatusCodes2[StatusCodes2["LOCKED"] = 423] = "LOCKED";
    StatusCodes2[StatusCodes2["FAILED_DEPENDENCY"] = 424] = "FAILED_DEPENDENCY";
    StatusCodes2[StatusCodes2["UPGRADE_REQUIRED"] = 426] = "UPGRADE_REQUIRED";
    StatusCodes2[StatusCodes2["PRECONDITION_REQUIRED"] = 428] = "PRECONDITION_REQUIRED";
    StatusCodes2[StatusCodes2["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    StatusCodes2[StatusCodes2["REQUEST_HEADER_FIELDS_TOO_LARGE"] = 431] = "REQUEST_HEADER_FIELDS_TOO_LARGE";
    StatusCodes2[StatusCodes2["UNAVAILABLE_FOR_LEGAL_REASONS"] = 451] = "UNAVAILABLE_FOR_LEGAL_REASONS";
    StatusCodes2[StatusCodes2["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    StatusCodes2[StatusCodes2["NOT_IMPLEMENTED"] = 501] = "NOT_IMPLEMENTED";
    StatusCodes2[StatusCodes2["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
    StatusCodes2[StatusCodes2["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
    StatusCodes2[StatusCodes2["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
    StatusCodes2[StatusCodes2["HTTP_VERSION_NOT_SUPPORTED"] = 505] = "HTTP_VERSION_NOT_SUPPORTED";
    StatusCodes2[StatusCodes2["INSUFFICIENT_STORAGE"] = 507] = "INSUFFICIENT_STORAGE";
    StatusCodes2[StatusCodes2["NETWORK_AUTHENTICATION_REQUIRED"] = 511] = "NETWORK_AUTHENTICATION_REQUIRED";
  })(StatusCodes || (StatusCodes = {}));

  // ../../../node_modules/http-status-codes/build/es/index.js
  var __assign = function() {
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
  var es_default = __assign(__assign({}, legacy_default), {
    getStatusCode,
    getStatusText
  });

  // scripts/specviz.js
  var SpecViz = class {
    audioContext;
    analyser;
    canvas;
    context;
    sliceWidth;
    sampleStep;
    sampleBuffer;
    ampZoom;
    constructor(audioContext, drawContext2, ampZoom = 1) {
      this.analyser = audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.sampleBuffer = new Uint8Array(this.analyser.fftSize);
      this.ampZoom = ampZoom;
      this.canvas = document.getElementById("spectrum-surface");
      this.sampleStep = Math.round(this.analyser.fftSize / this.canvas.width);
      this.context = drawContext2;
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
      return (neutralAmp + (amplitude - neutralAmp) * this.ampZoom) / maxAmp * this.canvas.height;
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
  };

  // scripts/songplayer.js
  var OverlaySongPlayer = class {
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
  };

  // scripts/soundsequencer.js
  var SoundSequencer = class _SoundSequencer {
    isReady;
    fileNames;
    path;
    extension;
    wordIndex;
    currentSound;
    static startDelay = 1e3;
    constructor(soundSet, extension) {
      this.isReady = false;
      fetch(`./${soundSet}.json`).then((response) => response.json()).then((json) => {
        this.fileNames = json;
        this.isReady = true;
      });
      this.path = `./sounds/${soundSet}/`;
      this.extension = extension;
      this.wordIndex = 0;
    }
    startSpeaking(text) {
      if (!this.isReady)
        return;
      const tokens = text.toLowerCase().split(/\s+/);
      const wordSounds = [];
      for (let i = 0; i < tokens.length; i++) {
        if (this.fileNames.indexOf(tokens[i]) === -1)
          continue;
        const audio = new Audio(`${this.path}${tokens[i]}.${this.extension}`);
        audio.volume = 0.2;
        wordSounds[i] = audio;
      }
      if (wordSounds.length === 0)
        return;
      const self = this;
      setTimeout(() => {
        for (let i = 0; i < wordSounds.length - 1; i++) {
          wordSounds[i].addEventListener("ended", function(e) {
            self.currentSound = wordSounds[i + 1];
            self.currentSound.play();
          }, { once: true });
        }
        wordSounds[0].play();
      }, _SoundSequencer.startDelay);
    }
    onVoiceStop(self, e) {
      if (!self.currentSound)
        return;
      self.currentSound.pause();
    }
    onChatMessage(self, e) {
    }
  };

  // scripts/eventdispatcher.js
  var EventDispatcher = class {
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
  };

  // scripts/overlay.js
  var audioElements = document.querySelectorAll("audio[command]");
  var soundCommands = new Array(audioElements.length);
  for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
  }
  var streamerUserId = "66293282";
  var token = new URLSearchParams(document.location.hash.substring(1)).get("access_token");
  var queueSize = 15;
  var alertRenderer = new AlertRenderer(soundCommands, queueSize);
  var cheermotes;
  (function requestCheermotes() {
    const req = new XMLHttpRequest();
    req.open("GET", `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${streamerUserId}`, true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function() {
      if (req.readyState == XMLHttpRequest.DONE && req.status >= StatusCodes.OK && req.status < StatusCodes.BAD_REQUEST) {
        cheermotes = JSON.parse(req.response);
        alertRenderer.cheermoteData = cheermotes;
      }
    };
    req.send();
  })();
  var canvas = document.getElementById("spectrum-surface");
  var overlaySongElement = document.getElementById("song-player-audio");
  overlaySongElement.volume = 0.8;
  var overlayAudioContext = new AudioContext();
  var songAudioSource = overlayAudioContext.createMediaElementSource(overlaySongElement);
  songAudioSource.connect(overlayAudioContext.destination);
  var drawContext = canvas.getContext("2d");
  var audioVisualizer = new SpecViz(overlayAudioContext, drawContext, 2);
  songAudioSource.connect(audioVisualizer.analyser);
  var overlaySongPlayer = new OverlaySongPlayer(overlayAudioContext);
  var hgruntSequencer = new SoundSequencer("hgrunt", "wav");
  hgruntSequencer.onChatMessage = (self, e) => {
    if (e.channel_points_custom_reward_id === "aa8336f9-b612-4df9-ac13-174c253edeee")
      self.startSpeaking(e.message.text);
  };
  var voxSequencer = new SoundSequencer("vox", "wav");
  voxSequencer.onChatMessage = (self, e) => {
    if (e.channel_points_custom_reward_id === "59a3780e-9fa6-41f2-b03a-5483537ecafd")
      self.startSpeaking(e.message.text);
  };
  var commandLibrary = {};
  function registerCommand(commandText, handler) {
    commandLibrary[commandText.toUpperCase()] = handler;
  }
  var lastDennisTime = Date.now();
  var baseDennisTimeout = 1e3;
  var dennisTimeout = baseDennisTimeout;
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
    let brbSongs = [];
    brbSongs = ["22", "23", "03 Raptor Rap", "Star Control 2 Orbit III OST", "cathedral", "world_map", "neptune", "Kurton - Jesus On TV", "shape memory alloys", "silius 1", "02_ecolove", "losttape4", "Under Cover of Night", "Hollywood Theme"];
    function loadSong(songInd) {
      let songIndex = parseInt(songInd);
      if (isNaN(songIndex) || songIndex >= brbSongs.length) {
        songIndex = Math.floor(Math.random() * brbSongs.length);
      }
      const songPath = `./songs/${brbSongs[songIndex]}.mp3`;
      songElement.src = songPath;
      songElement.load();
      const songPromise = new Promise((resolve) => {
        songElement.addEventListener("canplaythrough", () => {
          resolve();
        }, { once: true });
        if (songElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) resolve();
      });
      songPromise.then(() => {
        handleCanSongPlaythrough();
        fetch(songPath).then((response) => {
          if (!response.ok)
            return;
          return response.blob();
        }).then((data) => {
          if (!data)
            return;
          const reader = new FileReader();
          reader.onload = (e) => {
            const data2 = e.target.result;
            const tagData = data2.slice(data2.byteLength - 128, data2.byteLength - 1);
            const decoder = new TextDecoder();
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
      });
    }
    function handleCanSongPlaythrough() {
      overlaySongPlayer.playSong(songElement, false);
      requestAnimationFrame(drawVisualizer);
      songElement.addEventListener("ended", handleSongEnded, { once: true });
    }
    function handleSongEnded() {
      loadSong();
    }
    loadSong(song);
    function drawVisualizer(timeStamp) {
      if (!overlaySongPlayer.isPlaying)
        return;
      audioVisualizer.draw();
      requestAnimationFrame(drawVisualizer);
    }
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
    alertRenderer.enqueueCheer(
      `${cheermote} <-- an image should be over there`,
      cheermotes,
      "Dummy User",
      bitCount
    );
  });
  var subTypes = {
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
  var eventDispatcher = new EventDispatcher();
  eventDispatcher.subscribe(subTypes.follow, alertRenderer, alertRenderer.onNewFollower);
  eventDispatcher.subscribe(subTypes.subscribe, alertRenderer, alertRenderer.onNewSubscriber);
  eventDispatcher.subscribe(subTypes.gift, alertRenderer, alertRenderer.onSubGift);
  eventDispatcher.subscribe(subTypes.resub, alertRenderer, alertRenderer.onResub);
  eventDispatcher.subscribe(subTypes.chatMessage, null, (self, e) => {
    parseAndExecuteCommand(e.chatter_user_id, e.message.text);
  });
  eventDispatcher.subscribe(subTypes.chatMessage, alertRenderer, alertRenderer.onChatMessage);
  eventDispatcher.subscribe(subTypes.chatMessage, hgruntSequencer, hgruntSequencer.onChatMessage);
  eventDispatcher.subscribe(subTypes.chatMessage, voxSequencer, voxSequencer.onChatMessage);
  eventDispatcher.subscribe("voicestop", hgruntSequencer, hgruntSequencer.onVoiceStop);
  eventDispatcher.subscribe("voicestop", voxSequencer, voxSequencer.onVoiceStop);
  eventDispatcher.subscribe(subTypes.cheer, alertRenderer, alertRenderer.onCheer);
  eventDispatcher.subscribe(subTypes.raid, alertRenderer, alertRenderer.onRaid);
  eventDispatcher.subscribe(subTypes.pollBegin, alertRenderer, alertRenderer.onPollBegin);
  eventDispatcher.subscribe(subTypes.pollEnd, alertRenderer, alertRenderer.onPollEnd);
  var sessionId = null;
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
    } else if (subType === subTypes.chatMessage)
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
    req.onreadystatechange = function() {
    };
    req.send(JSON.stringify(subscription));
  }
  var eventSocket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
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
    } else if (messageType === "notification") {
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
    return false;
  };
  eventSocket.onclose = (e) => {
    console.log("Socket closed.");
  };
})();
