import {
  r as n,
  j as t,
  q as re,
  P as le,
  O as ie,
  b as ce,
  d as oe,
  D as ue,
  e as me,
  f as de,
  S as T,
  y as E,
  U as fe,
  V as S,
} from "./vendor-react-sfgme9mg.js";
import { u as K, F as pe, b as he, c as be, d as ye } from "./useDropFarmer-BbgxdQos.js";
import { a as z, m as ge, c as F, u as xe, e as Q, d as M, g as ke, f as Te, T as J } from "./index-CFgEKhEL.js";
import { u as U } from "./useFarmerAsyncTask-DAwdOd9o.js";
import { u as je } from "./useFarmerAutoProcess-CR0lbdk8.js";
import { u as k } from "./useFarmerApi-CF9TCFD8.js";
import { u as we } from "./useAppQuery-DDcnv_eB.js";
import "./vendor-axios-ESJXUA-W.js";
import "./vendor-crypto-js-b0ReqeKP.js";
import "./modulepreload-polyfill-B5Qt9EMX.js";
function Fe(r) {
  const [e, a] = n.useState(null),
    [, d] = z(
      r + ":prompt",
      (h) =>
        new Promise((x, b) => {
          a({ id: h, resolve: x, reject: b });
        }),
      [a],
    ),
    [, p] = z(
      r + ":submit",
      (h) => {
        if (!e) return;
        const { resolve: x } = e;
        (a(null), x(h));
      },
      [e, a],
    );
  return ge({ valuePrompt: e, dispatchAndPrompt: d, dispatchAndSubmitPrompt: p });
}
const _ = n.memo(function ({ color: e = "primary", ...a }) {
    return t.jsx("button", {
      ...a,
      className: F(
        "px-4 py-2",
        "rounded-lg",
        { primary: "bg-blum-green-400 text-black", secondary: "bg-white text-black", danger: "bg-red-400 text-black" }[
          e
        ],
        a.disabled && "opacity-50",
        a.className,
      ),
    });
  }),
  Z = "/assets/icon-BEHkGVOI.webp",
  Ne = n.memo(function ({ ...e }) {
    return t.jsx("input", {
      ...e,
      className: F(
        "px-4 py-2",
        "rounded-lg",
        "bg-neutral-800",
        "outline-0 ring-1 ring-transparent",
        "focus:ring-blum-green-500",
        e.disabled && "opacity-50",
        e.className,
      ),
    });
  }),
  Be = n.memo(function ({ task: e, onSubmit: a }) {
    var b;
    const [d, p] = n.useState(""),
      h = n.useCallback(
        (y) => {
          (y.preventDefault(), a(d));
        },
        [d, a],
      ),
      x = n.useCallback(() => {
        a(null);
      }, [a]);
    return t.jsx(re, {
      open: !0,
      onOpenChange: x,
      children: t.jsx(le, {
        children: t.jsx(ie, {
          className: F("fixed inset-0 z-40", "flex items-center justify-center", "p-4 overflow-auto bg-black/50"),
          children: t.jsxs(ce, {
            className: "flex flex-col w-full max-w-sm gap-2 p-4 text-white bg-neutral-800 rounded-xl",
            children: [
              t.jsxs(oe, {
                className: F("inline-flex items-center justify-center gap-2", "text-xl font-bold text-center"),
                children: [t.jsx("img", { src: Z, className: "w-8 h-8 rounded-full" }), "Blum"],
              }),
              t.jsx(ue, { className: F("font-bold text-center"), children: e.title }),
              t.jsxs("form", {
                onSubmit: h,
                className: "flex flex-col gap-2",
                children: [
                  t.jsx("div", {
                    className: "flex justify-center",
                    children: t.jsxs("a", {
                      href: (b = e == null ? void 0 : e.socialSubscription) == null ? void 0 : b.url,
                      target: "_blank",
                      className: "flex items-center gap-2 p-2 rounded-full bg-neutral-700",
                      children: [t.jsx(me, {}), " Open"],
                    }),
                  }),
                  t.jsx(Ne, {
                    value: d,
                    onChange: (y) => p(y.target.value),
                    placeholder: "Keyword",
                    className: "my-4 bg-black",
                  }),
                  t.jsx(_, { type: "submit", children: "Submit" }),
                  t.jsx(de, { asChild: !0, children: t.jsx(_, { color: "secondary", children: "Cancel" }) }),
                ],
              }),
            ],
          }),
        }),
      }),
    });
  });
