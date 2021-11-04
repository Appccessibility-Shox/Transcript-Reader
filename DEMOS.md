1. An embedded YouTube video:

Transcript Reader works to perfection with any embedded YouTube video. This is huge considering the number of sites, such as LATimes.com, Reddit, and Vox.com, that use embedded YouTube videos on their sites. And since YouTube is one of the few sites that uses speech-to-text to auto-captions their videos, it's an even larger share of transcribed content. 
![Demo of Transcript Reader working on an embedded YouTube video](Resources/YouTubeEmbedDemo.gif)

2. A Vimeo video:

Transcript Reader also works perfectly on Vimeo videos, whether they're embedded on another site or are on Vimeo.com. This is also huge considering how many sites use embedded vimeo videos.
![Demo of Transcript Reader working on Vimeo.com](Resources/VimeoDemo.gif)

3. A default player:

WebVTT is a tremendously popular and accessible solution to caption videos. Here's an example of Transcript Reader working great on a plain video with text tracks.
![Demo of Transcript Reader working on a default player](Resources/DefaultPlayerDemo.gif)

However, sometimes we aren't so lucky and scrubbing the track in realtime means that the transcript is only complete after your video is finished.

4. Embedded videos of all sorts:

Embedded videos work just as well as on-site videos.

5. Videos with on-site captions:

In some cases, videos have a transcript displayed on the webpage, such as Ted.com and NYTimes.com/video do. In these cases, and on a site-specific basis, Transcript Reader can open and scrape those transcripts. Actually, NYTimes.com/video and Ted.com both use WebVTT anyway, but getting the transcript via selectors was impleemented as the first option and only if it fails will it default to the standard mode of scrubbing the text track. The ability to get transcripts from multiple sources is what, I hope, will make Transcript Reader much more versatile and robust on a site-specific basis, even though the main goal is to make the default code so good that site-specific optimizations aren't needed.
![Demo of Transcript Reader working on NYTimes.com/video using selectors](Resources/DefaultPlayerDemo.gif)

6. Video.js videos:

Video.js is a popular open-source library for creating more custom players. Here's an example of Transcript Reader working on the demo provided on Video.js's site. As you can see, the video's captions are being scrubbed perfectly, but it's not instantaneous like it wass for 3.
![Demo of Transcript Reader working on Video.js's demo](Resources/VideoJSDemo.gif)


7. Plyr videos:

Plyr is another popular open-source library for creating custom players. Here's Transcript Reader running on the demo provided on Plyr.io. In this case, the transcript was available instantly again.
![Demo of Transcript Reader working on Plyr.io](Resources/PlyrDemo.gif)


