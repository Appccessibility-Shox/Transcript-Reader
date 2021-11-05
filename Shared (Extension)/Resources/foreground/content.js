var frameUrl;
var crossOrigin;
var transcriptChannelPort;
var confirmationChannelPort;

var currentlyRunning = false;

browser.runtime.onMessage.addListener((msg) => {
  var triggeredByContextMenu = msg.action === 'contextMenuItemClicked'
  var triggeredByToolbarItem = msg.action === 'readerToolbarButtonClicked'
  
  if (triggeredByContextMenu) {
    frameUrl = msg.frameUrl;
    crossOrigin = new URL(frameUrl).hostname !== window.location.hostname
  } else if (triggeredByToolbarItem) {
    frameUrl = null;
    crossOrigin = false;
  }
  
  if (!currentlyRunning && (triggeredByContextMenu || triggeredByToolbarItem)) {
    currentlyRunning = true;
    if (window.location.hostname === 'www.youtube.com') {
      main(youTubeOptions);
    } else if (window.location.hostname === 'www.ted.com') {
      main(tedOptions);
    } else if (window.location.hostname === 'www.nytimes.com') {
      main(NYTOptions);
    } else if (frameUrl !== null && new URL(frameUrl).hostname === 'www.youtube.com') {
      youTubeOptions.getEmbedLink = function () {
        return frameUrl;
      };
      delete youTubeOptions.alternative;
      main(youTubeOptions);
    } else if (window.location.hostname === 'www.washingtonpost.com') {
      main(WaPoOptions);
    } else if (window.location.hostname === 'www.wsj.com') {
      main(WSJOptions);
    } else if (window.location.hostname === 'vimeo.com') {
      main(vimeoOptions);
    } else if (frameUrl !== null && new URL(frameUrl).hostname === 'player.vimeo.com') {
      main(vimeoCrossOriginOptions)
    } else if (crossOrigin) {
      main(defaultCrossOriginOptions)
    } else {
      main(defaultOptions);
    }
  }
});

