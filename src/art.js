import { propArt } from "./prop-art.js";
import { RACES, rng } from "./data.js";
const cache = new Map(),
  urls = new Map();
function surface(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function painter(c) {
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const rect = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // Scan-converted polygons deliberately have no antialiasing: every dot is an atlas pixel.
  const poly = (pts, color) => {
    const y0 = Math.floor(Math.min(...pts.map((p) => p[1]))),
      y1 = Math.ceil(Math.max(...pts.map((p) => p[1])));
    g.fillStyle = color;
    for (let y = y0; y < y1; y++) {
      const xs = [];
      for (let a = pts.length - 1, b = 0; b < pts.length; a = b++) {
        const [x1, y1] = pts[a],
          [x2, y2] = pts[b];
        if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5))
          xs.push(x1 + ((y + 0.5 - y1) * (x2 - x1)) / (y2 - y1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        g.fillRect(
          Math.round(xs[i]),
          y,
          Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i])),
          1,
        );
    }
  };
  const line = (x1, y1, x2, y2, color, w = 1) => {
    const d = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= d; i++)
      rect(
        x1 + ((x2 - x1) * i) / (d || 1),
        y1 + ((y2 - y1) * i) / (d || 1),
        w,
        w,
        color,
      );
  };
  return { g, rect, poly, line };
}
const pineColors = {
  pine: ["#2b5548", "#376747", "#4b8150", "#78a15e"],
  coldpine: ["#355457", "#486962", "#6d8b79", "#90a993"],
  snowpine: ["#405e64", "#688779", "#a1bab0", "#dde1c7"],
  fir: ["#2d5441", "#38663e", "#5d854b", "#84a458"],
};
export function sprite(id, v = 0) {
  const key = id + ":" + v;
  if (cache.has(key)) return cache.get(key);
  const S = 40,
    c = surface(S, S),
    { rect: r, poly: p, line: l } = painter(c),
    rand = rng(917 + v * 1651),
    x = 20;
  if (propArt(id, { rect: r, poly: p, line: l })) {
    cache.set(key, c);
    return c;
  }
  if (pineColors[id]) {
    const [a, b, d, e] = pineColors[id];
    r(18, 31, 4, 7, "#68543c");
    r(18, 33, 1, 5, "#b18b57");
    for (const [yy, h, w] of [
      [12, 21, 13],
      [8, 18, 11],
      [3, 17, 9],
    ]) {
      p(
        [
          [20, yy],
          [20 + w, yy + h - 2],
          [25, yy + h - 2],
          [26, yy + h],
          [16, yy + h],
          [14, yy + h - 2],
          [20 - w, yy + h - 2],
        ],
        a,
      );
      p(
        [
          [20, yy],
          [23, yy + h - 3],
          [16, yy + h - 1],
          [20 - w + 1, yy + h - 3],
        ],
        b,
      );
      p(
        [
          [20, yy],
          [18, yy + h - 5],
          [20 - w + 2, yy + h - 4],
        ],
        d,
      );
      l(18, yy + 6, 15, yy + 12, e);
    }
  } else if (
    ["oak", "cherry", "jungleTree", "autumn", "treefolk", "mushTree"].includes(
      id,
    )
  ) {
    const cc =
      id === "cherry"
        ? ["#805a69", "#ae758a", "#d794a3", "#efb9bc"]
        : id === "autumn"
          ? ["#806c3f", "#a18647", "#c6a253", "#ddbc72"]
          : id === "jungleTree"
            ? ["#285c46", "#367648", "#579953", "#97b35e"]
            : ["#385d40", "#4c7944", "#72a254", "#aaca75"];
    r(18, 22, 5, 16, "#74583e");
    r(18, 24, 2, 12, "#987541");
    l(18, 29, 11, 23, "#856a45", 2);
    l(22, 28, 28, 21, "#68583e", 2);
    const blob = (xx, yy, ww, hh, k) => {
      p(
        [
          [xx + 3, yy],
          [xx + ww - 5, yy],
          [xx + ww - 5, yy + 2],
          [xx + ww - 2, yy + 2],
          [xx + ww, yy + 6],
          [xx + ww, yy + hh - 4],
          [xx + ww - 4, yy + hh],
          [xx + 4, yy + hh],
          [xx + 4, yy + hh - 2],
          [xx, yy + hh - 2],
          [xx, yy + 4],
          [xx + 3, yy + 4],
        ],
        k,
      );
    };
    blob(5, 14, 29, 16, cc[0]);
    blob(4, 12, 16, 13, cc[1]);
    blob(14, 10, 20, 16, cc[1]);
    blob(10, 5, 18, 14, cc[2]);
    blob(6, 12, 12, 10, cc[2]);
    r(15, 6, 6, 2, cc[3]);
    r(11, 9, 3, 2, cc[3]);
    r(7, 15, 4, 2, cc[3]);
    r(22, 18, 4, 2, cc[2]);
    r(27, 21, 3, 2, cc[2]);
  } else if (id === "palm") {
    p(
      [
        [18, 36],
        [22, 36],
        [24, 17],
        [22, 13],
        [19, 23],
      ],
      "#78583a",
    );
    r(19, 28, 3, 2, "#b38c57");
    r(20, 23, 3, 2, "#b38c57");
    for (const a of [
      [
        [21, 15],
        [12, 8],
        [6, 10],
        [2, 18],
        [10, 14],
        [15, 13],
      ],
      [
        [21, 15],
        [16, 4],
        [11, 2],
        [10, 8],
        [15, 11],
      ],
      [
        [20, 14],
        [23, 5],
        [30, 4],
        [28, 9],
      ],
      [
        [21, 14],
        [29, 10],
        [35, 13],
        [38, 20],
        [30, 16],
      ],
      [
        [21, 14],
        [16, 18],
        [11, 27],
        [10, 18],
        [14, 14],
      ],
      [
        [21, 14],
        [28, 17],
        [30, 25],
        [26, 21],
      ],
    ])
      p(a, "#4b8754");
    l(8, 11, 14, 10, "#a1b362", 2);
    l(23, 10, 27, 6, "#aac16c", 2);
    l(27, 12, 33, 15, "#84ac65", 2);
    r(19, 15, 5, 3, "#9a7448");
  } else if (id === "bambooPlant") {
    for (let j = 0; j < 3; j++) {
      let xx = 11 + j * 7,
        yy = 5 + (j === 1 ? 0 : 7);
      r(xx, yy, 2, 35 - yy, "#527c42");
      for (let k = yy + 5; k < 34; k += 6) {
        r(xx, k, 2, 1, "#bed184");
        p(
          [
            [xx, k],
            [xx - 6, k - 5],
            [xx - 8, k - 5],
            [xx - 5, k - 1],
          ],
          "#53884c",
        );
        p(
          [
            [xx + 1, k - 1],
            [xx + 6, k - 7],
            [xx + 8, k - 7],
            [xx + 6, k - 3],
          ],
          "#81ab59",
        );
      }
    }
  } else if (["peak", "icepeak", "sandpeak", "greenpeak"].includes(id)) {
    const a =
      id === "sandpeak"
        ? ["#926e4f", "#b28b63", "#d9ad7b", "#f1cf93", "#f1cf93"]
        : id === "greenpeak"
          ? ["#54665b", "#708369", "#92a481", "#b8bd92", "#cbd1ae"]
          : ["#52656c", "#72858a", "#94a4a0", "#c4c9bc", "#e8e5cf"];
    p(
      [
        [1, 34],
        [6, 27],
        [9, 25],
        [14, 14],
        [17, 13],
        [21, 3],
        [23, 3],
        [29, 18],
        [33, 21],
        [39, 33],
        [34, 35],
        [28, 34],
        [23, 36],
        [15, 34],
        [9, 36],
      ],
      a[0],
    );
    p(
      [
        [2, 33],
        [9, 25],
        [15, 15],
        [21, 4],
        [16, 23],
        [11, 28],
        [10, 32],
      ],
      a[2],
    );
    p(
      [
        [22, 3],
        [25, 17],
        [23, 22],
        [28, 32],
        [22, 29],
        [17, 33],
        [18, 25],
        [15, 28],
        [18, 18],
      ],
      a[1],
    );
    p(
      [
        [23, 7],
        [29, 21],
        [34, 25],
        [35, 29],
        [31, 27],
        [30, 24],
        [26, 22],
      ],
      a[1],
    );
    if (id !== "sandpeak") {
      p(
        [
          [13, 19],
          [18, 10],
          [21, 3],
          [23, 3],
          [29, id === "icepeak" ? 23 : 19],
          [25, 16],
          [24, 18],
          [21, 13],
          [18, 19],
          [18, 15],
          [15, 20],
        ],
        a[4],
      );
      p(
        [
          [22, 4],
          [24, 12],
          [28, 18],
          [25, 16],
          [24, 18],
          [22, 13],
        ],
        a[3],
      );
    } else {
      l(21, 6, 16, 17, a[3], 2);
      r(11, 25, 4, 2, a[2]);
    }
  } else if (
    id === "castle" ||
    id === "icecastle" ||
    id === "palace" ||
    id === "pagoda" ||
    id === "temple" ||
    id === "town" ||
    id === "village"
  ) {
    const wall =
        id === "palace"
          ? "#ead08d"
          : id === "icecastle"
            ? "#b4c9c6"
            : "#d4c6a1",
      shadow = id === "palace" ? "#a68a5e" : "#8b9286",
      roof =
        id === "icecastle"
          ? "#507e94"
          : id === "pagoda"
            ? "#ab5948"
            : id === "palace"
              ? "#66a298"
              : "#a6594a",
      hi =
        id === "icecastle"
          ? "#90b9c2"
          : id === "palace"
            ? "#94c2a2"
            : "#dc8b64",
      line = "#46534c";
    const tower = (xx, yy, w, h) => {
      r(xx, yy, w, h, line);
      r(xx + 1, yy + 1, w - 2, h - 2, wall);
      r(xx + w - 3, yy + 1, 2, h - 1, shadow);
      p(
        [
          [xx - 2, yy + 2],
          [xx + w / 2, yy - 7],
          [xx + w + 2, yy + 2],
        ],
        roof,
      );
      p(
        [
          [xx - 2, yy + 1],
          [xx + w / 2, yy - 7],
          [xx + w / 2 - 1, yy + 1],
        ],
        hi,
      );
      r(xx + 2, yy + 5, 2, 4, "#56625d");
    };
    if (id === "pagoda") {
      r(16, 2, 2, 8, "#895b49");
      r(18, 2, 7, 3, "#d68463");
      for (let j = 0; j < 3; j++) {
        let xx = 14 - j * 4,
          yy = 11 + j * 8,
          ww = 12 + j * 8;
        r(xx + 1, yy, ww - 2, 8, wall);
        r(xx + 3, yy + 2, 2, 5, "#995c44");
        r(xx + ww - 5, yy + 2, 2, 5, "#995c44");
        p(
          [
            [xx - 4, yy - 1],
            [xx, yy],
            [xx + ww / 2, yy - 6],
            [xx + ww, yy],
            [xx + ww + 4, yy - 1],
            [xx + ww + 1, yy + 3],
            [xx - 2, yy + 3],
          ],
          "#594c45",
        );
        l(xx, yy, xx + ww / 2, yy - 5, hi, 2);
        l(xx + ww / 2, yy - 5, xx + ww, yy, roof, 2);
      }
      r(7, 35, 26, 2, "#83867a");
    } else if (id === "palace") {
      r(8, 23, 24, 12, line);
      r(9, 23, 21, 11, wall);
      p(
        [
          [10, 21],
          [13, 17],
          [16, 16],
          [20, 11],
          [24, 16],
          [28, 17],
          [30, 21],
          [28, 24],
          [12, 24],
        ],
        roof,
      );
      r(13, 19, 7, 2, hi);
      r(19, 8, 2, 5, "#cca958");
      tower(3, 20, 5, 16);
      tower(32, 18, 5, 17);
      r(17, 27, 6, 8, line);
    } else if (id === "temple") {
      for (let j = 0; j < 5; j++) {
        let xx = 3 + j * 3,
          yy = 33 - j * 4;
        r(xx, yy, 34 - j * 6, 4, j % 2 ? "#ae9b68" : "#d1b87b");
      }
      r(16, 9, 10, 9, "#d8c794");
      r(19, 11, 3, 7, line);
      r(14, 8, 14, 2, "#ae8b5a");
      l(17, 35, 21, 20, "#e8d29d", 3);
    } else if (id === "town" || id === "village") {
      const house = (xx, yy, ww, hh) => {
        r(xx, yy, ww, hh, line);
        r(xx + 1, yy + 1, ww - 2, hh - 1, wall);
        p(
          [
            [xx - 2, yy + 1],
            [xx + ww / 2, yy - 6],
            [xx + ww + 2, yy + 1],
          ],
          roof,
        );
        l(xx - 1, yy, xx + ww / 2, yy - 6, hi, 2);
        r(xx + 3, yy + 3, 2, 4, "#57625b");
      };
      house(5, 19, 11, 10);
      house(22, 18, 10, 10);
      house(14, 26, 10, 9);
    } else {
      tower(15, 12, 10, 20);
      r(19, 0, 1, 10, "#a18d5f");
      r(20, 0, 8, 3, "#dbaa58");
      r(20, 3, 5, 2, "#c78e50");
      r(8, 24, 24, 11, line);
      r(9, 24, 22, 10, wall);
      for (let j = 0; j < 6; j++) r(8 + j * 4, 22, 2, 4, wall);
      tower(3, 19, 7, 17);
      tower(29, 18, 7, 18);
      r(16, 29, 7, 6, line);
      r(18, 27, 3, 3, line);
      r(11, 28, 3, 1, shadow);
      r(25, 31, 3, 1, shadow);
    }
  } else if (id === "lighthouse") {
    p(
      [
        [6, 35],
        [12, 31],
        [28, 31],
        [34, 35],
        [31, 37],
        [5, 37],
      ],
      "#9e9980",
    );
    p(
      [
        [13, 34],
        [16, 10],
        [25, 10],
        [29, 34],
      ],
      "#d9ceb0",
    );
    p(
      [
        [23, 12],
        [25, 11],
        [29, 34],
        [23, 34],
      ],
      "#a0a99e",
    );
    r(15, 19, 11, 4, "#b17d64");
    r(15, 10, 12, 5, "#697a76");
    r(17, 7, 7, 5, "#f2cd7e");
    r(20, 6, 1, 7, "#7a6954");
    r(14, 6, 13, 2, "#a87353");
    p(
      [
        [14, 6],
        [20, 1],
        [27, 6],
      ],
      "#ae7659",
    );
    r(18, 26, 3, 7, "#6e756b");
    r(17, 1, 1, 5, "#c3ad79");
    r(18, 1, 6, 2, "#cf8e65");
  } else if (id === "woodkeep") {
    p(
      [
        [2, 31],
        [20, 24],
        [38, 29],
        [22, 36],
      ],
      "#a48860",
    );
    for (let j = 0; j < 16; j++) {
      const xx = 4 + j * 2,
        yy = 28 + Math.round(Math.sin((j / 15) * Math.PI) * 3);
      r(xx, yy, 2, 6, "#8e714c");
      r(xx, yy, 1, 5, "#c2a272");
    }
    for (const [xx, yy, ww, hh] of [
      [4, 16, 8, 16],
      [28, 17, 7, 15],
      [14, 10, 12, 20],
    ]) {
      r(xx, yy, ww, hh, "#bd9c68");
      r(xx + ww - 2, yy, 2, hh, "#8a7758");
      p(
        [
          [xx - 2, yy + 1],
          [xx + ww / 2, yy - 7],
          [xx + ww + 2, yy + 1],
        ],
        "#7a8459",
      );
      l(xx - 1, yy, xx + ww / 2, yy - 6, "#b1ab72", 2);
      r(xx + 3, yy + 5, 2, 4, "#59634f");
    }
    r(19, 1, 1, 7, "#a0824e");
    r(20, 1, 6, 2, "#d0a74e");
  } else if (id === "ship" || id === "redship") {
    p(
      [
        [3, 26],
        [12, 29],
        [30, 27],
        [36, 23],
        [32, 32],
        [25, 35],
        [12, 34],
        [6, 31],
      ],
      "#6e5546",
    );
    p(
      [
        [5, 27],
        [15, 29],
        [30, 27],
        [32, 28],
        [27, 31],
        [12, 32],
      ],
      "#bf9661",
    );
    r(21, 6, 2, 23, "#846c51");
    p(
      [
        [19, 8],
        [19, 25],
        [8, 25],
        [12, 20],
        [14, 15],
      ],
      "#e9dfb6",
    );
    p(
      [
        [23, 10],
        [31, 22],
        [24, 23],
      ],
      id === "redship" ? "#d18a6b" : "#c7c9b6",
    );
    p(
      [
        [21, 5],
        [29, 6],
        [21, 8],
      ],
      "#cb8263",
    );
    r(11, 34, 17, 1, "#a7cdcb");
  } else if (id === "dune") {
    p(
      [
        [2, 30],
        [12, 24],
        [21, 10],
        [25, 12],
        [30, 22],
        [38, 29],
        [25, 28],
        [18, 30],
      ],
      "#c69457",
    );
    p(
      [
        [2, 29],
        [12, 23],
        [21, 10],
        [24, 12],
        [18, 23],
      ],
      "#f0cb83",
    );
  } else if (id === "cactus") {
    r(18, 9, 6, 26, "#5b8057");
    r(18, 8, 3, 25, "#83a064");
    r(11, 20, 9, 4, "#739659");
    r(10, 14, 4, 9, "#75985f");
    r(23, 18, 7, 4, "#507c59");
    r(27, 11, 4, 9, "#688d5a");
    r(20, 7, 3, 2, "#b67764");
  } else if (
    [
      "gold",
      "silver",
      "iron",
      "copper",
      "stone",
      "crystal",
      "mithril",
    ].includes(id)
  ) {
    const colors = {
      gold: ["#a07538", "#dca844", "#ffdf80"],
      silver: ["#757f8c", "#b4bdc2", "#edf0df"],
      iron: ["#536170", "#7c8895", "#aeb4ad"],
      copper: ["#91523e", "#c88050", "#ecc78d"],
      stone: ["#60756f", "#89968b", "#c2c6aa"],
      crystal: ["#71558d", "#a880c6", "#d9b2e1"],
      mithril: ["#427883", "#69b7bf", "#b2eddf"],
    }[id];
    for (let j = 0; j < 3; j++) {
      let xx = 4 + j * 9,
        yy = 13 + (j === 1 ? -5 : 4);
      p(
        [
          [xx, yy + 5],
          [xx + 4, yy],
          [xx + 9, yy + 2],
          [xx + 12, yy + 12],
          [xx + 8, yy + 18],
          [xx + 2, yy + 16],
        ],
        colors[1],
      );
      p(
        [
          [xx + 7, yy + 3],
          [xx + 9, yy + 2],
          [xx + 12, yy + 12],
          [xx + 8, yy + 18],
          [xx + 6, yy + 12],
        ],
        colors[0],
      );
      l(xx + 2, yy + 5, xx + 4, yy + 2, colors[2], 2);
      r(xx + 4, yy + 2, 3, 2, colors[2]);
    }
  } else if (id === "portal") {
    p(
      [
        [6, 34],
        [7, 16],
        [12, 6],
        [20, 2],
        [28, 5],
        [34, 14],
        [35, 34],
      ],
      "#48354d",
    );
    p(
      [
        [10, 34],
        [10, 17],
        [14, 9],
        [21, 6],
        [29, 12],
        [31, 34],
      ],
      "#9865ac",
    );
    p(
      [
        [14, 32],
        [14, 18],
        [18, 12],
        [23, 12],
        [27, 18],
        [27, 32],
      ],
      "#382944",
    );
    r(17, 20, 3, 7, "#c594d5");
    r(23, 13, 2, 3, "#e3aadb");
  } else if (id === "flowers" || id === "berries") {
    for (let j = 0; j < 6; j++) {
      let xx = 4 + rand() * 28,
        yy = 13 + rand() * 16;
      r(xx, yy, 2, 7, "#527b48");
      r(xx - 2, yy - 1, 5, 4, id === "berries" ? "#b96972" : "#eac8a0");
      r(xx, yy - 1, 2, 2, "#e5bf6d");
    }
  } else if (id === "wood") {
    for (let j = 0; j < 3; j++) {
      let xx = 3 + j * 7,
        yy = 18 + j * 3;
      p(
        [
          [xx, yy],
          [xx + 16, yy - 9],
          [xx + 21, yy - 7],
          [xx + 21, yy - 2],
          [xx + 5, yy + 8],
          [xx, yy + 5],
        ],
        "#91683f",
      );
      p(
        [
          [xx, yy],
          [xx + 16, yy - 9],
          [xx + 20, yy - 8],
          [xx + 4, yy + 2],
        ],
        "#be925a",
      );
      r(xx, yy, 5, 5, "#d1ae73");
      r(xx + 1, yy + 1, 2, 2, "#a67c49");
    }
  } else {
    // An atlas citizen: colors, silhouettes, equipment and a two-pixel face.
    const race = RACES.find((a) => a.id === id),
      shade =
        race?.color ||
        {
          mage: "#9292d4",
          spirit: "#95cbb0",
          possessed: "#b272a4",
          invasion: "#806495",
        }[id] ||
        "#a68cb2";
    const skin = [
      "orc",
      "golem",
      "treefolk",
      "mer",
      "naiad",
      "demon",
      "shade",
    ].includes(id)
      ? shade
      : "#e3b78f";
    r(13, 31, 5, 6, "#59534b");
    r(22, 31, 5, 6, "#514c48");
    p(
      [
        [14, 20],
        [24, 20],
        [28, 25],
        [29, 32],
        [12, 32],
        [13, 27],
      ],
      shade,
    );
    r(11, 21, 4, 8, skin);
    r(26, 22, 4, 7, skin);
    r(15, 10, 11, 12, skin);
    r(14, 10, 12, 4, "#735b4b");
    r(15, 9, 8, 2, "#8b7153");
    r(22, 15, 2, 2, "#40454b");
    if (["mage", "invasion", "lunar", "shade", "possessed"].includes(id)) {
      p(
        [
          [10, 13],
          [14, 10],
          [20, 0],
          [24, 9],
          [30, 13],
        ],
        shade,
      );
      r(30, 14, 2, 22, "#a7855b");
      r(29, 11, 4, 4, "#c0c6e3");
    }
    if (["god", "angel", "fairy", "avian"].includes(id)) {
      p(
        [
          [13, 29],
          [6, 23],
          [3, 12],
          [8, 15],
          [12, 21],
        ],
        "#dce1c6",
      );
      p(
        [
          [27, 27],
          [34, 19],
          [37, 12],
          [34, 24],
        ],
        "#bfc7b0",
      );
      r(15, 4, 10, 2, "#f1d582");
      r(14, 5, 2, 2, "#d5b45b");
      r(24, 5, 2, 2, "#d5b45b");
    }
    if (["demon", "possessed", "dragonkin"].includes(id)) {
      p(
        [
          [14, 14],
          [10, 3],
          [16, 8],
          [18, 12],
        ],
        "#c07867",
      );
      p(
        [
          [23, 12],
          [28, 4],
          [27, 13],
        ],
        "#bb715f",
      );
      r(22, 16, 2, 1, "#e9a65c");
    }
    if (["elf", "fox", "orc"].includes(id)) {
      p(
        [
          [15, 16],
          [9, 11],
          [11, 17],
          [16, 20],
        ],
        skin,
      );
      p(
        [
          [25, 15],
          [31, 11],
          [28, 18],
          [24, 19],
        ],
        skin,
      );
    }
    if (id === "dwarf") {
      p(
        [
          [14, 17],
          [26, 17],
          [24, 24],
          [19, 26],
          [15, 22],
        ],
        "#c08656",
      );
      r(14, 9, 13, 3, "#859496");
    }
    if (id === "mush") {
      p(
        [
          [7, 13],
          [10, 8],
          [16, 5],
          [24, 5],
          [29, 8],
          [32, 13],
        ],
        "#b96c63",
      );
      r(13, 9, 4, 2, "#ecd49d");
      r(23, 7, 3, 2, "#ecd49d");
    }
  }
  cache.set(key, c);
  return c;
}
function tile(g, kind, v = 0) {
  const p = painter(g);
  const { poly, rect, line } = p,
    rr = rng(875 + v);
  const pal = {
    ocean: ["#4babc1", "#346f9c", "#284e7e", "#8cd8dc"],
    sand: ["#e0bd74", "#b18b50", "#926c43", "#f6d894"],
    snow: ["#dce6da", "#9ebcbd", "#7896a2", "#f3f1d8"],
    lava: ["#d77542", "#784b48", "#5c4143", "#f3b05b"],
    tundra: ["#afc5af", "#92a68f", "#6f8c82", "#d4d9cb"],
    desert: ["#ddbb78", "#b39158", "#98784c", "#efd195"],
    swamp: ["#789961", "#827953", "#656849", "#a8b577"],
    mountain: ["#9aa59a", "#93866e", "#746f62", "#c0c4ad"],
  }[kind] || ["#93b961", "#9a8054", "#7c6947", "#c0cf76"];
  poly(
    [
      [3, 23],
      [24, 13],
      [45, 23],
      [45, 32],
      [24, 43],
      [3, 32],
    ],
    "#303b38",
  );
  poly(
    [
      [3, 23],
      [24, 33],
      [24, 41],
      [3, 31],
    ],
    pal[1],
  );
  poly(
    [
      [24, 33],
      [45, 23],
      [45, 31],
      [24, 41],
    ],
    pal[2],
  );
  poly(
    [
      [3, 21],
      [24, 11],
      [45, 21],
      [24, 32],
    ],
    pal[0],
  );
  poly(
    [
      [3, 21],
      [24, 32],
      [24, 35],
      [3, 25],
    ],
    pal[0],
  );
  poly(
    [
      [24, 32],
      [45, 21],
      [45, 25],
      [24, 35],
    ],
    kind === "ocean" ? "#418eaf" : kind === "lava" ? "#a7553c" : "#778e54",
  );
  for (let i = 0; i < 16; i++) {
    let xx = 6 + rr() * 35,
      yy = 13 + rr() * 17;
    if (Math.abs(xx - 24) / 20 + Math.abs(yy - 21) / 10 < 0.86)
      rect(xx, yy, 2 + rr() * 2, 1, i % 3 ? pal[3] : pal[1]);
  }
  for (let j = 0; j < 8; j++) {
    let xx = 5 + rr() * 17,
      yy = 26 + (xx - 4) * 0.5 + rr() * 4;
    rect(xx, yy, 2, 1, pal[2]);
  }
  if (kind === "ocean") {
    for (let j = 0; j < 4; j++) {
      let xx = 8 + j * 7,
        yy = 19 + (j % 2) * 5;
      line(xx, yy, xx + 5, yy, "#c1e3d8");
      rect(xx + 5, yy - 1, 3, 1, "#83d0d0");
    }
  }
  if (kind === "lava") {
    poly(
      [
        [8, 20],
        [17, 20],
        [24, 16],
        [31, 16],
        [25, 21],
        [32, 23],
        [24, 25],
        [21, 22],
        [11, 23],
      ],
      "#f6b850",
    );
    rect(17, 21, 5, 1, "#ffe098");
  }
}
export function citySprite(kind) {
  const key = "capital:" + kind;
  if (cache.has(key)) return cache.get(key);
  const c = surface(56, 49),
    { g, poly, rect } = painter(c);
  poly(
    [
      [1, 41],
      [8, 36],
      [24, 33],
      [43, 35],
      [55, 41],
      [38, 45],
      [18, 47],
    ],
    "#838b64",
  );
  poly(
    [
      [4, 40],
      [20, 33],
      [39, 35],
      [53, 40],
      [37, 43],
      [17, 44],
    ],
    "#d1be90",
  );
  g.drawImage(sprite("town"), 0, 23, 23, 18);
  g.drawImage(sprite(kind), 7, -1, 42, 43);
  g.drawImage(sprite(kind === "pagoda" ? "pagoda" : "town"), 35, 22, 22, 21);
  rect(16, 43, 14, 1, "#c0ac7f");
  cache.set(key, c);
  return c;
}
export function toolArt(id) {
  if (urls.has(id)) return urls.get(id);
  const c = surface(48, 48),
    { g, rect, poly, line } = painter(c);
  const draw = (s, x, y, w, h = w) => g.drawImage(sprite(s), x, y, w, h);
  const plants = {
    forest: "oak",
    pine: "pine",
    cherry: "cherry",
    bamboo: "bambooPlant",
    jungle: "palm",
    mountain: "peak",
    savanna: "autumn",
    desert: "dune",
    swamp: "jungleTree",
    tundra: "snowpine",
  };
  if (id === "inspect") {
    poly(
      [
        [10, 2],
        [14, 3],
        [39, 26],
        [29, 28],
        [34, 38],
        [29, 42],
        [23, 42],
        [18, 31],
        [10, 36],
      ],
      "#20252b",
    );
    poly(
      [
        [12, 4],
        [36, 25],
        [25, 26],
        [32, 38],
        [26, 40],
        [19, 27],
        [12, 32],
      ],
      "#e7d6aa",
    );
    poly(
      [
        [14, 9],
        [29, 23],
        [23, 23],
        [26, 29],
        [18, 24],
        [14, 28],
      ],
      "#fbebbf",
    );
    line(13, 6, 13, 29, "#fff3cf");
  } else if (
    [
      "ocean",
      "sand",
      "meadow",
      "forest",
      "pine",
      "desert",
      "snow",
      "lava",
      "mountain",
      "jungle",
      "cherry",
      "bamboo",
      "tundra",
      "swamp",
      "savanna",
    ].includes(id)
  ) {
    tile(c, id);
    if (plants[id]) {
      if (id === "forest" || id === "pine") {
        draw("pine", 3, -1, 24, 29);
        draw(id === "forest" ? "oak" : "fir", 16, -1, 28, 30);
      } else if (id === "mountain") {
        draw("peak", 1, 2, 27);
        draw("icepeak", 13, -5, 31, 35);
      } else draw(plants[id], 8, -3, 33, 32);
    }
    if (id === "meadow") {
      for (const [x, y] of [
        [12, 19],
        [25, 19],
        [32, 21],
      ]) {
        rect(x, y - 4, 2, 6, "#5e9547");
        rect(x - 2, y - 2, 2, 3, "#78a94f");
        rect(x + 2, y - 3, 1, 3, "#cada79");
      }
    }
    if (id === "snow") {
      poly(
        [
          [7, 22],
          [17, 15],
          [25, 15],
          [31, 19],
          [24, 22],
          [20, 20],
          [13, 24],
        ],
        "#f2f1d9",
      );
      rect(16, 22, 5, 1, "#b8d4d3");
    }
  } else if (id === "logo") {
    tile(c, "meadow");
    draw("castle", 4, -3, 40, 37);
  } else if (["random", "bless", "festival", "ward", "heal"].includes(id)) {
    const col = id === "heal" ? "#8fca8b" : "#efc571";
    poly(
      [
        [23, 3],
        [26, 16],
        [37, 21],
        [26, 25],
        [21, 40],
        [17, 26],
        [5, 22],
        [17, 16],
      ],
      col,
    );
    poly(
      [
        [22, 12],
        [22, 23],
        [13, 22],
        [20, 18],
      ],
      "#fff0b8",
    );
    rect(34, 5, 3, 8, "#b5a0d0");
    rect(31, 8, 9, 2, "#b5a0d0");
    rect(5, 31, 2, 6, "#a3c2b1");
    rect(3, 33, 6, 2, "#a3c2b1");
  } else if (["storm", "rain"].includes(id)) {
    poly(
      [
        [3, 20],
        [7, 13],
        [13, 13],
        [18, 7],
        [26, 7],
        [31, 13],
        [36, 13],
        [42, 19],
        [40, 24],
        [6, 24],
      ],
      "#9eb6c2",
    );
    rect(10, 17, 27, 5, "#b9cbd1");
    if (id === "storm")
      poly(
        [
          [24, 21],
          [31, 21],
          [24, 29],
          [30, 29],
          [16, 43],
          [20, 33],
          [15, 33],
        ],
        "#edc366",
      );
    else
      for (let j = 0; j < 4; j++)
        line(10 + j * 8, 28, 7 + j * 8, 35, "#7cc4d9", 2);
  } else if (["fire", "meteor"].includes(id)) {
    poly(
      [
        [7, 37],
        [10, 25],
        [17, 19],
        [17, 25],
        [27, 7],
        [30, 17],
        [38, 5],
        [37, 21],
        [30, 35],
        [21, 42],
        [12, 40],
      ],
      "#d0764b",
    );
    poly(
      [
        [11, 36],
        [15, 26],
        [20, 28],
        [31, 17],
        [27, 31],
        [20, 38],
      ],
      "#f0b953",
    );
    if (id === "meteor") draw("iron", 0, 18, 29);
  } else if (id === "quake") {
    tile(c, "sand");
    line(28, 14, 21, 20, "#886945", 2);
    line(21, 20, 26, 22, "#886945", 2);
    line(26, 22, 19, 29, "#886945", 2);
  } else if (id === "farm") {
    tile(c, "meadow");
    draw("flowers", 8, -1, 31);
  } else if (id === "build") draw("town", 2, 2, 44);
  else if (id === "recruit") draw("mage", 2, 2, 44);
  else if (id === "mine") draw("gold", 2, 2, 44);
  else if (["pact", "peace", "hostility", "border"].includes(id)) {
    rect(12, 6, 3, 34, "#b19768");
    poly(
      [
        [15, 7],
        [38, 8],
        [31, 15],
        [38, 21],
        [15, 20],
      ],
      id === "hostility" ? "#c87867" : "#88b582",
    );
  } else draw(id, 1, 0, 46);
  const result = c.toDataURL();
  urls.set(id, result);
  return result;
}