function Ce() {
  const r = k();
  return T({
    mutationKey: ["blum", "task", "claim"],
    mutationFn: ({ id: e }) =>
      r.post(`https://earn-domain.blum.codes/api/v1/tasks/${e}/claim`, null).then((a) => a.data),
  });
}
function ve() {
  const r = k();
  return T({
    mutationKey: ["blum", "task", "start"],
    mutationFn: (e) => r.post(`https://earn-domain.blum.codes/api/v1/tasks/${e}/start`, null).then((a) => a.data),
  });
}
function Ae() {
  const r = k();
  return E({
    queryKey: ["blum", "tasks"],
    queryFn: ({ signal: e }) => r.get("https://earn-domain.blum.codes/api/v1/tasks", { signal: e }).then((a) => a.data),
  });
}
function Se() {
  const r = k();
  return T({
    mutationKey: ["blum", "task", "validate"],
    mutationFn: ({ id: e, keyword: a }) =>
      r.post(`https://earn-domain.blum.codes/api/v1/tasks/${e}/validate`, { keyword: a }).then((d) => d.data),
  });
}
const Me = n.memo(function () {
  const e = fe(),
    a = Ae(),
    { isZooming: d, dataQuery: p, joinTelegramLink: h } = K(),
    x = n.useCallback((s) => !["ONCHAIN_TRANSACTION", "QUEST"].includes(s.kind), []),
    b = n.useCallback(
      (s) => s.type !== "PROGRESS_TARGET" || Number(s.progressTarget.target) <= Number(s.progressTarget.progress),
      [],
    ),
    y = n.useCallback((s) => s.reduce((o, l) => (l.subTasks ? o.concat(y(l.subTasks)) : o.concat(l)), []), []),
    u = n.useMemo(() => {
      var s;
      return (
        ((s = a.data) == null
          ? void 0
          : s
              .reduce(
                (o, l) => o.concat(y(l.tasks)).concat(l.subSections.reduce((i, m) => i.concat(y(m.tasks)), [])),
                [],
              )
              .reduce((o, l) => (o.some((i) => i.id === l.id) || o.push(l), o), [])) || []
      );
    }, [a.data, y]),
    c = n.useMemo(
      () =>
        u
          .reduce((s, o) => (s.some((l) => l.id === o.id) || s.push(o), s), [])
          .filter(
            (s) => !["INTERNAL", "APPLICATION_LAUNCH", "ONCHAIN_TRANSACTION", "WALLET_CONNECTION"].includes(s.type),
          ),
      [u],
    ),
    te = n.useMemo(() => c.filter((s) => s.status === "FINISHED"), [c]),
    O = n.useMemo(() => c.filter((s) => s.status === "NOT_STARTED" && x(s) && b(s)), [c]),
    R = n.useMemo(() => c.filter((s) => s.status === "READY_FOR_CLAIM"), [c]),
    N = n.useMemo(() => c.filter((s) => s.status === "READY_FOR_VERIFY"), [c]),
    H = n.useMemo(() => c.filter((s) => s.validationType === "KEYWORD"), [c]),
    f = xe("blum.tasks"),
    [V, B] = n.useState(null),
    [ae, C] = n.useState(null),
    [g, j] = n.useState(null),
    { valuePrompt: v, dispatchAndPrompt: Y, dispatchAndSubmitPrompt: se } = Fe("blum.keywords"),
    $ = n.useMemo(() => (v ? N.find((s) => s.id === (v == null ? void 0 : v.id)) : null), [N, v]),
    P = ve(),
    I = Ce(),
    D = Se(),
    A = n.useCallback(() => {
      (B(null), C(null));
    }, [B, C]),
    W = n.useCallback(() => {
      (A(), j(null));
    }, [A, j]),
    q = n.useCallback(() => e.refetchQueries({ queryKey: ["blum", "tasks"] }), [e]),
    ne = n.useCallback(() => e.refetchQueries({ queryKey: ["blum", "balance"] }), [e]),
    L = n.useCallback(
      (s) => {
        var o, l, i, m, w, G;
        return (
          ((i = (l = (o = p.data) == null ? void 0 : o.blum) == null ? void 0 : l.keywords) == null
            ? void 0
            : i[s.id]) ||
          ((G = (w = (m = p.data) == null ? void 0 : m.blum) == null ? void 0 : w.keywords) == null
            ? void 0
            : G[s.title.toUpperCase()])
        );
      },
      [p.data],
    );
  return (
    n.useEffect(() => {
      Q("BLUM RAW TASKS", u);
    }, [u]),
    n.useEffect(() => {
      Q("BLUM TASKS", c);
    }, [c]),
    n.useEffect(() => {
      Q("BLUM KEYWORD TASKS", Object.fromEntries(H.map((s) => [s.title.toUpperCase(), L(s)])));
    }, [H, p.data]),
    n.useEffect(W, [f.started, W]),
    n.useEffect(() => {
      f.canExecute &&
        f.execute(async function () {
          var o;
          const s = async () => {
            try {
              (await q(), await ne());
            } catch (l) {
              console.error(l);
            }
          };
          if (!g) {
            j("start");
            return;
          }
          switch (g) {
            case "start":
              j("start");
              for (let [l, i] of Object.entries(O)) {
                if (f.controller.signal.aborted) return;
                (C(l),
                  B(i),
                  (o = i.socialSubscription) != null &&
                    o.openInTelegram &&
                    ke(i.socialSubscription.url) &&
                    (await h(i.socialSubscription.url)));
                try {
                  await P.mutateAsync(i.id);
                } catch (m) {
                  console.error(m);
                }
                await M(5e3);
              }
              try {
                await q();
              } catch (l) {
                console.error(l);
              }
              (A(), j("verify"));
              return;
            case "verify":
              for (let [l, i] of Object.entries(N)) {
                if (f.controller.signal.aborted) return;
                (C(l), B(i));
                let m = L(i);
                try {
                  if ((m || (m = d ? m : await Y(i.id)), m))
                    try {
                      await D.mutateAsync({ id: i.id, keyword: m });
                    } catch (w) {
                      console.error(w);
                    }
                  else continue;
                } catch (w) {
                  console.error(w);
                }
                await M(5e3);
              }
              try {
                await q();
              } catch (l) {
                console.error(l);
              }
              (A(), j("claim"));
              return;
            case "claim":
              for (let [l, i] of Object.entries(R)) {
                if (f.controller.signal.aborted) return;
                (C(l), B(i));
                try {
                  await I.mutateAsync({ id: i.id });
                } catch (m) {
                  console.error(m);
                }
                await M(5e3);
              }
              break;
          }
          return (await s(), A(), !0);
        });
    }, [d, f, g, p.data, L, Y, h]),
    je("tasks", f, [a.isLoading === !1]),
    t.jsxs(t.Fragment, {
      children: [
        t.jsx("div", {
          className: "flex flex-col py-2",
          children: a.isPending
            ? t.jsx("h4", { className: "font-bold", children: "Fetching tasks..." })
            : a.isError
              ? t.jsx("h4", { className: "font-bold text-red-500", children: "Failed to fetch tasks..." })
              : t.jsxs(t.Fragment, {
                  children: [
                    t.jsxs("h4", { className: "font-bold", children: ["Total Tasks: ", c.length] }),
                    t.jsxs("h4", {
                      className: "font-bold text-blum-green-500",
                      children: ["Finished Tasks: ", te.length],
                    }),
                    t.jsxs("h4", { className: "font-bold text-yellow-500", children: ["Pending Tasks: ", O.length] }),
                    t.jsxs("h4", { className: "font-bold text-blue-500", children: ["Unverified Tasks: ", N.length] }),
                    t.jsxs("h4", { className: "font-bold text-purple-500", children: ["Unclaimed Tasks: ", R.length] }),
                    t.jsxs("div", {
                      className: "flex flex-col gap-2 py-2",
                      children: [
                        t.jsx(_, {
                          color: f.started ? "danger" : "primary",
                          onClick: () => f.dispatchAndToggle(!f.started),
                          disabled: O.length === 0 && N.length === 0 && R.length === 0,
                          children: f.started ? "Stop" : "Start",
                        }),
                        f.started && V
                          ? t.jsxs("div", {
                              className: "flex flex-col gap-2 p-4 rounded-lg bg-neutral-800",
                              children: [
                                t.jsxs("h4", {
                                  className: "font-bold",
                                  children: [
                                    "Current Mode:",
                                    " ",
                                    t.jsxs("span", {
                                      className: g === "start" ? "text-yellow-500" : "text-blum-green-500",
                                      children: [
                                        g === "start"
                                          ? "Starting Task"
                                          : g === "verify"
                                            ? "Verifying Task"
                                            : "Claiming Task",
                                        " ",
                                        +ae + 1,
                                      ],
                                    }),
                                  ],
                                }),
                                t.jsx("h5", { className: "font-bold", children: V.title }),
                                t.jsx("p", {
                                  className: F(
                                    "capitalize",
                                    { success: "text-blum-green-500", error: "text-red-500" }[
                                      g === "start" ? P.status : g === "verify" ? D.status : I.status
                                    ],
                                  ),
                                  children: g === "start" ? P.status : g === "verify" ? D.status : I.status,
                                }),
                              ],
                            })
                          : null,
                      ],
                    }),
                  ],
                }),
        }),
        $ ? t.jsx(Be, { task: $, onSubmit: se }) : null,
      ],
    })
  );
});
function X() {
  const { api: r } = K();
  return we({
    queryKey: ["blum", "balance"],
    queryFn: ({ signal: e }) =>
      r.get("https://game-domain.blum.codes/api/v1/user/balance", { signal: e }).then((a) => a.data),
  });
}
const Ee = n.memo(function () {
  const e = X();
  return t.jsx("div", {
    className: "py-4 text-center",
    children: e.isPending
      ? "Fetching balance..."
      : e.isSuccess
        ? t.jsx(t.Fragment, {
            children: t.jsx("h3", {
              className: "text-xl font-bold",
              children: Intl.NumberFormat().format(e.data.availableBalance),
            }),
          })
        : "Error...",
  });
});
function ee() {
  const { api: r } = K();
  return E({
    queryKey: ["blum", "friends", "balance"],
    queryFn: ({ signal: e }) =>
      r.get("https://user-domain.blum.codes/api/v1/friends/balance", { signal: e }).then((a) => a.data),
  });
}
const Ke = n.memo(function () {
  const e = ee();
  return t.jsx(pe, {
    title: "Blum Farmer",
    icon: Z,
    referralLink: e.data ? `https://t.me/BlumCryptoBot/app?startapp=ref_${e.data.referralToken}` : null,
  });
});
function Oe() {
  const r = k();
  return E({
    queryKey: ["blum", "user"],
    queryFn: ({ signal: e }) =>
      r.get("https://user-domain.blum.codes/api/v1/user/me", { signal: e }).then((a) => a.data),
  });
}
const Re = n.memo(function () {
  const e = Oe();
  return t.jsx("div", {
    className: "py-2",
    children: t.jsx("h4", {
      className: "text-center",
      children: e.isPending ? "Fetching username..." : e.isSuccess ? e.data.username : "Error...",
    }),
  });
});
function Pe() {
  const r = k();
  return T({
    mutationKey: ["blum", "daily-reward", "claim"],
    mutationFn: () => r.post("https://game-domain.blum.codes/api/v2/daily-reward", null).then((e) => e.data),
  });
}
function Ie() {
  const r = k();
  return T({
    mutationKey: ["blum", "farming", "claim"],
    mutationFn: () => r.post("https://game-domain.blum.codes/api/v1/farming/claim", null).then((e) => e.data),
  });
}
function De() {
  const { api: r } = K();
  return T({
    mutationKey: ["blum", "friends-reward", "claim"],
    mutationFn: () => r.post("https://user-domain.blum.codes/api/v1/friends/claim", null).then((e) => e.data),
  });
}
function qe() {
  const r = k();
  return E({
    refetchInterval: !1,
    queryKey: ["blum", "daily-reward", "get"],
    queryFn: ({ signal: e }) =>
      r.get("https://game-domain.blum.codes/api/v2/daily-reward", { signal: e }).then((a) => a.data),
  });
}
function Le() {
  const r = k();
  return T({
    mutationKey: ["blum", "farming", "start"],
    mutationFn: () => r.post("https://game-domain.blum.codes/api/v1/farming/start", null).then((e) => e.data),
  });
}
const Qe = n.memo(function () {
  const e = Te("blum.farmer-tabs", ["tasks"]),
    a = X(),
    d = qe(),
    p = Pe(),
    h = Le(),
    x = Ie(),
    b = ee(),
    y = De();
  return (
    U(
      "daily-check-in",
      async function () {
        const { claim: u } = d.data;
        if (u === "available")
          try {
            (await p.mutateAsync(), S.success("Blum - Daily Check-In"));
          } catch (c) {
            console.error(c);
          }
      },
      [d.data],
    ),
    U(
      "friends-reward",
      async function () {
        try {
          const u = b.data.amountForClaim;
          b.data.canClaim && u > 0 && (await y.mutateAsync(), S.success("Blum - Friends Reward"), await b.refetch());
        } catch (u) {
          console.error(u);
        }
      },
      [b.data],
    ),
    U(
      "farming",
      async function () {
        const u = a.data,
          c = u.farming;
        u.isFastFarmingEnabled
          ? c &&
            u.timestamp >= c.endTime &&
            (await x.mutateAsync(),
            S.success("Blum - Claimed Previous Farming"),
            await M(1e3),
            await h.mutateAsync(),
            S.success("Blum - Started Farming"),
            await a.refetch())
          : (await h.mutateAsync(), S.success("Blum - Started Farming"), await a.refetch());
      },
      [a.data],
    ),
    he(e),
    t.jsxs("div", {
      className: "flex flex-col p-4",
      children: [
        t.jsx(Ke, {}),
        t.jsx(Re, {}),
        t.jsx(Ee, {}),
        t.jsx(J, {
          tabs: e,
          rootClassName: "gap-4",
          triggerClassName: "data-[state=active]:border-blum-green-500",
          children: t.jsx(J.Content, { value: "tasks", children: t.jsx(Me, {}) }),
        }),
      ],
    })
  );
});
function Ue() {
  return be();
}
function _e() {
  const r = Ue();
  return t.jsx(ye, {
    farmer: r,
    className: "text-white bg-black",
    initClassName: "text-neutral-400",
    children: t.jsx(Qe, {}),
  });
}
const et = n.memo(_e);
export { et as default };