async function main(options) {

  const video = getRelevantVideo(frameUrl);

  if (!options.hasOwnProperty('prepare') || crossOrigin) {
    options.prepare = function () {
      return Promise.resolve();
    };
  }

  await options.prepare(video);

  // get transcript.
  try {
    if (crossOrigin) {
      transcriptChannelPort = await getPortConnection("Transcript Channel Port");
      getPortConnection("Confirmation Channel Port").then((port) => {
        if (confirm("This video's cues are being lazy loaded. Would you like to scrub them?")) {
          if (confirm('Click okay if you want to scrub at the outset, or cancel to do it in realtime.')) {
            port.postMessage({result: trackScrubOptions.OUTSET});
          } else {
            port.postMessage({result: trackScrubOptions.REAL_TIME});
          }
        } else {
          port.postMessage({error: "Cancelled by user."});
        }
      });
    }
    var transcriptData = await getTranscript(options, video);
  } catch (error) {
    if (options.hasOwnProperty('alternative')) {
      main(options.alternative);
    } else {
      console.log(error)
    }
    return;
  }

  // generate reader template
  const [reader, container, transcript, background, videoContainer] = createReader();
  transcript.innerHTML = transcriptData.toHTML();

  const inserted = await insertVideoIntoReader(options, video, videoContainer);

  // booleans for readability
  const addable = (!transcriptData.unhighlightable && options.transcriptSource == transcriptSources.TRACK && transcriptData.track != null); // note that addable is false when the source frame is sending additions.
  const scrubbable = (options.videoSource !== videoSources.MOVE_FROM_PAGE);

  // scrubbing to enable addition:
  if (scrubbable && addable) {
    scrubEntireVideo(video, 5).then(() => {
      scrubEntireVideo(video, 3).then(() => {
        video.pause();
        video.playbackRate = 1;
      });
    });
  }

  // addition:
  if (addable) {
    transcriptData.track.addEventListener('cuechange', () => {
      Array.from(transcriptData.track.cues).forEach((cue) => {
        const targetIndex = transcriptData.addCue(cue.text, cue.startTime);
        const cueAsHTML = document.createElement('div');
        cueAsHTML.classList.add('TRcue'); // TODO: simplify all of this.
        cueAsHTML.innerText = `${removeLineBreaks(cue.text)} `;
        if (targetIndex === -1 || Array.from(container.querySelectorAll('.TRcue')).length === 0) {
          transcript.innerHTML = `<div class='TRcue'>${removeLineBreaks(cue.text)} </div>`;
        } else if (targetIndex === 0) { // oldest cue
          transcript.firstChild.before(cueAsHTML);
        } else if (targetIndex !== null) { // other.
          transcript.querySelectorAll('.TRcue')[targetIndex - 1].after(cueAsHTML);
        }
      });
    });
  }

  // addition via cross-origin frame.
  if (transcriptChannelPort) {
      transcriptChannelPort.addEventListener("message", function(e) {
        if (e.data.name == "addedCue") {
          const targetIndex = transcriptData.addCue(e.data.text, e.data.startTime);
          const cueAsHTML = document.createElement('div');
          cueAsHTML.classList.add('TRcue'); // TODO: simplify all of this.
          cueAsHTML.innerText = `${removeLineBreaks(e.data.text)} `;
          if (targetIndex === -1 || Array.from(container.querySelectorAll('.TRcue')).length === 0) {
            transcript.innerHTML = `<div class='TRcue'>${removeLineBreaks(e.data.text)} </div>`;
          } else if (targetIndex === 0) { // oldest cue
            transcript.firstChild.before(cueAsHTML);
          } else if (targetIndex !== null) { // other.
            transcript.querySelectorAll('.TRcue')[targetIndex - 1].after(cueAsHTML);
          }
        }
      })
    }

  // highlihting: videos.
  if (!transcriptData.unhighlightable && options.transcriptSource !== transcriptSources.PLAIN_TEXT) {
    
    inserted.video?.addEventListener('cuechange', () => {
      Array.from(transcriptData.track.activeCues).forEach((cue) => {
        colorCue(transcriptData, transcript, cue.text);
      })
    });
    
    inserted.video?.addEventListener('timeupdate', () => {
      colorCue(transcriptData, transcript, inserted.video.currentTime);
    });
    
    window.addEventListener("message", (event) => {
      if (event.data.name == "currentFrameTimeUpdate") {
          colorCue(transcriptData, transcript, event.data.time);
      } else if (event.data.name == "currentFrameCueUpdate") {
          colorCue(transcriptData, transcript, event.data.text);
      }
    });
    
  }

  // hiding page while reader is displayed:
  html.classList.add("tr-enabled")
  
  // teardown:
  container.onclick = function (e) {
    if (e.target == e.currentTarget) {
      currentlyRunning = false;
      html.classList.remove("tr-enabled")
      document.querySelectorAll(".tr-theme-color").forEach(metaTag => metaTag.remove())
      switch (options.videoSource) {
        case videoSources.MOVE_FROM_PAGE: {
          background.classList.add('disappearing');
          const { placeholder } = inserted;
          const video = inserted.video;
          placeholder.parentElement.replaceChild(video, placeholder);
          setTimeout(() => {
            reader.remove();
            // 400 refers to the length of the css animation. Only once the animation is completed should we remove the reader.
          }, 400);
          break;
        }
        case videoSources.COPY_VIDEO:
        case videoSources.EMBED_VIDEO:
          background.classList.add('disappearing');
          if (video && inserted.video) {
            video.pause();
            // syncVideoTimes(inserted.video, video);
            video.playbackRate = 1;
          }
          setTimeout(() => {
            reader.remove();
            // 400 refers to the length of the css animation. Only once the animation is completed should we remove the reader.
          }, 400);
      }
      Array.from(document.querySelectorAll(".tr-added-player-controls")).forEach(video => {video.removeAttribute("controls"); video.classList.remove("tr-added-player-controls")})
    }
  };
}

function colorCue(transcriptData, transcript, query) {
  const [text, startTime, index] = transcriptData.currentlyPlayingPhraseProperties(query);
  const currentlyEmphasizedCue = transcript.querySelector('.currentPhrase');

  if (transcriptData.blurbType === blurbTypes.CONTINUOUS) {
    if (text && (!currentlyEmphasizedCue || text !== currentlyEmphasizedCue.innerText)) {
      // replace the dark blue emphasis with a light blue watched indicator. TODO: extract this process to a helper function.
      currentlyEmphasizedCue?.classList.add('watched');
      currentlyEmphasizedCue?.classList.remove('currentPhrase');

      let lineBreaklessText = removeLineBreaks(text);

      // search the remaning unwrapped text to try to find "text" and wrap it. TODO: extract to helper.
      let childNodes = Array.from(transcript.childNodes);
      for (const node of childNodes) {
        if (node.textContent.includes(lineBreaklessText)) {
          let newNode = stringToHTML(node.textContent.replace(lineBreaklessText, `<div class='currentPhrase TRcue'>${lineBreaklessText} </div>`));
          node.replaceWith(newNode);
          newNode.outerHTML = newNode.innerHTML; // newNode is actually the body of a document frag, so we have to unwrap the <body> tag.
          break;
        }
      }
    }
  } else {
    // either blurb type is track or divided. In any case, assume as little as possible. Only go off of text.
    let currentIndex = Array.from(transcript.querySelectorAll('div')).findIndex(isEmphasized); // TODO: make more specif .TRcue.
    if (index !== currentIndex) {
      currentlyEmphasizedCue?.classList.remove('currentPhrase');
      currentlyEmphasizedCue?.classList.add('watched');
      transcript.querySelectorAll('div')[index]?.classList.add('currentPhrase');
    }
  }
}

