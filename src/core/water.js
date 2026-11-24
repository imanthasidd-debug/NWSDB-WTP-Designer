// Physical & chemical properties of water and carbonate-system chemistry.
import { bisect, clamp, isNum } from './util.js';

import { waterProp } from './d3.js';

/** density of water, kg/m3 – NWSDB D3 Annex I table (0–100 °C, linear interpolation); Thiesen form outside */
export function rho(T) {
  if (T >= 0 && T <= 100) return waterProp(T, 2);
  return 1000 * (1 - ((T + 288.9414) / (508929.2 * (T + 68.12963))) * (T - 3.9863) ** 2);
}
/** dynamic viscosity, Pa·s – NWSDB D3 Annex I table (0–100 °C); Vogel equation outside */
export function mu(T) {
  if (T >= 0 && T <= 100) return waterProp(T, 3) * 1e-3;
  return 2.414e-5 * 10 ** (247.8 / (T + 273.15 - 140));
}
/** kinematic viscosity, m2/s */
export const nu = (T) => mu(T) / rho(T);
/** vapour pressure of water, kPa (Antoine/Magnus) */
export const pVap = (T) => 0.61094 * Math.exp((17.625 * T) / (T + 243.04));
/** atmospheric pressure at elevation z (m), kPa */
export const pAtm = (z) => 101.325 * (1 - 2.25577e-5 * z) ** 5.25588;
/** dissolved-oxygen saturation, mg/L, at T °C, elevation z m, salinity ~0 */
export function DOsat(T, z = 0) {
  const t = T + 273.15;
  const lnC = -139.34411 + 1.575701e5 / t - 6.642308e7 / t ** 2 + 1.2438e10 / t ** 3 - 8.621949e11 / t ** 4; // APHA 4500-O (Benson & Krause)
  return Math.exp(lnC) * (pAtm(z) / 101.325);
}

// ---------------- Carbonate system (closed system, activity ≈ concentration) ----------------
const TK = (T) => T + 273.15;
export const pK1 = (T) => 3404.71 / TK(T) + 0.032786 * TK(T) - 14.8435;
export const pK2 = (T) => 2902.39 / TK(T) + 0.02379 * TK(T) - 6.498;
export const pKw = (T) => 4470.99 / TK(T) + 0.01706 * TK(T) - 6.0875;

function alphas(H, T) {
  const K1 = 10 ** -pK1(T);
  const K2 = 10 ** -pK2(T);
  const d = H * H + K1 * H + K1 * K2;
  return { a0: (H * H) / d, a1: (K1 * H) / d, a2: (K1 * K2) / d };
}
/** alkalinity eq/L for given pH and total carbonate CT (mol/L) */
export function alkEq(pH, CT, T) {
  const H = 10 ** -pH;
  const Kw = 10 ** -pKw(T);
  const { a1, a2 } = alphas(H, T);
  return CT * (a1 + 2 * a2) + Kw / H - H;
}
/** total carbonate (mol/L) from pH and alkalinity (mg/L as CaCO3) */
export function CTfrom(pH, alkCaCO3, T) {
  const H = 10 ** -pH;
  const Kw = 10 ** -pKw(T);
  const { a1, a2 } = alphas(H, T);
  const alk = alkCaCO3 / 50000;
  return (alk - Kw / H + H) / (a1 + 2 * a2);
}
/** pH that satisfies given alkalinity (mg/L CaCO3) and CT (mol/L) */
export function pHfrom(alkCaCO3, CT, T) {
  const target = alkCaCO3 / 50000;
  return bisect((pH) => alkEq(pH, CT, T) - target, 2, 13, 1e-10);
}
/** free CO2 (mg/L as CO2) */
export function freeCO2(pH, CT, T) {
  const { a0 } = alphas(10 ** -pH, T);
  return CT * a0 * 44010;
}

/**
 * Chemical addition to a closed carbonate system.
 * dAlk: change in alkalinity (mg/L as CaCO3) (negative for acidic coagulants)
 * dCT: change in total carbonate (mol/L) (e.g., soda ash adds carbonate)
 */
export function dose(state, { dAlk = 0, dCT = 0, dCa = 0 }, T) {
  const alk = state.alk + dAlk;
  const CT = Math.max(1e-7, state.CT + dCT);
  const pH = alk <= -50 ? 2 : pHfrom(alk, CT, T);
  return { alk, CT, pH, ca: Math.max(0, (state.ca || 0) + dCa) };
}

// ---------------- Stability indices (Standard Methods 2330 approximation) ----------------
/**
 * pHs by the Carrier/Larson-Buswell approximation:
 *   pHs = (9.3 + A + B) − (C + D)
 * TDS mg/L, T °C, caH = calcium hardness mg/L as CaCO3, alk mg/L as CaCO3
 */
