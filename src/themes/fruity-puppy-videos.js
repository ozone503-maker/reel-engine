// Fruity Puppy Slots: which video plays for which result.
// Videos live in public/assets/videos/ (served at <base>/assets/videos/).
// To add a video: drop the .mp4 into public/assets/videos/ and add or change a line below.
// Format: 9:16 portrait (360x640 or larger), H.264 + AAC, "faststart"
//   (ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4) so phones can start playing before it fully downloads.
// Length is read from the file itself, so there is no duration to keep in sync.

export const VIDEO_DIR = "assets/videos/";

export const VIDEOS = {
  // A win that uses the wild symbol (beats everything else).
  wild: "wild-win.mp4",
  // Free spins awarded (4 or 5 Free Spin symbols).
  freeSpins: "freespins-win.mp4",
  // "Spin again" video after a run of losing spins (see NO_WIN_STREAK).
  noWinStreak: "dontbesad-win.mp4",
  // Free jar (5 jars in a row). Set a file name here to give it its own video.
  jar: null,
  // Intro (not shown at the moment).
  intro: "intro.mp4",
  // Per-symbol win videos, keyed by the symbol id in fruity-puppy.js.
  // When several symbols win at once, the biggest-paying one with a video plays.
  symbols: {
    ipo: "ipo-win.mp4",
    ruch: "ruch-win.mp4",
    fonk: "fonk-win.mp4",
    dinny: "dinny-win.mp4",
    nonna: "nonna-win.mp4",
    erv: "erv-win.mp4",
    "cranberry-hibiscus": "cranberry-hibiscus-win.mp4",
    papaya: "papaya-win.mp4",
    lilikoi: "lilikoi-win.mp4",
    "aloe-vera": "aloe-vera-win.mp4",
    spearmint: "spearmint-win.mp4",
    "ice-cream-bean": "ice-cream-bean-win.mp4",
  },
};

// The no-win video plays after this many losing spins in a row, then the count starts over.
export const NO_WIN_STREAK = 2;

export const videoUrl = (file) => (file ? `${import.meta.env.BASE_URL}${VIDEO_DIR}${file}` : null);
