var assert = require("assert");
var h = require("./script.js");

// shownPairsFor: 논문 검증 3조건 — d=30mm·d=15mm 모두 N=5 그대로 나와야 한다
assert.strictEqual(h.shownPairsFor(5, 30), 5, "조건A(d=30mm,N=5) 좌측 5쌍이어야 함");
assert.strictEqual(h.shownPairsFor(5, 15), 5, "조건B/C(d=15mm,N=5) 좌측 5쌍이어야 함");
// 20 상한
assert.strictEqual(h.shownPairsFor(200, 3), 20, "N=200,d=3mm → 밴드에 20쌍 넘게 들어가도 상한 20");
// N이 상한보다 작으면 N 그대로
assert.strictEqual(h.shownPairsFor(3, 3), 3, "N=3 < 20이면 정확히 3쌍");

// buildFilename — 좌우 모두 항상 style 접미사 포함(2026-07-21 사용자 확정)
assert.strictEqual(
  h.buildFilename(60, 15, 1.00, 5, "left", "spiral", 13, 2),
  "lam60_d15_L1p00_N5_left_spiral_lbl13_x2.png"
);
assert.strictEqual(
  h.buildFilename(120, 3, 0.30, 200, "right", "B", 34, 3),
  "lam120_d3_L0p30_N200_right_B_lbl34_x3.png"
);

// ==================== 캡처 파일명 — center 케이스 ====================
assert.strictEqual(
  h.buildFilename(60, 15, 1.00, 5, "center", "spiral", 13, 2),
  "lam60_d15_L1p00_N5_center_spiral_lbl13_x2.png"
);
console.log("PASS buildFilename center 케이스");

// needsLGuardConfirm: L < 5λ 일 때만 true
assert.strictEqual(h.needsLGuardConfirm(0.2, 0.06), true, "L=0.2m < 5*0.06m=0.3m → 경고 필요");
assert.strictEqual(h.needsLGuardConfirm(1.0, 0.06), false, "L=1.0m >= 0.3m → 경고 불필요");

console.log("PASS test-helpers.js — " + 9 + "건 통과");

// ==================== 게이트 4-3 / 4-4 (captureMode 라벨·그래픽 제거) ====================
var stub = require("./canvas-stub.js");

function freshState() {
  h.state.captureMode = false;
  h.state.lamMM = 60; h.state.dMM = 15; h.state.L = 1.00; h.state.N = 5;
  h.state.phasorStyle = "spiral";
  h.state.tickFontPx = h.FIG_BASE.tickFontPx;
}

function renderLeft(captureMode) {
  freshState();
  h.state.captureMode = captureMode;
  var cv = stub.createStubCanvas(620, 640);
  h.drawStep2Left(cv, 1);
  return cv._ctx;
}

function renderRight(captureMode) {
  freshState();
  h.state.captureMode = captureMode;
  var cv = stub.createStubCanvas(620, 640);
  h.drawStep2Right(cv, 1);
  return cv._ctx;
}

// --- 4-4: 그래픽 제거 확인 ---
var leftCap = renderLeft(true), leftNorm = renderLeft(false);
assert.strictEqual(
  stub.hasCall(leftCap, "moveTo", function (a) { return a[0] === 16 && a[1] === 76; }),
  false, "captureMode=true: 회색 '평면파 입사' 화살표가 그려지면 안 됨");
assert.strictEqual(
  stub.hasCall(leftNorm, "moveTo", function (a) { return a[0] === 16 && a[1] === 76; }),
  true, "captureMode=false: 회색 입사 화살표는 유지되어야 함(회귀 확인)");
assert.strictEqual(
  stub.hasCall(leftCap, "setLineDash", function (a) { return a[0] && a[0][0] === 3 && a[0][1] === 3; }),
  false, "captureMode=true: 빨간 P 안내 점선이 그려지면 안 됨");
assert.strictEqual(
  stub.hasCall(leftNorm, "setLineDash", function (a) { return a[0] && a[0][0] === 3 && a[0][1] === 3; }),
  true, "captureMode=false: 빨간 P 안내 점선은 유지되어야 함(회귀 확인)");
