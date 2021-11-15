html = document.querySelector("html");

class Reader extends HTMLElement {
  constructor() {
    // Always call super first in constructor
    super();

    this.attachShadow({mode: 'open'});
    
    
    // add stylesheet:
    const trstyles = document.createElement('link');
    trstyles.setAttribute('rel', 'stylesheet');
    const trstylesUrl = browser.runtime.getURL('/foreground/trstyles.css')
    trstyles.setAttribute('href', trstylesUrl);
    
    const background = document.createElement("div")
    background.id = "background";
    background.style = "width: 100%; height: 100%; position: absolute; top: 0px; left: 0px; z-index: 50000000;"
    this.shadowRoot.append(trstyles, background)

    // article container. This is required because to get a slide-down dismiss animation. If we tried to get that effect with moving the reader, the sticky positioned video would stay at the top while the reader scrolls.
    const container = document.createElement("div");
    container.id = "tr-article-container";
    background.appendChild(container)
    
    // article is the actual gray bg that looks like paper.
    const article = document.createElement("div");
    article.id = "article";
    container.appendChild(article);

    // add the page's title as a header on the reader view.
    const videoTitle = document.createElement("h1");
    videoTitle.innerHTML = document.head.querySelector("title").innerText;
    article.appendChild(videoTitle);

    // create a video container.
    const videoContainer = document.createElement("div");
    videoContainer.id = "tr-video-container";
    article.appendChild(videoContainer)

    const transcript = document.createElement("div")
    transcript.id = "transcript";
    article.appendChild(transcript);

    function decidePaperStatus() {
      const windowWidth = window.innerWidth;
      const articleWidth = article.getBoundingClientRect().width;
      if (articleWidth + 140 > windowWidth) {
        background.classList.remove("paper")
      } else {
        background.classList.add("paper")
      }
    }
    
    setInterval(decidePaperStatus, 200)
    
    this.decidePaperStatus = decidePaperStatus
    
    window.addEventListener("resize", decidePaperStatus)
  }
  
  connectedCallback() {
    this.decidePaperStatus();
  }
}

customElements.define('transcript-reader', Reader);

String.prototype.toSeconds = function () {     if (!this) return null;     var hms = this.split(':');     return (+hms[0]) * 60 + (+hms[1] || 0);  }

// Sometimes many tracks are available. To know which to display, we use the criteria of language (preferring English). Eventually, we'll want users to be able to set their own preferred language in the containing app.
function getPreferredTrack(listOfTracks) {
    listOfTracks = Array.from(listOfTracks);
    listOfTracks = listOfTracks.filter(track => track.kind != "chapters" && track.kind != "metadata")
    const englishTracks = listOfTracks.filter(track => track.language.includes('en')) // includes is used here so as to includ en-GB and the like.
    if (englishTracks.length > 0) {
        return englishTracks[0]
    } else if (listOfTracks.length > 0) {
        return listOfTracks[0]
    } else {
      console.log(new Error("An appropriate TextTrack could not be found for this video."))
      return null
    }
}

// Courtesy of Amit Diwan on Tutorials Point (very, very slightly adapted).
function getCommonSubstringLength(str1, str2) {
    const s1 = [...str1];
       const s2 = [...str2];
       const arr = Array(s2.length + 1).fill(null).map(() => {
          return Array(s1.length + 1).fill(null);
       });
       for (let j = 0; j <= s1.length; j += 1) {
          arr[0][j] = 0;
       }
       for (let i = 0; i <= s2.length; i += 1) {
          arr[i][0] = 0;
       }
       let len = 0;
       let col = 0;
       let row = 0;
       for (let i = 1; i <= s2.length; i += 1) {
          for (let j = 1; j <= s1.length; j += 1) {
             if (s1[j - 1] === s2[i - 1]) {
                arr[i][j] = arr[i - 1][j - 1] + 1;
             }
             else {
                arr[i][j] = 0;
             }
             if (arr[i][j] > len) {
                len = arr[i][j];
                col = j;
                row = i;
             }
          }
       }
       if (len === 0) {
          return '';
       }
       let res = '';
       while (arr[row][col] > 0) {
          res = s1[col - 1] + res;
          row -= 1;
          col -= 1;
       }
       return res.length;
}

