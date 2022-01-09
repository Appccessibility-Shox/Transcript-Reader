<h1 align="center">
  <span align="center">
    Transcript Reader for Safari (1.0) <img src="Resources/icon.png" alt="logo" width="50" height="50">
  </span>
  <a href="https://apps.apple.com/us/app/transcript-reader/id1595490573">
    <img align="right" style="position: absolute" src="Resources/AppStoreBadge.svg">
  </a>
</h1>
Reader view is a standard feature in Safari that allows users to read articles more comfortably. Transcript Reader extends this concept to video subtitles. Transcript Reader invites video watchers to select, search, copy, Quick note, and read ahead.

![A banner image displaying the words "Transcript Reader" surrounded by devices with Transcript Reader open](Resources/GitHub%20Banner.png)

## Demos
![Demo of Transcript Reader working on YouTube.com](Resources/YouTubeDemo.gif)

Want to see other demos? [Click here!](https://github.com/Appccessibility-Shox/Transcript-Reader/blob/main/DEMOS.md)

## Features
- Elegant design
- Context (a.k.a. right click) menu & toolbar button 
- Light mode & dark mode compatible
- Live highlighting of the active cue and of previously watched cues

## Who is Transcript Reader for?
1. Individuals with hearing impairments who want to read subtitles more comfortably.
2. Students who want to be able to copy and paste portions of a lecture into their notes.
3. Users with ADHD who may find it easier to focus on the video content when the rest of the webpage is hidden. 
4. Individuals with visual impairments who find traditional on-video captions to be illegible.
5. Anyone who wants a more comfortable experience watching videos and reading transcripts.

## How does Transcript Reader work?
Transcript Reader was built to work on whatever website you throw at it, but also with the ability to implement site-specific code for popular websites. By default, Transcript Reader scrapes transcripts by searching a videos TextTracks property for an English TextTrack of type "subtitles" or "captions". **Transcript Reader does *<u>not</u>* use artificial intelligence or any other speech-to-text method to transcribe videos.** Transcript Reader simply provides a different way of viewing subtitles.

## How does Transcript Reader perform on my favorite sites?
Below is a selection of popular websites and its performance on that site.

|              Site              |         Transcript       |    Player Controls    |
| ------------------------------ | ------------------------ | ----------------------|
| YouTube                        | Immediately Available ✅ | Site-controls ✅      |
| YouTube (Embedded)<sup>1</sup> | Immediately Available ✅ | Site-controls ✅      |
| Vimeo                          | Immediately Available ✅ | Site-controls ✅      |
| Vimeo (Embedded)               | Immediately Available ✅ | Site-controls ✅      |
| Ted                            | Immediately Available ✅ | Default controls ⚠️   |
| NYTimes.com/video              | Immediately Available ✅ | Default controls ⚠️   |
| WSJ.com/video                  | Immediately Available ✅ | Default controls ⚠️   |
| ESPN.com                       | Immediately Available ✅ | Default controls ⚠️   |
| NBC News                       | Immediately Available ✅ | Default controls ⚠️   |
| CNN                            | Immediately Available ✅ | Default controls ⚠️   |
| PBS Video                      | Requires Scrubbing ⚠️    | Site-controls ✅      |
| Washington Post                | Requires Scrubbing ⚠️    | Default controls ⚠️   |
| Daily Motion<sup>2</sup>       | Non-functional 🛑        | No Reader 🛑          |
| Fox News                       | Non-functional 🛑        | No Reader 🛑          |
| Netflix                        | Non-functional 🛑        | No Reader 🛑          |

<sup>1</sup>Embedded YouTube videos are used on a host of your favorite sites, such as Vox.com and LATimes.com, so this row actually encompasses large portions of the web, and because YouTube is one of the few websites that auto-transcribes most their videos, it's an even larger share of transcribed videos.

<sup>2</sup>Daily Motion, like YouTube, implemented a custom method for storing captions, rather than TextTracks. While it would be possible to implement a site-specific adjustment to account for this, I don't anticipate it being worth it given the dearth of captioned videos on their site.

## Why doesn't Transcript Reader work on some sites? What can I do?
99 times out of 100, when Transcript Reader fails it's because the website host has opted not to use the modern, accessible standard [VTT/TextTrack](https://css-tricks.com/improving-video-accessibility-with-webvtt/), in favor of a custom approach. Firstly, consider contacting the website's tech support and asking if they'd consider adopting the WebVTT standard. If you've tried that to no avail, and the website in question is popular, consider filing an issue on this page and hopefully I'll be able to address it. I already plan to add support for some popular sites like Netflix.

## How does Transcript Reader perform "in the wild"?
It's difficult to answer this for a couple reasons:
1. It's hard to find videos not hosted by YouTube.
2. It's hard to find captioned videos.
3. It's impossible to generate a "random sample" of videos with captions from the web.

Still, I Googled search terms like "video with captions" and "videojs captions example" and found 6 sites with custom players and subtitles. Of these, 50% had a transcript that was available instantly and 50% had a transcript that had to be scrubbed.
Another way of addressing this question is to assume that most of the web is using one of the popular open-source video player libraries, such as [Video.js](https://videojs.com/advanced/?video=elephantsdream) or [Plyr](https://plyr.io). I found that Transcript Reader worked on both the demos hyperlinked.