console.log("PASS 4-4 게이트(회색 입사 화살표·빨간 P 점선 제거 확인)");

// --- 4-3: 라벨 제거 완전성 ---
var ALLOWED = /^(-?[\d.]+(e[+-]?\d+)?|Re|Im|λ = \d+ mm)$/;
var capTexts = stub.fillTextCalls(leftCap).concat(stub.fillTextCalls(renderRight(true)));
capTexts.forEach(function (t) {
  assert.ok(ALLOWED.test(t), "captureMode=true에서 설명 라벨 누출: \"" + t + "\"");
});
assert.ok(capTexts.indexOf("Re") !== -1, "captureMode=true에서도 Re 라벨은 있어야 함");
assert.ok(capTexts.indexOf("Im") !== -1, "captureMode=true에서도 Im 라벨은 있어야 함");
assert.ok(capTexts.some(function (t) { return /^-?[\d.]+(e[+-]?\d+)?$/.test(t); }),
  "captureMode=true에서도 눈금 숫자는 있어야 함");
console.log("PASS 4-3 게이트(설명 라벨 완전 제거, 눈금/Re/Im 유지)");

// ==================== 버전 B(선분 화살촉) ====================
function renderRightWithStyle(style) {
  freshState();
  h.state.phasorStyle = style;
  var cv = stub.createStubCanvas(620, 640);
  h.drawStep2Right(cv, 1);
  return cv._ctx;
}
function lineToPoints(ctx) {
  // segment lineTo만 수집 (stroke() 바로 앞의 lineTo, 화살촉 lineTo는 제외)
  var points = [];
  for (var i = 0; i < ctx.calls.length; i++) {
    if (ctx.calls[i].name === "stroke") {
      for (var j = i - 1; j >= 0; j--) {
        if (ctx.calls[j].name === "lineTo") {
          points.push(ctx.calls[j].args);
          break;
        }
        if (ctx.calls[j].name === "beginPath") break;
      }
    }
  }
  return points;
}
function fillCount(ctx) {
  return ctx.calls.filter(function (c) { return c.name === "fill"; }).length;
}

var ctxSpiral = renderRightWithStyle("spiral");
var ctxB = renderRightWithStyle("B");
assert.deepStrictEqual(lineToPoints(ctxB), lineToPoints(ctxSpiral),
  "B 스타일도 spiral과 동일한 선분 좌표를 그려야 함(화살촉만 추가)");
assert.ok(fillCount(ctxB) > fillCount(ctxSpiral),
  "B 스타일은 화살촉(fill) 호출이 spiral보다 많아야 함");
console.log("PASS 버전 B(선분 화살촉): 좌표 동일·화살촉 fill 호출 증가 확인");

// ==================== 버전 A(원점 다발) + 게이트 4-2 ====================
var kk42 = 2 * Math.PI / 0.06, a42 = 0.0005, d42 = 0.015, L42 = 1.00, nMax42 = 5;
var vecs42 = h.wirePhasors(kk42, a42, d42, L42, nMax42);
assert.strictEqual(vecs42.length, 2 * nMax42 + 1, "wirePhasors 길이는 2*nMax+1이어야 함");
var sum42 = vecs42.reduce(function (s, v) { return { re: s.re + v.re, im: s.im + v.im }; }, { re: 0, im: 0 });
var pts42 = h.cornuPartials(kk42, a42, d42, L42, nMax42);
var end42 = pts42[pts42.length - 1];
var relErr42 = Math.hypot(sum42.re - end42.re, sum42.im - end42.im) / Math.hypot(end42.re, end42.im);
assert.ok(relErr42 < 1e-9,
  "버전 A 위상자 전체 합이 나선 끝점(=pe가 가리키는 벡터)과 불일치, 상대오차=" + relErr42);
console.log("PASS 게이트 4-2(버전 A 벡터합 정합, 상대오차=" + relErr42.toExponential(2) + ")");

// 렌더 스모크 체크: style A는 spiral과 다른 그리기 좌표를 만들어야 함(실제로 분기 탔는지 확인)
var ctxA = renderRightWithStyle("A");
assert.notDeepStrictEqual(lineToPoints(ctxA), lineToPoints(renderRightWithStyle("spiral")),
  "style A는 spiral과 다른 경로(원점발 화살표)를 그려야 함");
