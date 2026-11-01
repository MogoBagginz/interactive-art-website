/* =====================================================================
   PHOTOS & VIDEOS
   ---------------------------------------------------------------------
   This is the ONLY file you need to edit to change photos and videos
   anywhere on the site. (Full guide: HOW-TO-EDIT.md)

   THE RULES (break one and the photos stop showing):
     • Text goes inside "double quotes".
     • Every { ... } item ends with a comma:  },
     • File names must match exactly — capitals and .jpg / .jpeg count.
     • Lines starting with // are notes. The website ignores them.

   PHOTO SIZES: you don't need to resize or crop anything. Each photo is
   cropped automatically to fit its space. If the wrong part is cut off,
   add  focus: "top"  (or "bottom", "left", "right").
   If nothing may be cut off (e.g. a diagram), add  showWhole: true

   Tip: big phone photos make the site slow. Run the photo tool first:
        python3 tools/prepare_photos.py
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SINGLE PHOTOS
   Each page has a photo spot with a name (left). To change a photo,
   either:
     a) save your photo with the file name shown (easiest), or
     b) change the file name here to point at your photo.
   --------------------------------------------------------------------- */
const PHOTOS = {

  // Home page
  home_top:   { file: "images/home-top.jpg",  alt: "Interactive sculpture by Toucan Creative Technology" },
  about:      { file: "images/headline.jpeg", alt: "Murali Wood, founder of Toucan Creative Technology", focus: "top", blackAndWhite: true },

  // Landing pages (one photo at the top of each)
  artists:           { file: "images/pages/artists.jpg",           alt: "Artist and engineer working on a sculpture" },
  companies:         { file: "images/pages/companies.jpg",         alt: "Interactive sculpture commissioned by a company" },
  galleries_museums: { file: "images/pages/galleries-museums.jpg", alt: "Interactive installation in an exhibition space" },
  prototyping:       { file: "images/pages/prototyping.jpg",       alt: "Electronics prototype on the workbench" },
  crazy_golf:        { file: "images/pages/crazy-golf.jpg",        alt: "Interactive crazy golf obstacle" },
  brand_experiences: { file: "images/pages/brand-experiences.jpg", alt: "Interactive brand activation" },
  retail:            { file: "images/pages/retail.jpg",            alt: "Interactive retail window display" },
  creative_studios:  { file: "images/pages/creative-studios.jpg",  alt: "Interactive experience design" },
  events:            { file: "images/pages/events.jpg",            alt: "Interactive installation at an event" },

};


/* ---------------------------------------------------------------------
   2. FEATURED PROJECT SLIDES  (home page — slides left and right)
   The story of the project, from first render to finished piece.
   Slides show in this order. Each one has a photo OR a video.

   A slide with a PHOTO:
     { photo: "images/featured/my-photo.jpg", step: "Concept", caption: "A few words." },

   A slide with a short LOOPING VIDEO (silent, plays by itself, like a gif):
     { video: "videos/featured/my-clip.mp4", poster: "images/featured/my-clip-poster.jpg", step: "Testing", caption: "A few words." },

   A slide with a NORMAL VIDEO (play button, with sound) — add  withSound: true
     { video: "videos/featured/finished.mp4", poster: "...", withSound: true, step: "Finished", caption: "..." },

   "poster" is the still picture shown until the video starts (optional).
   Video files: MP4, 1280px wide, short. See HOW-TO-EDIT.md for how to shrink them.
   --------------------------------------------------------------------- */
const FEATURED_SLIDES = [

  { photo: "images/featured/concept.jpg", step: "Concept",
    caption: "The artist's renders. A sculpture that responds to a visitor's heartbeat, read through a sensor." },

  // Add the research clip when it's ready, then remove the // at the start of the next line:
  // { video: "videos/featured/research.mp4", poster: "images/featured/research-poster.jpg", step: "Research", caption: "Working out how to bring it to life, one design decision at a time." },

  { video: "videos/featured/prototype.mp4", poster: "images/featured/prototype-poster.jpg", step: "Prototype",
    caption: "The first proof it could work." },

  { video: "videos/featured/electronics.mp4", poster: "images/featured/electronics-poster.jpg", step: "Electronics",
    caption: "Building the final system that turns a heartbeat into light." },

  { video: "videos/featured/testing.mp4", poster: "images/featured/testing-poster.jpg", step: "Testing",
    caption: "Scopes on, testing every signal before it goes in the sculpture." },

  { video: "videos/featured/assembly.mp4", poster: "images/featured/assembly-poster.jpg", step: "Assembly",
    caption: "Electronics meet lampshades. The sculpture takes shape." },

  { video: "videos/featured/finished.mp4", poster: "images/featured/finished-poster.jpg", withSound: true, step: "Finished",
    caption: "Finished electronics, ready to hand over to the artist. Check back soon for updates." },

];


/* ---------------------------------------------------------------------
   3. VIDEOS  (home page — "Video references" section)

   "link" can be any of these:
     • a YouTube link   e.g. "https://www.youtube.com/watch?v=abc123"
     • a Vimeo link     e.g. "https://vimeo.com/123456789"
     • a video file you've put in the videos folder, e.g. "videos/sculpture.mp4"
       (keep files short and small — under about 20 MB — or use YouTube)
     • any other web link (shows as a "Watch" button)

   "tag" is a small label, e.g. "My work", "Process", "Inspiration".
   "poster" (optional, files only) is a photo shown before it plays.

   Copy this line to add a video:
     { title: "Title", text: "One line about it.", tag: "My work", link: "https://youtu.be/..." },
   --------------------------------------------------------------------- */
const VIDEOS = [

  // { title: "Sculpture responding to visitors", text: "The finished piece in use.", tag: "My work", link: "https://www.youtube.com/watch?v=XXXXXXXXXXX" },
  // { title: "Workbench test", text: "First test of the sensor system.", tag: "Process", link: "videos/bench-test.mp4", poster: "images/featured/02-prototype.jpg" },

];
