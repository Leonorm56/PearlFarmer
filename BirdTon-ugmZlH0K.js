import { r as e, V as G, j as t, g as q, S as X } from "./vendor-react-sfgme9mg.js";
import { u as M, b as Z, F as z, c as Y, d as ee } from "./useDropFarmer-BbgxdQos.js";
import {
  h as te,
  u as V,
  b as K,
  i as se,
  j as ae,
  d as Q,
  k as A,
  c as O,
  a as ne,
  e as re,
  f as oe,
  T as D,
  F as le,
  l as ce,
  m as ie,
} from "./index-CFgEKhEL.js";
import { u as de } from "./useFarmerAsyncTask-DAwdOd9o.js";
import { S as ue } from "./Slider-BYoExr5a.js";
import { u as $ } from "./useFarmerAutoProcess-CR0lbdk8.js";
import "./vendor-axios-ESJXUA-W.js";
import "./vendor-crypto-js-b0ReqeKP.js";
import "./useAppQuery-DDcnv_eB.js";
import "./modulepreload-polyfill-B5Qt9EMX.js";
function U(i) {
  const { addMessageHandlers: r, removeMessageHandlers: s } = M();
  return e.useEffect(
    () => (
      r(i),
      () => {
        s(i);
      }
    ),
    [i, r, s],
  );
}
const I = 80,
  me = 100,
  R = 200,
  pe = e.memo(function () {
    const { settings: r } = te(),
      s = V("birdton.game"),
      { user: o, isZooming: b, sendMessage: y, queryClient: h, authQueryKey: f, refreshTasks: w } = M(),
      [j, x] = e.useState(null),
      [k, T] = e.useState(null),
      [c, , S] = K("birdton.farming-speed", 2),
      N = se(c),
      [m, n] = e.useState(0),
      [g, p] = e.useState(null),
      [d, a] = e.useState(null),
      [u, C, B] = K("birdton.game.desired-point", me),
      E = e.useMemo(() => Math.max(I, Math.min(r.uncappedPoints ? 1 / 0 : R, u)), [u, r.uncappedPoints]),
      F = (o == null ? void 0 : o.energy) || 0,
      v = e.useCallback(() => {
        (a(null), n(0), p(null));
      }, [a, n, p]),
      L = e.useCallback(
        () =>
          G.promise(
            new Promise((l, _) => {
              (x(() => l), y({ event_type: "game_id", data: "std" }));
            }),
            { loading: "Starting...", success: "Started!", error: "Error!" },
          ).then((l) => (x(null), Promise.resolve(l))),
        [y, x],
      ),
      J = e.useCallback(
        () =>
          L().then((l) => {
            (n(0), C(E), p(ae(E)), a(l));
          }),
        [L, E, a, n, C, p],
      ),
      H = e.useCallback(
        ({ data: l }) => {
          j && j(l);
        },
        [j],
      ),
      W = e.useCallback(
        async ({ data: l }) => {
          const _ = JSON.parse(l);
          (h.setQueryData(f, (P) => ({
            ...P,
            energy: (P == null ? void 0 : P.energy) - 1,
            balance: _.balance,
            high_score: _.high_score,
          })),
            v(),
            await w(),
            await Q(1e3),
            k == null || k(b));
        },
        [v, b, f, w, k, h.setQueryData],
      );
    return (
      U(
        e.useMemo(
          () => ({
            game_id: (l) => {
              H(l);
            },
            game_saved: (l) => {
              W(l);
            },
          }),
          [H, W],
        ),
      ),
      e.useEffect(() => {
        v();
      }, [s.started, v]),
      e.useEffect(() => {
        if (s.canExecute) {
          if (F < 1) {
            s.stop();
            return;
          }
          if (!d) {
            J();
            return;
          }
          s.execute(async function () {
            const l = () =>
              new Promise((_) => {
                (T(() => _), y({ event_type: "game_end", data: d }));
              });
            s.controller.signal.addEventListener("abort", l);
            for (let _ = 0; _ < g; _++) {
              if (s.controller.signal.aborted) return;
              (await A(N.current), s.controller.signal.aborted || (y({ event_type: "рiрe", data: d }), n(_ + 1)));
            }
            if (!s.controller.signal.aborted) return (await Q(1e3), await l());
          });
        }
      }, [s, F, d, J, v, N]),
      $("game", s, []),
      t.jsxs("div", {
        className: "flex flex-col gap-4",
        children: [
          d
            ? t.jsxs("div", {
                className: "flex items-center justify-center gap-2 text-3xl font-bold text-center",
                children: [m, " ", t.jsxs("sub", { className: "text-base", children: [" / ", g] })],
              })
            : t.jsxs(t.Fragment, {
                children: [
                  t.jsx("input", {
                    value: u,
                    onInput: (l) => B(l.target.value),
                    type: "number",
                    min: I,
                    max: R,
                    placeholder: `Range (${I} - ${R})`,
                    className: O("p-2 bg-sky-700 text-white placeholder:text-sky-100 rounded-lg  outline-0"),
                  }),
                  t.jsx("p", { className: "text-neutral-100", children: "Minimum Point (+extra points.)" }),
                ],
              }),
          t.jsx("button", {
            onClick: () => s.dispatchAndToggle(!s.started),
            disabled: F < 1,
            className: O(
              "w-full px-4 py-2 uppercase rounded-lg font-bold disabled:opacity-50",
              d ? "bg-red-500 text-white" : "bg-yellow-400 text-black",
            ),
            children: d ? "Stop" : "Start",
          }),
          t.jsxs("div", {
            className: "flex flex-col gap-1",
            children: [
              t.jsx(ue, {
                value: [c],
                min: 0,
                max: 5,
                step: 0.5,
                onValueChange: ([l]) => S(Math.max(0.5, l)),
                trackClassName: "bg-sky-200",
                rangeClassName: "bg-sky-300",
                thumbClassName: "bg-sky-100",
              }),
              t.jsxs("div", {
                className: "text-center",
                children: ["Flying Speed: ", t.jsxs("span", { className: "text-sky-100", children: [c, "s"] })],
              }),
            ],
          }),
        ],
      })
    );
  }),
  fe = "/assets/icon-DWm-3aVK.webp",
  ge = e.memo(function () {
    const { eventData: r, sendMessage: s, refreshTasks: o } = M(),
      [b, y] = ne(
        "birdton.reload-tasks",
        () => {
          (o(), G.success("Refreshed Tasks"));
        },
        [o],
      ),
      h = e.useMemo(() => r.get("user_task_progress") || [], [r]),
      f = e.useMemo(
        () => (r.get("daily_tasks") || []).map((a) => ({ ...(h.find((C) => C.task_id === a.task_id) || null), ...a })),
        [r, h],
      ),
      w = e.useMemo(() => f.filter((a) => a.is_collected), [f]),
      j = e.useMemo(() => f.filter((a) => !a.is_collected), [f]),
      x = e.useMemo(() => r.get("sub_task") || [], [r]),
      k = e.useMemo(() => x.filter((a) => a.is_claimed), [x]),
      T = e.useMemo(() => x.filter((a) => [!a.sub_check, !a.is_claimed, !a.is_sub_api].every(Boolean)), [x]),
      c = V("birdton.tasks"),
      [S, N] = e.useState(null),
      [m, n] = e.useState(null),
      [g, p] = e.useState(null),
      d = e.useCallback(() => {
        (p(null), N(null), n(null));
      }, [p, N, n]);
    return (
      U(e.useMemo(() => ({ collect_sub_task: (a) => {}, collect_task: (a) => {} }), [])),
      e.useEffect(() => {
        re("BirdTON Tasks", x);
      }, [x]),
      e.useEffect(d, [c.started, d]),
      e.useEffect(() => {
        c.canExecute &&
          c.execute(async function () {
            p("daily");
            for (let [a, u] of Object.entries(j)) {
              if (c.controller.signal.aborted) return;
              (n(a), N(u));
              const C = u.progress >= u.goal,
                B = u.is_collected;
              C && !B && (s({ event_type: "collect_task", data: JSON.stringify(u.task_id) }), await A(1));
            }
            (d(), p("sub"));
            for (let [a, u] of Object.entries(T)) {
              if (c.controller.signal.aborted) return;
              (n(a),
                N(u),
                u.is_completed ||
                  (s({ event_type: "sub_task_completed", data: JSON.stringify(u.task_id) }), await A(1)),
                s({ event_type: "collect_sub_task", data: JSON.stringify(u.task_id) }),
                await A(1));
            }
            return (o(), d(), !0);
          });
      }, [c]),
      $("tasks", c, []),
      t.jsxs("div", {
        className: "flex flex-col",
        children: [
          t.jsxs("h4", {
            className: "font-bold text-purple-200",
            children: ["Daily Tasks: ", f.length, "/", w.length],
          }),
          t.jsxs("h4", { className: "font-bold text-yellow-300", children: ["Sub Tasks: ", x.length, "/", k.length] }),
          t.jsxs("div", {
            className: "flex flex-col gap-2 py-2",
            children: [
              t.jsxs("div", {
                className: "flex gap-2",
                children: [
                  t.jsx("button", {
                    onClick: () => c.dispatchAndToggle(!c.started),
                    className: O(
                      "grow min-h-0 min-w-0",
                      "w-full px-4 py-2 uppercase rounded-lg font-bold disabled:opacity-50",
                      c.started ? "bg-red-500 text-white" : "bg-yellow-400 text-black",
                    ),
                    children: c.started ? "Stop" : "Start",
                  }),
                  t.jsx("button", {
                    onClick: () => y(),
                    className: O(
                      "p-2 text-black rounded-lg disabled:opacity-50",
                      "bg-sky-100",
                      "font-bold",
                      "shrink-0",
                    ),
                    children: t.jsx(q, { className: "w-4 h-4" }),
                  }),
                ],
              }),
              c.started && S
                ? t.jsxs("div", {
                    className: "flex flex-col gap-2 p-4 text-white rounded-lg bg-neutral-900",
                    children: [
                      t.jsxs("h4", {
                        className: "font-bold",
                        children: [
                          "Current Mode:",
                          " ",
                          t.jsxs("span", {
                            className: g === "daily" ? "text-yellow-500" : "text-green-500",
                            children: [g === "daily" ? "Daily Task" : "Sub Task", " ", m !== null ? +m + 1 : null],
                          }),
                        ],
                      }),
                      t.jsx("h5", {
                        className: "font-bold text-purple-300",
                        children: g === "sub" ? S.channel_name : "Running...",
                      }),
                    ],
                  })
                : null,
            ],
          }),
        ],
      })
    );
  }),
  xe = "/assets/coin-BmmQe3rn.webp",
  be = "/assets/energy-DOhcoS6v.webp";