console.log("PASS 버전 A 렌더 분기 확인(spiral과 다른 좌표 생성)");

// ==================== 게이트 4-1 / 4-5 ====================
// 4-1: 조건A(d=30mm,N=5,L=1.00m) 스프레드 수동 계산과 대조
var nShownA = Math.min(5, 10); // WIRE_PAIRS_SHOWN=10
var expectedSpreadA = Math.sqrt(Math.hypot(1.00, nShownA * 0.030) / 1.00);
var spreadA = h.amplitudeSpread(1.00, 30, nShownA);
assert.ok(Math.abs(spreadA - expectedSpreadA) < 1e-12, "조건A 스프레드 계산 불일치");
assert.ok(spreadA > 1, "스프레드는 항상 1보다 커야 함(Rmax > Rmin)");

// 4-5: PAPER_CONDITIONS의 d/λ가 모두 비정수인지 확인(우드 이상 회피)
h.PAPER_CONDITIONS.forEach(function (c) {
  assert.ok(!Number.isInteger(c.d / c.lam), c.label + "의 d/λ가 정수 — 우드 이상 위험");
});
assert.strictEqual(h.PAPER_CONDITIONS.length, 3, "논문 검증 조건은 3개(A/B/C)여야 함");

console.log("PASS 게이트 4-1(스프레드 계산)/4-5(비정수 d/λ) 확인");

// ==================== §8: 수렴점 마커·문구 삭제 게이트 ====================
function hasRadius9Arc(ctx) {
  return stub.hasCall(ctx, "arc", function (a) { return a[2] === 9; });
}
function renderRightCond(lam, d, captureMode) {
  freshState();
  h.state.lamMM = lam; h.state.dMM = d;
  h.state.captureMode = captureMode;
  var cv = stub.createStubCanvas(620, 640);
  h.drawStep2Right(cv, 1);
  return cv._ctx;
}

var texts8 = [];
[[60, 15], [10, 60]].forEach(function (cond) {  // [lam,d]: 60/15→open=1, 10/60→open>1 두 분기 모두 커버
  [true, false].forEach(function (cm) {
    var ctx8 = renderRightCond(cond[0], cond[1], cm);
    assert.strictEqual(hasRadius9Arc(ctx8), false,
      "lam=" + cond[0] + " d=" + cond[1] + " captureMode=" + cm + ": 수렴점 십자 마커(반지름9 arc)가 그려지면 안 됨");
    texts8 = texts8.concat(stub.fillTextCalls(ctx8));
  });
});
texts8.forEach(function (t) {
  assert.ok(String(t).indexOf("수렴점") === -1, "\"수렴점\" 문구가 남아있음: \"" + t + "\"");
});
console.log("PASS §8 게이트(수렴점 마커·문구 완전 삭제, open=1/>1·캡처/화면 공통 확인)");

// ==================== §9: 중앙 패널 렌더·정합 게이트 ====================
function shaftSegments(ctx) {
  // arrow()가 남기는 moveTo(x1,y1)→lineTo(x2,y2)→stroke() 축(shaft)만 추출.
  // 화살촉은 stroke 없이 fill만 하므로 자동 제외되고, arc+stroke(도선 점 테두리)는
  // 직전에 lineTo가 없어 start가 안 잡히므로 자동 제외된다.
  var segs = [];
  for (var i = 0; i < ctx.calls.length; i++) {
    if (ctx.calls[i].name !== "stroke") continue;
    var end = null, start = null;
    for (var j = i - 1; j >= 0; j--) {
      if (ctx.calls[j].name === "lineTo" && end === null) { end = ctx.calls[j].args; continue; }
      if (ctx.calls[j].name === "moveTo") { start = ctx.calls[j].args; break; }
      if (ctx.calls[j].name === "beginPath") break;
    }
    if (start && end) segs.push({ start: start, end: end });
  }
  return segs;
}
function approxEq(a, b, eps) { return Math.abs(a - b) < (eps || 1e-6); }

