# How to edit the website

A plain-English guide. You don't need to know web development.

## Which file do I open?

| I want to change…                         | Open this file            |
|-------------------------------------------|---------------------------|
| **Photos or videos** (anywhere)           | `photos-and-videos.js`    |
| Words on the home page                    | `index.html`              |
| Words on a landing page                   | e.g. `artists.html`       |
| The menu or footer (all pages at once)    | top of `script.js`        |
| Colours, fonts, sizes                     | Part 1 of `style.css`     |

Every file has notes in it (lines starting `//`, `/*` or `<!--`) explaining each part.

---

## Adding photos

You **don't need to crop or resize** photos to fit. Every photo spot has a fixed shape and the site crops the photo to fill it, so they always line up.

### The quick way (single photos)

Each photo spot already expects a file name. Save your photo with that name and it appears. The names are listed in `photos-and-videos.js`, and if a photo is missing, the site shows its expected name in the empty space.

For example, to add the top photo on the crazy golf page, save it as `images/pages/crazy-golf.jpg`.

### Featured project slides (home page)

1. Put your photos in the `photos-inbox` folder.
2. In a terminal, in the website folder, run:
   ```
   python3 tools/prepare_photos.py images/featured
   ```
3. It shrinks the photos and prints lines like this:
   ```
   { photo: "images/featured/sketch.jpg", step: "", caption: "" },
   ```
4. Paste them into `FEATURED_SLIDES` in `photos-and-videos.js`, then fill in the step name and caption.

Slides appear in the order you list them.

### Featured project videos

A slide can have a video instead of a photo. Short clips play silently on a loop, like a gif, and only while they're on screen. Add `withSound: true` for a normal video with a play button. The examples are in `photos-and-videos.js`.

Videos straight off a phone or camera are far too big (often 50–90 MB). Shrink each one before adding it. This makes it 1280px wide and removes the sound, usually leaving 1–4 MB:

```
ffmpeg -i my-clip.mp4 -an -vf scale=1280:-2 -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart videos/featured/my-clip.mp4
```

To keep the sound (for the "withSound" video), replace `-an` with `-c:a aac -b:a 96k`.

To make the poster (the still picture shown before it plays):

```
ffmpeg -i videos/featured/my-clip.mp4 -frames:v 1 -q:v 4 images/featured/my-clip-poster.jpg
```

Slides are 16:9 (widescreen), the same shape as most phone and camera videos.

### If the wrong part of a photo is cut off

Add `focus` to that photo's line:

```
{ photo: "images/featured/sketch.jpg", step: "Concept", caption: "...", focus: "top" },
```

You can use `"top"`, `"bottom"`, `"left"`, `"right"`, or something like `"50% 30%"` (across, down).
If nothing may be cut off (a diagram, for example), add `showWhole: true` instead.

### Why use the photo tool?

Phone photos are often 5–10 MB each, which makes the site slow, especially on phones. The tool makes them about 0.3 MB with no visible difference. It also turns them the right way up and **removes GPS location data**.

First time only, install its one requirement:
```
sudo pacman -S python-pillow
```

---

## Adding videos

Open `photos-and-videos.js` and find `VIDEOS`. Add a line:

```
{ title: "Sculpture in use", text: "Visitors triggering the light sequence.", tag: "My work", link: "https://www.youtube.com/watch?v=abc123" },
```

`link` can be:
- a **YouTube** or **Vimeo** link (best: keeps the site fast)
- a **video file** in the `videos` folder, e.g. `"videos/test.mp4"`. Keep these short (under ~20 MB).
- any other web page (shows a "Watch ↗" button)

`tag` is the small orange label, e.g. "My work", "Process" or "Inspiration".

---

## The 4 rules for photos-and-videos.js

If you break one of these, the photos stop showing and a red warning appears at the bottom of the page telling you so.

1. Text goes inside `"double quotes"`.
2. Every `{ ... }` line ends with a comma: `},`
3. File names must match exactly. Capital letters and `.jpg` vs `.jpeg` both count.
4. Don't delete the `[` `]` or `{` `}` brackets at the start and end of each list.

If something breaks, undo your last change.

---

## The design tool

`concept.html` is the free interactive sculpture design tool. Every page links to it from the menu and the footer ("Free design tool").

- The words on the page and the 8 questions: edit `concept.html`.
- The menu and footer link: `TOOLS` at the top of `script.js`. Change the wording there, or add a line for a new tool page.
- After the last question, visitors go to `concept-result.html`, the answers page. Its words are in that file; its messages (daily limit, "tell me more", errors) are in `MESSAGES` at the top of `concept-result.js`.
- Asking for mock-up images emails the visitor a "Verify" link. It opens `concept-verify.html`, which has the images and the design PDF made and emailed. Its words are in that file; its messages (expired link, already sent, errors) are in `MESSAGES` at the top of `concept-verify.js`.
- The server that writes the concepts is in the `concept-worker` folder (see its README).

**Trying the tool on your computer:** double-clicking won't work for the tool. In a terminal, in the website folder, run
`python3 -m http.server 8000`, then open http://localhost:8000/concept.html. The server must be in test mode
(`ALLOW_LOCAL_TEST` = `yes` in Cloudflare). Stop it with Ctrl+C.

---

## Landing pages

These are separate pages for different kinds of clients. They're good for linking from emails, ads or Instagram:

| Page                      | Who it's for |
|---------------------------|--------------|
| `artists.html`            | Artists, sculptors |
| `companies.html`          | Companies commissioning art |
| `galleries-museums.html`  | Curators, exhibition designers, museum technicians |
| `brand-experiences.html`  | Experiential marketing managers, brand activation managers, brand experience leads, young marketing agencies |
| `retail.html`             | Retail marketing teams, visual merchandisers |
| `creative-studios.html`   | Creative directors, experience designers |
| `events.html`             | Event producers |
| `crazy-golf.html`         | Crazy golf / mini golf venues |
| `prototyping.html`        | Anyone testing an idea |

The web address is e.g. `toucancreative.tech/crazy-golf.html`.

**To make a new one:** copy any landing page file, rename it, and change the words. Then add it to `LANDING_PAGES` at the top of `script.js` so it shows in the footer, and add a card for it in the "WHO I WORK WITH" section of `index.html`.

---

## Previewing changes before publishing

Open `index.html` in your web browser by double-clicking it. Refresh the page after each change.
YouTube videos may not play when you open the file like this. They will work once the site is published.

## Publishing

The site is hosted on GitHub Pages, so publishing means committing and pushing to `main`:
```
git add -A
git commit -m "Add new photos"
git push
```