export function pHs({ TDS, T, caH, alk }) {
  const A = (Math.log10(Math.max(TDS, 1)) - 1) / 10;
  const B = -13.12 * Math.log10(T + 273) + 34.55;
  const C = Math.log10(Math.max(caH, 0.1)) - 0.4;
  const D = Math.log10(Math.max(alk, 0.1));
  return { pHs: 9.3 + A + B - (C + D), A, B, C, D };
}
export function stability({ pH, TDS, T, caH, alk }) {
  const r = pHs({ TDS, T, caH, alk });
  const LSI = pH - r.pHs;
  const RSI = 2 * r.pHs - pH;
  const AI = pH + Math.log10(Math.max(alk, 0.1) * Math.max(caH, 0.1));
  return { ...r, LSI, RSI, AI };
}
export function lsiText(LSI) {
  if (!isNum(LSI)) return '–';
  if (LSI < -2) return 'Highly aggressive (corrosive)';
  if (LSI < -0.5) return 'Aggressive – dissolves CaCO₃';
  if (LSI <= 0.5) return 'Near balance';
  if (LSI <= 2) return 'Scale-forming';
  return 'Strongly scale-forming';
}

// ---------------- Aluminium hydroxide solubility (amorphous Al(OH)3, 25 °C) ----------------
// log of species concentration (mol/L) in equilibrium with Al(OH)3(am)
export function alSpecies(pH) {
  const s = {
    'Al³⁺': 10 ** (10.8 - 3 * pH),
    'AlOH²⁺': 10 ** (5.83 - 2 * pH),
    'Al(OH)₂⁺': 10 ** (0.5 - pH),
    'Al(OH)₄⁻': 10 ** (-12.5 + pH),
  };
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  return { species: s, totalMol: total, totalMgL: total * 26982 };
}
/** pH of minimum Al solubility */
export function alMinPH() {
  let best = 6,
    bv = Infinity;
  for (let p = 5; p <= 8; p += 0.01) {
    const v = alSpecies(p).totalMgL;
    if (v < bv) {
      bv = v;
      best = p;
    }
  }
  return { pH: best, mgL: bv };
}

// ---------------- Chlorine speciation ----------------
/** pKa of HOCl vs temperature (Morris, 1966) */
export const pKaHOCl = (T) => 3000 / TK(T) - 10.0686 + 0.0253 * TK(T);
export const fracHOCl = (pH, T) => 1 / (1 + 10 ** (pH - pKaHOCl(T)));

// ---------------- Settling ----------------
/** terminal settling velocity (m/s) of a sphere: iterative drag (Stokes → Newton) */
export function settlingVelocity(d, rhoP, T, phi = 1) {
  const rw = rho(T);
  const m = mu(T);
  let v = (G0 * (rhoP - rw) * d * d) / (18 * m); // Stokes first guess
  for (let i = 0; i < 100; i++) {
    const Re = Math.max((rw * v * d) / m, 1e-9);
    const Cd = (24 / Re + 3 / Math.sqrt(Re) + 0.34) / phi;
    const vNew = Math.sqrt((4 * G0 * (rhoP - rw) * d) / (3 * Cd * rw));
    if (Math.abs(vNew - v) < 1e-10) {
      v = vNew;
      break;
    }
    v = 0.5 * (v + vNew);
  }
  return v;
}
const G0 = 9.81;
export const stokes = (d, rhoP, T) => (G0 * (rhoP - rho(T)) * d * d) / (18 * mu(T));

// ---------------- CT tables ----------------
/** Giardia CT for free chlorine (USEPA SWTR regression, Smith et al. 1995). I = log inactivation */
export function ctGiardia(I, T, pH, C) {
  const c = clamp(C, 0.2, 3);
  const p = clamp(pH, 6, 9);
  if (T < 12.5) return 0.353 * I * (12.006 + Math.exp(2.46 - 0.073 * T + 0.125 * c + 0.389 * p));
  return 0.361 * I * (-2.261 + Math.exp(2.69 - 0.065 * T + 0.111 * c + 0.361 * p));
}
// USEPA virus CT, free chlorine, pH 6–9 (mg·min/L)
const VIRUS_CT = {
  2: [
    [0.5, 6],
    [5, 4],
    [10, 3],
    [15, 2],
    [20, 1],
    [25, 1],
  ],
  3: [
    [0.5, 9],
    [5, 6],
    [10, 4],
    [15, 3],
    [20, 2],
    [25, 1],
  ],
  4: [
    [0.5, 12],
    [5, 8],
    [10, 6],
    [15, 4],
    [20, 3],
    [25, 2],
  ],
};
export function ctVirus(logs, T) {
  const L = clamp(Math.round(logs), 2, 4);
  const tbl = VIRUS_CT[L];
  // extrapolate linearly in 1/T region above 25 °C conservatively keep 25 °C value
  let v = tbl[0][1];
  for (let i = 1; i < tbl.length; i++) if (T >= tbl[i][0]) v = tbl[i][1];
  // linear interp between nodes for smoothness
  for (let i = 1; i < tbl.length; i++) {
    if (T >= tbl[i - 1][0] && T <= tbl[i][0]) {
      v = tbl[i - 1][1] + ((tbl[i][1] - tbl[i - 1][1]) * (T - tbl[i - 1][0])) / (tbl[i][0] - tbl[i - 1][0]);
    }
  }
  return v;
}