function renderCenterCond(lam, d, L, N, captureMode) {
  freshState();
  h.state.lamMM = lam; h.state.dMM = d; h.state.L = L; h.state.N = N;
  h.state.captureMode = captureMode;
  var cv = stub.createStubCanvas(620, 640);
  h.drawStep2Center(cv, 1);
  return cv._ctx;
}

// --- 9-5 전반부: wirePhasors 각 항 = 우측 나선의 대응 선분(pts[i+1]-pts[i]) ---
var kk9 = 2 * Math.PI / 0.06, d9 = 0.015, L9 = 1.00, nMax9 = 5;
var vecs9 = h.wirePhasors(kk9, 0.0005, d9, L9, nMax9);
var pts9 = h.cornuPartials(kk9, 0.0005, d9, L9, nMax9);
for (var i9 = 0; i9 <= 2 * nMax9; i9++) {
  var segVec = { re: pts9[i9 + 1].re - pts9[i9].re, im: pts9[i9 + 1].im - pts9[i9].im };
  assert.ok(approxEq(segVec.re, vecs9[i9].re, 1e-9) && approxEq(segVec.im, vecs9[i9].im, 1e-9),
    "wirePhasors[" + i9 + "] != 나선 선분 pts[" + i9 + "]→pts[" + (i9 + 1) + "]");
}
console.log("PASS 게이트 9-5(중앙 위상자 = 우측 나선 선분 정합)");
// 9-5 후반부(중앙 위상자 합 = s0/나선 끝점 정합)는 게이트 4-2와 동일 기준이며, 중앙 패널이
// wirePhasors()를 재계산 없이 그대로 재사용하므로 4-2 통과로 이미 충족된다(중복 assert 생략).

// --- 렌더 정합: drawStep2Center의 화살표 Δ가 wirePhasors*CENTER_PHASOR_SCALE과 일치 ---
var ctxCenter = renderCenterCond(60, 15, 1.00, 5, false);
var nShownC = h.shownPairsFor(5, 15);
var segsCenter = shaftSegments(ctxCenter);
var matched = 0;
for (var n9 = -nShownC; n9 <= nShownC; n9++) {
  var v9 = vecs9[n9 + nMax9];
  var expDx = v9.re * h.CENTER_PHASOR_SCALE, expDy = -v9.im * h.CENTER_PHASOR_SCALE;
  var found = segsCenter.some(function (s) {
    var dx = s.end[0] - s.start[0], dy = s.end[1] - s.start[1];
    return approxEq(dx, expDx, 1e-6) && approxEq(dy, expDy, 1e-6);
  });
  assert.ok(found, "중앙 패널에 n=" + n9 + " 위상자 화살표 벡터(Δ=" + expDx.toFixed(3) + "," + expDy.toFixed(3) + ")가 없음");
  matched++;
}
assert.strictEqual(matched, 2 * nShownC + 1, "표시된 도선 수만큼 위상자가 모두 그려져야 함");
console.log("PASS 중앙 패널 화살표 = wirePhasors × CENTER_PHASOR_SCALE 정합 확인");

// --- captureMode 라벨 제거(좌·우와 동일 규칙) ---
var centerCap = renderCenterCond(60, 15, 1.00, 5, true);
var centerNorm = ctxCenter;
var capTextsC = stub.fillTextCalls(centerCap);
assert.strictEqual(capTextsC.length, 0, "중앙 패널 captureMode=true에서 fillText 호출이 없어야 함(제목·부제 등 설명 라벨 제거)");
assert.ok(stub.fillTextCalls(centerNorm).length > 0, "중앙 패널 captureMode=false에서는 제목 등 라벨이 있어야 함(회귀 확인)");
console.log("PASS 중앙 패널 captureMode 라벨 제거 확인");

// ==================== FIG 스타일 상수 (2026-09-06) ====================
// 이 절이 이 작업의 안전망이다. figFor(기본값)이 예전 화면과 어긋나는 순간 여기서 잡힌다.
var crypto = require("crypto");