function getBestMatch(knownTextString, possibleMatches) {
    var bestMatch
    var highestMatchCount = 0
    for (possibleMatch of possibleMatches) {
        currentMatchCount = getCommonSubstringLength(knownTextString, possibleMatch.innerText)
        if (currentMatchCount > highestMatchCount) {
            highestMatchCount = currentMatchCount;
            bestMatch = possibleMatch;
        }
    }
    return bestMatch
}

// Courtesy of Chris Ferdinandi on GoMakeThings (adapted) https://gomakethings.com/how-to-test-if-an-element-is-in-the-viewport-with-vanilla-javascript/
function isInViewport(elem) {
    var bounding = elem.getBoundingClientRect();
    // element has to be fully in view horizontally and at least 0% in view vertically
    return (
        (getViewPercentage(elem) > 0) && bounding.left >= 0 && bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
};

function isInViewportHorizontally(elem) {
    var bounding = elem.getBoundingClientRect();
    // element has to be fully in view horizontally and at least 0% in view vertically
    return (
        bounding.left >= 0 && bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Courtesy of Mohammed Mansour on Stack Overflow https://stackoverflow.com/questions/3724738/how-do-i-extract-the-largest-image-by-dimension-on-a-site-given-the-url
function getLargestData(arrayOfData) {
    var maxDimension = 0;
    var maxData = null;
    for (data of arrayOfData) {
        element = data.element
        var currDimension = element.getBoundingClientRect().width * element.getBoundingClientRect().height;
        if (currDimension  > maxDimension){
            maxDimension = currDimension
            maxData = data;
        }
    }
    return maxData;
}

// Courtesy of rijkvanzanten on Gist https://gist.github.com/rijkvanzanten/df73ae28e80b9c6e5030baed4d1a90a6
function getViewPercentage(element) {
  const viewport = {
    top: window.pageYOffset,
    bottom: window.pageYOffset + window.innerHeight
  };

  const elementBoundingRect = element.getBoundingClientRect();
  const elementPos = {
    top: elementBoundingRect.y + window.pageYOffset,
    bottom: elementBoundingRect.y + elementBoundingRect.height + window.pageYOffset
  };

  if (viewport.top > elementPos.bottom || viewport.bottom < elementPos.top) {
    return 0;
  }

  // Element is fully within viewport
  if (viewport.top < elementPos.top && viewport.bottom > elementPos.bottom) {
    return 100;
  }

  // Element is bigger than the viewport
  if (elementPos.top < viewport.top && elementPos.bottom > viewport.bottom) {
    return 100;
  }

  const elementHeight = elementBoundingRect.height;
  let elementHeightInView = elementHeight;

  if (elementPos.top < viewport.top) {
    elementHeightInView = elementHeight - (window.pageYOffset - elementPos.top);
  }

  if (elementPos.bottom > viewport.bottom) {
    elementHeightInView = elementHeightInView - (elementPos.bottom - viewport.bottom);
  }

  const percentageInView = (elementHeightInView / window.innerHeight) * 100;

  return Math.round(percentageInView);
}

function scrubEntireVideo(video, speed, startTime) {
    
    return new Promise((resolve, reject) => {
        const initialTime = video.currentTime;
        const duration = video.duration;
        
        video.muted = true;
        video.currentTime = 1; // some videos may run scripts to pause for exampe at 0 so keep this at 1.
        video.playbackRate = speed;
        video.play();
        video.addEventListener("timeupdate", waitTillEnd);
        
        function waitTillEnd() {
            if(video.currentTime > video.duration-15){
                if (!startTime) {
                    video.currentTime = initialTime;
                } else {
                    video.currentTime = startTime;
                }
                video.removeEventListener("timeupdate", waitTillEnd)
                resolve(initialTime);
            }
        }
    })
    
}

function last(array) {
    return array[array.length - 1];
}

function undisableTrack(track) {
  if (track.mode == "disabled") {
    track.mode = "hidden";
  }
}

function continuallySetTrackToShowingUntilCuesExist(video) {
    
    return new Promise((resolve, reject) => {
        track = getPreferredTrack(video.textTracks);
        if (track.mode != "disabled") {
            resolve();
        }
        var checksMadeSoFar = 0;
        const getText = setInterval(function() {
            if (checksMadeSoFar < 100) {
                undisableTrack(track);
                checksMadeSoFar = checksMadeSoFar + 1
            } else {
                clearInterval(getText)
                reject(new Error("Timed out: unable to detect TextTrack. Please enable captions and perhaps get one to display before trying again."))
            }
        }, 25)
        video.textTracks.addEventListener('change', (event) => {
            if (track.mode != "disabled" && track.cues.length > 0) {
                clearInterval(getText);
                resolve();
            }
        });
    })
    
}

// courtesy of gafi on Stack Overflow https://stackoverflow.com/questions/586182/how-to-insert-an-item-into-an-array-at-a-specific-index-javascript
const insert = (arr, index, newItem) => [
  ...arr.slice(0, index),
  newItem,
  ...arr.slice(index)
]

const blurbTypes = {
  CONTINUOUS: 'continuous',
  DIVIDED: 'divided',
};

// TranscriptData is the object that getTranscript should return. The reason for encapsulating is simple: there are lots of ways a track can exist.
function TranscriptData(track, blurbs, duration, startTimes, endTimes) { // track is a TextTrack and blurbs is an array of strings (possibly unbroken).
  // core variables.
  this.track = track;
  this.blurbs = blurbs;
  this.duration = duration;
  this.startTimes = startTimes ?? (track?.cues ? Array.from(track.cues).map((cue) => cue.startTime) : [])
  this.endTimes = endTimes ?? (track?.cues ? Array.from(track.cues).map((cue) => cue.endTime) : [])
  this.blurbType = (function () {
    switch (blurbs?.length) {
      case 0:
      case undefined:
        return null;
      case 1:
        return blurbTypes.CONTINUOUS;
      default:
        return blurbTypes.DIVIDED;
    }
  }());
  
  this.texts = blurbs ?? (track?.cues ? Array.from(this.track.cues).map((cue) => cue.text) : [])

  this.toHTML = function () {
    //  consider whether we even want to have startTimes listed at the div level.
    if (!this.blurbs && this.track) {
      return Array.from(this.track.cues).map((cue) => `<div class='TRcue' startTime=${cue.startTime}>${cue.text} </div>`).join('');
    } if (this.blurbs) {
      switch (this.blurbType) {
        case blurbTypes.CONTINUOUS:
          return `${this.blurbs[0]}`;
          break;
        case blurbTypes.DIVIDED:
          if (!this.startTimes) {
            return this.blurbs.map((blurb) => `<div class='TRcue'>${blurb} </div>`);
          }
          if (this.startTimes.length != this.blurbs.length) {
            console.log("startTimes' length should match blurbs' length");
          }
          return [...Array(this.blurbs.length).keys()].map((index) => `<div startTime=${this.startTimes[index]} class='TRcue'>${this.blurbs[index]} </div>`).join('');

          break;
        default:
          return ""
      }
    }
  };

  this.currentlyPlayingPhraseProperties = function (query) { // query can either be a time, or it can be an activeCue.
    if (typeof query === 'number') {
      const i = this.currentIndexFromTime(query);
      return [this.texts[i], this.startTimes[i], i];
    } else if (typeof query === 'string') {
      const i = this.currentIndexFromText(query);
      return [this.texts[i], this.startTimes[i], i];
    } else if (query.constructor.name == 'VTTCue') {
      var g = this.currentIndexFromTime(query.startTime + 0.01);
      const h = this.currentIndexFromText(query.text);
      if (g != h) { console.log('resultant indices from time and text queries do not agree', g, h); }
      if (g === -1) { g = null; }
      const i = g ?? h;
      return [query.text, query.startTime, i];
    } else if (query.constructor.name === 'TextTrackCueList') {
      var g = this.currentIndexFromTime(query[0].startTime + 0.01);
      const h = this.currentIndexFromText(query[0].text); // TODO: redesign currentIndexFromText so that it also returns -1 when it finds no match rather than returning array length + 1
      if (g != h) { console.log('resultant indices from time and text queries do not agree', g, h); }
      if (g === -1) { g = null; }
      const i = g ?? h;
      return [query[0].text, query[0].startTime, i];
    } else {
        alert("attempted to return currently playing phrase's properties based on an unsupported input.");
    }
  };

  this.currentIndexFromTime = function (currentTime) {
    var target = this.startTimes.findIndex((startTime) => currentTime < startTime);

    if (target === -1) { target = this.startTimes.length; }
    let i = target - 1;
    if (this.startTimes.length === 0) { i = -1; }

    // an explanation of i's behavior:
    // If the list of times is empty, or the time passed in is smaller than any startTime, it will be -1;
    // Otherwise, it gives the index of the startTime of the cue that would be playing.

    return i;
  };

  this.currentIndexFromText = function (currentCueText) {
    let currentIndex;
    const filtered = this.texts.some((cueText, index) => {
      currentIndex = index;
      return cueText.trim() === currentCueText.trim();
    });
    if (currentIndex > this.texts.length) { alert('Something went wrong getting current index from a text query.'); }
    return currentIndex;
  };

  this.targetIndexFromTime = function (currentTime) {
    const target = this.startTimes.findIndex((startTime) => currentTime < startTime);
    if (target === -1 && this.startTimes.length > 0) {
      return this.startTimes.length;
    } // hence, this is only -1 if startTimes is empty/null.
    return target;
  };

  this.addCue = function (text, startTime) {
    if (text === null || startTime === null) {
      throw 'Attempted to add a cue with null/undefined text or startTime.';
    } else if (this.texts.length === 0 || this.startTimes.length === 0) {
      this.texts = [text];
      this.startTimes = [startTime];
      return 0;
    } else if (this.startTimes.includes(startTime) || this.texts.includes(text)) { // not a perfect condition. Need to make duplicate st and txt have same index. Don't naively add this.texts.includes(text) b/c texts is a computed property whereas startTimes is not.
      return null;
    } else {
      const targetIndex = this.targetIndexFromTime(startTime);
      this.texts = insert(this.texts, targetIndex, text);
      this.startTimes = insert(this.startTimes, targetIndex, startTime);
      return targetIndex;
    }
  };

}

Object.defineProperty(TranscriptData.prototype, 'timesKnown', {
  get() {
    return this.startTimes != null;
  },
});

Object.defineProperty(TranscriptData.prototype, 'blurbType', {
  get() {
    if (!this.blurbs) {
      return null;
    } if (this.blurbs.length === 1) {
      return blurbTypes.CONTINUOUS;
    } if (this.blurbs.length > 1) {
      return blurbTypes.DIVIDED;
    }
    return null;
  },
});

Object.defineProperty(TranscriptData.prototype, 'unhighlightable', {
  get() {
    return (this.startTimes === null && this.track === null);
  },
});

Object.defineProperty(TranscriptData.prototype, 'trackIsLazyLoaded', {
  get() {
    // if there's a track, but it doesn't seem to have tons of cues relative to the video's length, then assume it's a lazily loaded track.
    if (this.track && this.duration) {
      return (this.track.cues.length === 0 || last(Array.from(this.track.cues)).endTime < this.duration * 1.5);
    } if (!this.duration) {
      alert("Attempted to resolve lazy loading of a track when the video's duration was not set");
      return null;
    }
    return null;
  },
});

// convertVTTtoJSON. May be useful. Credits to Joe Gesualdo https://github.com/joegesualdo/vtt-to-json/blob/master/index.js
// this fetch("dist/mediaelement.vtt").then(result => result.text()).then(vtt => convertVttToJson(vtt)).then(json => console.log(json))
// worked on http://www.mediaelementjs.com

async function setVideoPlaybackProperties(videoOrWindow, properties) {
  if (videoOrWindow.window) {
    _window = videoOrWindow;
    console.log(properties)
    _window.postMessage({name: "Set Playback Properties", properties: properties}, "*")
  } else {
    video = videoOrWindow
    video.playbackRate = properties.rate;
    video.muted = properties.muted;
    video.paused = properties.paused;
    video.currentTime = properties.time;
  }
}

function getVideoPlaybackProperties(videoOrWindow) {
  console.log(videoOrWindow)
  
  props = new Promise( async (resolve, reject) => {
    if (!videoOrWindow) {
      console.log("Found null while attempting to get playback properties.")
    }
    
    var properties = {}
    if (videoOrWindow.window) {
      _window = videoOrWindow
      try {
        properties = await requestPlaybackPropertiesFromFrame(_window);
        resolve(properties);
      } catch(e) {
        alert(e)
      }
    } else {
      video = videoOrWindow
      properties.rate = video.playbackRate;
      properties.muted = video.muted;
      properties.paused = video.paused;
      properties.time = video.currentTime;
      console.log(properties)
      resolve(properties)
    }
  })
  
  return props
}

async function syncVideoPlaybackProperties(videoOrWindowA, videoOrWindowB) {
  
  if (!videoOrWindowA || !videoOrWindowB) {
    console.log("Found null while attempting to sync video playback properties.")
  }
  
  console.log(videoOrWindowA, videoOrWindowB, "parameters")
  // this function will take the time from A and set B's time to match it.
  var playbackRateFromA;
  var mutedFromA;
  var pausedFromA;
  var currentTimeFromA;
  
  if (videoOrWindowA.window) {
    windowA = videoOrWindowA
    try {
      properties = await requestPlaybackPropertiesFromFrame(windowA)
      playbackRateFromA = properties.rate
      mutedFromA = properties.muted
      pausedFromA = properties.paused
      currentTimeFromA = properties.time
    } catch(e) {
      alert(e)
    }
  } else {
    videoA = videoOrWindowA
    playbackRateFromA = videoA.playbackRate;
    mutedFromA = videoA.muted;
    pausedFromA = videoA.paused;
    currentTimeFromA = videoA.currentTime;
  }
  
  if (videoOrWindowB.window) {
    windowB = videoOrWindowB;
    windowB.postMessage({name: "Set Playback Properties", properties: properties}, "*")
  } else {
    videoB = videoOrWindowB
    videoB.playbackRate = playbackRateFromA ?? 1;
    videoB.muted = mutedFromA ?? false;
    videoB.paused = pausedFromA ?? true;
    videoB.currentTime = currentTimeFromA ?? 2;
  }
  
}

function requestPlaybackPropertiesFromFrame(windowReceivingRequest) {
  return new Promise((resolve, reject) => {
    window.onmessage = ({data}) => {
      if (data.name !== "playback properties from frame");
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
      setTimeout(() => reject("Promise timed out after .5 seconds while attempting to glean a frame's current time."), 500)
    };
    windowReceivingRequest.postMessage("What are the playback properties of your video?", "*");
  })
}

function getTranscript(options, video, port) {
  const transcript = new Promise( async (resolve, reject) => {
  
    runningInSubFrame = window.self !== window.top;
    runningInMainWindow = !runningInSubFrame;
    portProvided = port != null;
    
    if (portProvided) {
      port.addEventListener("message", function(e) {
        if (e.data.name == "getTranscriptResponse") {
          var transcriptData = new TranscriptData(null, e.data.blurbs, e.data.duration, e.data.startTimes);
          resolve(transcriptData)
        }
      })
      port.start();
      port.postMessage("getTranscript");
      return;
    }
    
    console.log(runningInSubFrame, video)
    
    if (!video) { reject("Video not found.") }
    
    tracks = video.textTracks;
    track = getPreferredTrack(tracks);
    
    if (track) { undisableTrack(track) }
    
    switch (options.transcriptSource) {
      case transcriptSources.TRACK: {
        if (!track) {
          reject("track not found")
          return;
        }
        
        if (!track.cues) {
          continuallySetTrackToShowingUntilCuesExist(video)
            .catch((err) => reject(err));
        }
        
        const transcriptData = new TranscriptData(track, null, video.duration);
        if (runningInSubFrame) {
          updateForegroundOfNewCues(track);
        }
        
        if (transcriptData.trackIsLazyLoaded) {
          // TODO: refactor this redundant code (the switch statement is copy-pasted).
          scrubPreference = options.trackScrubOption;
          if (!scrubPreference && runningInSubFrame) {
            await requestConfirmationResultFromMainWindow().then(userResponse => scrubPreference = userResponse)
          } else if (!scrubPreference && runningInMainWindow) {
            presentConfirmDialogs(() => {scrubPreference = trackScrubOptions.OUTSET}, () => {scrubPreference = trackScrubOptions.REAL_TIME}, () => reject("Aborted by user."))
          }
          switch (scrubPreference) {
            case trackScrubOptions.REAL_TIME:
              resolve(transcriptData);
              scrubEntireVideo(video, 5).then(()=> {
                video.playbackRate = 1;
              })
              break;
            case trackScrubOptions.OUTSET:
              scrubEntireVideo(video, 5).then(() => {
                video.playbackRate = 1;
                resolve(transcriptData);
              });
              break;
          }
        } else {
          resolve(transcriptData);
        }
        break;
      }
      case transcriptSources.TRANSCRIPT:
        options.openTranscript()
          .then(() => {
            const texts = Array.from(document.querySelectorAll(options.cueTextSelector)).map((element) => element.innerText);
            const startTimes = Array.from(document.querySelectorAll(options.timeStampSelector)).map((element) => element.innerText).map((hms) => hms.toSeconds());
            const transcriptData = new TranscriptData(track, texts, video.duration, startTimes);
            resolve(transcriptData);
          })
          .catch((error) => reject(error));
        break;
      case transcriptSources.FETCH:
        options.fetchTranscript()
          .then((transcriptData) => resolve(transcriptData))
          .catch((error) => reject(error));
        break;
      case transcriptSources.PLAIN_TEXT:
        var possibleSources = Array.from(document.querySelectorAll(options.plainTextSelector));

        if (options.joinPlainTextSelectorMatches) {
          script = Array.from(document.querySelectorAll(options.plainTextSelector)).map((match) => match.innerText).join(' ');
          const transcriptData = new TranscriptData(track, [script], video.duration);
          resolve(transcriptData);
        }

        if (possibleSources.length === 0) {
          reject(new Error(`Searched for plaintext transcript at selector matching ${options.plainTextSelector}, but couldn't find any elements matching this selector.`));
        } else if (possibleSources.length === 1) {
          const transcriptData = new TranscriptData(track, [document.querySelector(options.plainTextSelector).innerText], video.duration);
          resolve(transcriptData);
        } else if (track.cues) {
          // When there are multiple matches of the plainTextSelector, we might be able to use the track to know which to use.
          const knownTextString = Array.from(track.cues).map((cue) => cue.text).join(' ');
          const bestMatch = getBestMatch(knownTextString, possibleSources);
          const transcriptData = new TranscriptData(track, [bestMatch.innerText], video.duration);
          resolve(transcriptData);
        } else {
          reject(new Error('Unfortunately, multiple matches existed for the transcript selector, and we were not able to use the track to determine which was right. Hence, the following transcript might be incorrect. Please consider filing an issue at https://github.com/Appccessibility-Shox/Transcript-Reader/issues'));
        }
        break;
      default:
        reject(new Error("Couldn't get transcript. The options object's transcript source property must be set to either 'track', 'transcript', 'plaintext' or 'fetch'."));
    }
  })
  
  return transcript
}