function getTranscript(options, video) {
  const transcript = new Promise((resolve, reject) => {
  
    // if the call was made via a cross-origin
    if (crossOrigin) {
      
      transcriptChannelPort.addEventListener("message", function(e) {
        if (e.data.name == "getTranscriptResponse") {
          var transcriptData = new TranscriptData(null, e.data.blurbs, e.data.duration, e.data.startTimes);
          resolve(transcriptData)
        }
      })
      transcriptChannelPort.start();
      transcriptChannelPort.postMessage("getTranscript");
      return;
    }
    
    // same-origin case:
    let tracks;
    let track;
    if (video) {
      tracks = video.textTracks;
      track = getPreferredTrack(tracks);

      if (track) { undisableTrack(track) }
    }

    switch (options.transcriptSource) {
      case transcriptSources.TRACK: {
        if (!track.cues) {
          continuallySetTrackToShowingUntilCuesExist(video)
            .catch((err) => reject(err));
        }

        const transcriptData = new TranscriptData(track, null, video.duration);

        if (transcriptData.trackIsLazyLoaded) {
          if (options.trackScrubOption === undefined) {
            if (confirm("This video's cues are being lazy loaded. Would you like to scrub them?")) {
              if (confirm('Click okay if you want to scrub at the outset, or cancel to do it in realtime.')) {
                options.trackScrubOption = trackScrubOptions.OUTSET;
              } else {
                options.trackScrubOption = trackScrubOptions.REAL_TIME;
              }
            } else {
              reject('User opted not to continue.');
              return;
            }
          }

          switch (options.trackScrubOption) {
            case trackScrubOptions.REAL_TIME:
              resolve(transcriptData);
              break;
            case trackScrubOptions.OUTSET:
              scrubEntireVideo(video, 4).then(() => {
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
        options.fetchTranscript(frameUrl)
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
  });
  return transcript;
}

function insertVideoIntoReader(options, video, videoContainer) {
  return new Promise((resolve, reject) => {
    switch (options.videoSource) {
      case videoSources.MOVE_FROM_PAGE: {
        const parent = video.parentNode;
        const placeholder = document.createElement('tr-placeholder');
        parent.insertBefore(placeholder, video);
        videoContainer.appendChild(video);
        
        if (!video.controls) {
          video.controls = true
          video.classList.add("tr-added-player-controls")
        }
        
        const inserted = {
          video,
          placeholder,
        };
        resolve(inserted);
        break;
      }
      case videoSources.EMBED_VIDEO: {
        let embeddedFrame = createEmbeddedFrame(options.getEmbedLink);
        embeddedFrame.allow = 'fullscreen';
        videoContainer.appendChild(embeddedFrame);
        embeddedFrame.addEventListener('load', () => {
          var inserted;
          // same origin case:
          if (new URL(options.getEmbedLink()).hostname === window.location.hostname) {
            const video = embeddedFrame.contentDocument.querySelector('video');
            inserted = {
              video,
              container,
              type: 'same-origin',
            };
          }
          // cross origin case:
          else {
            embeddedFrame.contentWindow.postMessage('embeddedByTR', '*');

            inserted = {
              conteiner: embeddedFrame,
              type: 'cross-origin',
            };
          }

          resolve(inserted);
        }, true);
        break;
      }
      case videoSources.COPY_VIDEO: {
        const videoCopy = video.cloneNode(true);
        videoCopy.id = 'tr-copied';
        videoCopy.style.width = '100%';
        videoCopy.controls = true;
        videoContainer.appendChild(videoCopy);

        const inserted = {
          original_video: video,
          video: videoCopy,
        };
        resolve(inserted);
        break;
      }
      default:
        reject(new Error("Video source must be of type 'embed', 'move', or 'copy'"));
    }
  });
}