// (1) figFor(기본값)은 FIG_BASE와 완전히 같아야 한다 — 배율 s=1이 항등이라는 뜻
assert.deepStrictEqual(h.figFor(h.FIG_BASE.tickFontPx), h.FIG_BASE,
  "figFor(FIG_BASE.tickFontPx)가 FIG_BASE와 다름 — 기본 화면이 바뀐다");

// (2) 기본 수치는 리팩터 이전 하드코딩 값 그대로여야 한다
assert.strictEqual(h.FIG_BASE.tickFontPx, 13, "눈금 숫자 기본 13px");
assert.strictEqual(h.FIG_BASE.axisTitleFontPx, 15, "Re/Im 기본 15px");
assert.strictEqual(h.FIG_BASE.tickGapPx, 5, "축선↔눈금 숫자 간격 기본 5px");
assert.strictEqual(h.FIG_BASE.gridLineWidth, 1, "격자선 기본 1px");
assert.strictEqual(h.FIG_BASE.axisLineWidth, 1.4, "축선 기본 1.4px");
assert.strictEqual(h.FIG_BASE.padPx, 34, "플롯 좌우 여백 기본 34px");
assert.strictEqual(h.FIG_BASE.segLineWidth, 1.5, "나선 선분 기본 1.5px");
assert.strictEqual(h.FIG_BASE.sumLineWidth, 2.4, "합 벡터 기본 2.4px");
assert.strictEqual(h.FIG_BASE.insetLineWidth, 3, "인셋 화살표 기본 3px");

// (3) 스케일 계수 하나로 묶여 있는지 — 26px는 정확히 2배여야 하고 색은 안 변해야 한다
var fig2x = h.figFor(26);
assert.strictEqual(fig2x.tickFontPx, 26);
["axisTitleFontPx", "tickGapPx", "axisTitleGapPx", "axisTitleInsetPx", "gridLineWidth",
  "axisLineWidth", "originDotR", "padPx", "segLineWidth", "segHeadPx",
  "sumLineWidth", "sumHeadPx", "insetLineWidth", "insetHeadPx"].forEach(function (key) {
  assert.strictEqual(fig2x[key], h.FIG_BASE[key] * 2, key + "가 배율에 비례하지 않음");
});
["tickColor", "gridColor", "axisColor", "axisTitleColor"].forEach(function (key) {
  assert.strictEqual(fig2x[key], h.FIG_BASE[key], key + "는 배율과 무관해야 함");
});
console.log("PASS FIG 상수(기본값 항등 · 비례 스케일 · 색 불변)");

// (4) 기본값 렌더 골든 해시 — 세 패널 × 논문조건 A/B/C × 캡처/화면.
//     FIG_BASE를 건드리거나 그리기 순서를 바꾸면 여기서 즉시 깨진다.
//     의도한 변경이라면 값을 갱신하되, 갱신 전에 "기본 화면이 정말 바뀌어도 되는가"를 먼저 확인할 것.
var GOLDEN = {
  LAcap: "207ef0a1c6ecfaee", LAscr: "832b724ebe3f79bf",
  LBcap: "3f9e7de66a5d9ad1", LBscr: "dc2206e97bf4af90",
  LCcap: "116c904ed6adc76b", LCscr: "707e8545fc0bc693",
  CAcap: "712077e61e6761f4", CAscr: "300586aa2d4d09c0",
  CBcap: "24547aa5175c0549", CBscr: "c56143176dac3707",
  CCcap: "0eb4bc3b64af9c5d", CCscr: "30230e65a1806a1b",
  RAcap: "e83029868599fae8", RAscr: "72b5725130acf735",
  RBcap: "786fef8b51b35db4", RBscr: "6bcf8533372c4f93",
  RCcap: "40bfa04b27a547a4", RCscr: "3b8a3af33c41a033"
};
var goldenConds = [["A", 60, 30, 5], ["B", 60, 15, 5], ["C", 120, 15, 5]];
[["L", h.drawStep2Left], ["C", h.drawStep2Center], ["R", h.drawStep2Right]].forEach(function (panel) {
  goldenConds.forEach(function (c) {
    [true, false].forEach(function (cm) {
      freshState();
      h.state.captureMode = cm;
      h.state.lamMM = c[1]; h.state.dMM = c[2]; h.state.N = c[3];
      var cv = stub.createStubCanvas(620, 640);
      panel[1](cv, 1);
      var key = panel[0] + c[0] + (cm ? "cap" : "scr");
      var got = crypto.createHash("sha256").update(JSON.stringify(cv._ctx.calls)).digest("hex").slice(0, 16);
      assert.strictEqual(got, GOLDEN[key],
        "기본값 렌더가 달라짐 [" + key + "] — 라벨 크기 기본값 상태의 그림은 불변이어야 한다");
    });
  });
});
console.log("PASS 기본값 렌더 골든 해시 18건(세 패널 × 조건 A/B/C × 캡처/화면)");