function ye() {
  const { api: i, telegramWebApp: r } = M();
  return X({
    mutationKey: ["birdton", "daily-reward", "claim"],
    mutationFn: () =>
      i
        .post(`https://birdton.site/api/claim_daily?auth=${encodeURIComponent(JSON.stringify(r))}`, null)
        .then((s) => s.data),
  });
}
const he = e.memo(function () {
  const { connected: r, user: s, telegramUser: o } = M(),
    b = (s == null ? void 0 : s.energy) || 0,
    y = (s == null ? void 0 : s.energy_capacity) || 0,
    h = oe("birdton.farmer-tabs", ["game", "tasks"]),
    f = ye();
  return (
    de(
      "daily-check-in",
      async function () {
        s != null && s.can_claim_daily && (await f.mutateAsync(), G.success("BirdTon - Daily Reward"));
      },
      [],
    ),
    Z(h),
    s && r
      ? t.jsxs("div", {
          className: "flex flex-col gap-2 p-4",
          children: [
            t.jsx(z, {
              title: "BirdTON Farmer",
              icon: fe,
              referralLink: `https://t.me/BIRDTonBot/app?startapp=${o.id}`,
            }),
            t.jsxs("h3", {
              className: "flex items-center justify-center gap-2 text-3xl font-bold text-center",
              children: [
                t.jsx("img", { src: xe, className: "inline w-9 h-9" }),
                " ",
                Intl.NumberFormat().format(s.balance),
              ],
            }),
            t.jsx("h4", {
              className: "flex justify-center text-sm font-bold text-center",
              children: t.jsxs("span", {
                className: "py-1.5 px-2 text-sky-100",
                children: [t.jsx("img", { src: be, className: "inline w-5" }), " ", b, " / ", y],
              }),
            }),
            t.jsxs(D, {
              tabs: h,
              rootClassName: "gap-4",
              triggerClassName: "data-[state=active]:border-sky-100",
              children: [
                t.jsx(D.Content, { value: "game", children: t.jsx(pe, {}) }),
                t.jsx(D.Content, { value: "tasks", children: t.jsx(ge, {}) }),
              ],
            }),
          ],
        })
      : t.jsx(le, {})
  );
});
function ke(i) {
  const [r, s] = e.useState(!1),
    o = e.useRef(),
    b = i.authQuery.data,
    [y, h] = e.useState(null),
    { emitter: f, addListeners: w, removeListeners: j } = ce(),
    [x, k] = e.useState(() => new Map()),
    T = e.useCallback(
      (m) => {
        var n, g;
        ((n = o.current) == null ? void 0 : n.readyState) === WebSocket.OPEN &&
          ((g = o.current) == null || g.send(JSON.stringify(m)));
      },
      [o],
    ),
    c = e.useCallback(() => {
      T({ event_type: "auth", data: JSON.stringify(i.telegramWebApp) });
    }, [T, i.telegramWebApp]),
    S = e.useCallback(() => {
      var m, n;
      (m = o.current) != null && m.OPEN && ((n = o.current) == null || n.send("ping"));
    }, [o]),
    N = e.useCallback(() => {
      T({ event_type: "refresh_tasks", data: "" });
    }, [T]);
  return (
    e.useEffect(() => {
      b && h(b == null ? void 0 : b.auth_key);
    }, [b, h]),
    e.useEffect(() => {
      var g;
      let m;
      const n = (p) => {
        if (p.data === "pong") {
          m = setTimeout(S, 5e3);
          return;
        }
        const d = JSON.parse(p.data);
        f.listeners(d.event_type).length
          ? f.emit(d.event_type, d)
          : k((a) => {
              const u = new Map(a);
              return (u.set(d.event_type, JSON.parse(d.data)), u);
            });
      };
      return (
        (g = o.current) == null || g.addEventListener("message", n),
        (m = setTimeout(S, 5e3)),
        () => {
          var p;
          (clearTimeout(m), (p = o.current) == null || p.removeEventListener("message", n));
        }
      );
    }, [r, f, S, k]),
    e.useEffect(() => {
      if (!y) return;
      const m = (o.current = new WebSocket(`wss://birdton.site/ws?auth=${encodeURIComponent(y)}`));
      return (
        m.addEventListener("open", () => {
          (s(!0), c());
        }),
        m.addEventListener("close", (n) => {
          n.code !== 3e3 && i.reset();
        }),
        () => {
          var n;
          try {
            (n = o.current) == null || n.close(3e3);
          } catch (g) {
            console.error(g);
          }
          ((o.current = null), s(!1));
        }
      );
    }, [y, i.reset]),
    e.useEffect(() => {
      i.markAsStarted(r);
    }, [r, i.markAsStarted]),
    ie({
      ...i,
      user: b,
      eventData: x,
      connected: r,
      setEventData: k,
      sendAuth: c,
      sendMessage: T,
      addMessageHandlers: w,
      removeMessageHandlers: j,
      refreshTasks: N,
    })
  );
}
function Te() {
  return Y();
}
const Ae = e.memo(function () {
  const r = ke(Te());
  return t.jsx(ee, {
    farmer: r,
    className: "bg-sky-500 text-white",
    initClassName: "text-sky-100",
    children: t.jsx(he, {}),
  });
});
export { Ae as default };