// ==================== 캡처 경로 (2026-09-06) ====================
// 화면 렌더와 저장 렌더가 같은 draw 함수를 쓰는지, 배율이 좌표가 아니라 변환으로
// 들어가는지(= 글자가 뭉개지지 않는지)를 스텁에서 확인한다.

function renderRightAt(scale) {
  freshState();
  var cv = stub.createStubCanvas(620, 640);
  var ctx = cv._ctx;
  var origFillRect = ctx.fillRect, bgFills = [];
  ctx.fillRect = function (x, y, w, hh) {
    if (x === 0 && y === 0) bgFills.push({ style: ctx.fillStyle, w: w, h: hh });
    return origFillRect.apply(ctx, arguments);
  };
  h.drawStep2Right(cv, scale);
  return { cv: cv, ctx: ctx, bgFills: bgFills };
}

// 배율이 오프스크린 캔버스의 실제 픽셀 수로 반영되어야 한다(화면을 확대 복사하는 게 아님)
var cap1 = renderRightAt(1), cap3 = renderRightAt(3);
assert.strictEqual(cap1.cv.width, 620, "1배: 캔버스 폭 620");
assert.strictEqual(cap3.cv.width, 1860, "3배: 캔버스 폭이 3배(1860)여야 함");
assert.strictEqual(cap3.cv.height, 1920, "3배: 캔버스 높이가 3배(1920)여야 함");
assert.ok(stub.hasCall(cap3.ctx, "setTransform", function (a) {
  return a[0] === 3 && a[3] === 3;
}), "3배: ctx.setTransform(3,0,0,3,0,0)로 배율이 들어가야 함");

// 논문 삽입용 — 배경은 투명이 아니라 흰색으로 채운다
assert.ok(cap3.bgFills.length > 0, "배경 채움(fillRect(0,0,...))이 있어야 함");
assert.strictEqual(cap3.bgFills[0].style, "#FFFFFF", "배경은 흰색이어야 함(투명 금지)");
assert.strictEqual(cap3.bgFills[0].w, 620, "배경은 논리 좌표계 전체를 덮어야 함");

// 배율을 바꿔도 그리기 좌표는 같아야 한다 — 두 벌의 draw 로직으로 갈라지지 않았다는 증거
function withoutTransform(ctx) {
  return ctx.calls.filter(function (c) { return c.name !== "setTransform"; });
}
assert.deepStrictEqual(withoutTransform(cap3.ctx), withoutTransform(cap1.ctx),
  "배율만 다를 뿐 그리기 좌표는 동일해야 함(같은 draw 함수 공유)");
console.log("PASS 캡처 경로(배율=변환 · 흰 배경 · 화면/저장 draw 함수 공유)");

// 라벨 크기가 파일명에 항상 남는지 — 기본값에서도 조건부로 빠지지 않는다
assert.ok(h.buildFilename(60, 15, 1.00, 5, "right", "spiral", 13, 2).indexOf("_lbl13_") !== -1,
  "기본값 13에서도 _lbl 토큰이 있어야 함");
assert.ok(h.buildFilename(60, 15, 1.00, 5, "right", "spiral", 48, 2).indexOf("_lbl48_") !== -1,
  "라벨 크기가 바뀌면 파일명도 바뀌어야 함(덮어쓰기 사고 방지)");
console.log("PASS 파일명 _lbl 토큰(기본값 포함 항상)");
