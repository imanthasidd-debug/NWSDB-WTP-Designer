# NWSDB Design Manual D3 – rules applied in NWSDB WTP Designer v1.2

Source: *NWSDB Design Manual D3 – Water Quality & Treatment Manual*, Revision 01 (November 2020).
Every rule below is a design check (or calculation step) in the application and cites its clause; the full live list for a
project is in **Library → NWSDB Design Manual D3 → Project compliance**, the report chapter "Compliance with NWSDB
Design Manual D3" and the Excel sheet "NWSDB D3 compliance".

## Water quality (Ch 2) – Raw water quality / Water quality compliance pages
| Clause | Rule in the app |
|---|---|
| §2.3.1 Table 2-4 | Predicted treated water screened against SLS 614:2013 – new parameters: albuminoid ammonia 0.15, anionic detergents 0.2, oil & grease 0.2, phenolics 0.001 mg/L, microcystin-LR 1 µg/L |
| §2.3.1 | NWSDB filtered-water design target 0.2 NTU (advisory); §6.2.4 full-treatment target < 0.1 NTU |
| §2.3.2 Table 2-6 | Raw water screened against SLS 722:1985 (coliform 5,000, pH 6–9, chloride 1,200, NO₃-N 10, F 1.5, phenolics 0.005, oil 0.1, As/CN/Se/Cr 0.05, Pb 0.1, Hg 0.001, DO ≥ 4, BOD 5) |
| Table 2-5 | Cyanotoxins 1 / 3 µg/L (desirable / permissible) |
| Annex I | ρ, μ, ν of water interpolated from the D3 table in every hydraulic calculation |

## Process selection (Ch 4) – Process selection page
| Clause | Rule |
|---|---|
| §4.3.6 Table 4-5 | Essential / optional processes for each triggered raw-water band (turbidity 0–2/2–30/30–100/100–750/> 750 NTU, colour, Fe, coliforms, algae, hardness, chloride, toxics, TOC) compared with the selected train. Where Table 4-5 conflicts with the source-specific trains of Fig 4-3/4-4 the item is reported as advisory; slow sand filtration is accepted in lieu of coagulation + rapid filtration |
| Fig 4-3 / 4-4 | Typical train for the source category shown on the process page and in the report |
| §4.3.8 | Treatment divided into ≥ 2 independent trains (**shall** – fail) |
| Auto rules | Pre-chlorination when coliforms > 5,000 or Fe > 1.0 (plus algae > 2,000, Mn > 0.2); pre-settling > 750 NTU; PAC for algae / microcystin / H₂S; direct filtration ≤ 20 NTU and ≤ 30 colour (§5.9.11); SSF ≤ 20 NTU, colour ≤ 25, algae ≤ 200/mL (Table 5-35); bleaching powder up to the hypochlorination limit (≈ 42 L/h of 1 % solution, §6.4.3), gas above (HTH not available in Sri Lanka) |

## Unit processes (Ch 5–6)
| Unit | Clause | Rules |
|---|---|---|
| Screens | §5.1.5, Annex A | Screen channel sized at 0.4 m/s approach, D = Q/(U·B), B ≥ 0.6 m; coarse 50–100 mm, 0.4–0.9 m/s; fine 5–20 mm, 0.4–1.0 (≤ 1.4) m/s, 10–30° to vertical; h = 0.0729(V² − U²) ≤ 0.15 m clogged |
| Aeration | §5.3, Annex B, Table 7-1 | K = 0.45(1 + 0.046T)h per drop; drops 4–6 (trays 3–5), 0.3–0.6 m (≤ 0.8), height 2–3 m (advisory); 0.01–0.028 m³/s per m width; 120 m² per m³/s (cascade), 50–160 (trays); spacing 0.3–0.75 m; tail water ⅔h; nappe throw; O₂ demand 0.14 Fe + 0.29 Mn; Table 5-8 CO₂ efficiency (advisory) |
| Chemicals | §5.2.4, §5.4, §6.1 | Alum pH 6.0–7.0 (5.5–7.5 limit), PACl 5–8, ferric 5–8.5; pH correction before coagulant; alum 20–100 mg/L; stock 10 % (2–10 %) diluted to ≤ 1 % at the diffuser (carrier water computed); day tanks 12–24 h, ≥ 2 tanks; duplicate feeders; ≥ 1 month storage; calibration time C·10⁴/(D·Q); direct filtration coagulant ≤ 10–12 mg/L |
| PAC | §5.2.3, §6.1.10 | 2–20 mg/L, ≥ 15 min contact ahead of coagulant, slurry ≥ 1.5 m/s, separate storage; added to sludge, cost and BOQ |
| Rapid mix | §5.5, Table 5-13, Annex C | G 500–1,000 (≤ 3,500) s⁻¹, t < 60 s (mechanical 30–60 s), Gt 30,000–60,000, ≥ 2 tanks, depth/width 2, impeller 50–80 %, baffles 8–10 %; D3 power numbers |
| Flocculation | §5.6, Tables 5-15/5-16, Annex D | G 10–75 s⁻¹ (≤ 100 → ≥ 10, tapered), t ≥ 20 min (paddle 30–40), channel 0.1–0.3 m/s, spacing ≥ 0.45 m, end clearance ≥ 0.6 m, depth ≥ 1.0 m, paddle relative velocity 0.75πnD ≤ 0.4 m/s, paddle area 5–20 %, D/H 0.5–0.75, 3–6 stages |
| Sedimentation | §5.7, Table 5-20, Annex E | SOR ≤ 1.0 m/h with coagulation (normal 0.75, very bad 0.4; aids 1.5), depth 2.5–4 m, L/W 3–6, 2–4 h, v < 0.02 m/s, weir < 18 m³/m·h, ≥ 2 basins, scrapers above 30–40 m²; plain settling 0.5 m/h and 4–6 h; tube settlers 2.5–7.5 m/h, ≥ 60°, ≥ 40 mm, coverage ≤ 75 %; settled water ≤ 5 NTU |
| Rapid filters | §5.8–5.9, Annex F | 5–15 m/h; N = 1.2√Q(mgd), ≥ 2 (≥ 4 > 15 mgd), rate with one out + one washing ≤ 15 m/h (auto number of filters satisfies it); area ≤ 50/100 (140) m²; ES 0.4–1.2, UC 1.2–2.0, depth 0.6–1.0 m and ≥ 1200 d₁₀; gravel 0.3–0.6 m and Huisman grading rules; water ≥ 1 m; box ≥ 2.5 m; laterals ≤ 0.3 m apart, orifice 0.15–0.5 %, L/D ≤ 60; backwash 30–54 m/h, ≥ 5 min, air 50–90 m/h for 2–3 min, expansion 15–30 %, troughs ≤ 2 m apart and 0.75–0.9 m above media (Q = 1.38bh^1.5), wash tank 2 washes + 10 %, wash water ≤ 6 %, net production (UFRV − UBWV) ≥ 306 m³/m²; filtered water < 0.3 NTU (95 %), never > 1 NTU |
| Slow sand | §5.12, Tables 5-35/5-36 | 0.1–0.4 m/h (≤ 0.4 with a bed out), ≥ 2 units, n = 15√Q, supernatant 1.0–1.5 m, sand 1.0–1.4 m (≥ 0.5–0.8 m), ES 0.15–0.35, UC 1.5–3, box ≥ 2.7 m, pre-treatment ≥ 20 NTU, ≤ 50 NTU, source limits (algae, colour, DOC, NH₃, Fe, Mn) |
| Disinfection | §6.2–6.5, Tables 6-2/6-4/6-5/6-7/6-12 | CT from D3 tables (25 °C values used above 25 °C), credits Table 6-7, baffling 0.1/0.3/0.5/0.7/1.0, residual 0.5–0.8 (avoid > 1.0), contact ≥ 20 min (WHO 30), WHO generic criterion, design dose ≈ 2 mg/L, 1 duty + 1 standby chlorinators, ≥ 30 days cylinders, ≤ 180 kg/d per drum, evaporators > 680 kg/d, scrubber NaOH 1.13 kg/kg, bleaching powder 35 % design / 1 % solution / ≤ 3 months / ≤ 42 L/h; DBP limits TTHM 100, HAA5 80 µg/L |
| Stability | Ch 8 | pH 6.5–8.5, LSI > −1.5, RSI < 10, CCPP > −5 (target +4), Alk & Ca ≥ 50 (advisory), Larson ratio ≤ 0.2 (advisory), Eq 8.3 cross-check, lime slurry 50–100 g/L |
| Residuals | §5.14, Table 5-44, Annex H | Method 02 balance (TSS/NTU, Fe 1.91, Mn 1.60, alum 0.26, PACl 0.8, FeCl₃ 0.66, polymer & PAC 1, lime 0.27) × 1.4, 90 % capture; Method 01 cross-check; thickener 20–80 kg/m²·d, 4–10 m³/m²·d (advisory), SWD 5.5 m; drying beds 100–300 kg/m²·yr, open beds only < 2,200 mm rain (else covered); backwash recycling only > 4,500 m³/d, not with polymer, ≤ 10 % of inflow |
| Layout | Ch 9 | Minimum site area A(acres) ≥ Q^0.7(mgd) (advisory), redundancy N − 1, ≥ 1 month chemicals, ≥ 2 h clear water, conveyance 0.15–0.9 m/s, laboratory Table 9-3, layout checklist |

## Printed inconsistencies resolved (Library → D3 → Errata)
Cadmium 0.03 → 0.003 mg/L; residual chlorine 0.5 vs 1.0 mg/L; aeration K printed 0.452(1+0.46T)h → Annex form;
spray-time square root; G formula P in kW → W; paddle tip 4/2 m/s → 0.4 m/s; solids-contact units; settler Re < 50 vs
< 800 (and its own tube velocity); filtration rate "40–60 m³/m²/h" → 5–15 m/h; Table 6-4 2-log entry 27 → 37 (1-log
column used); Table 6-5/6-6 virus headers; Table 8-4 base 9.0 → 9.3; Annex H KMnO₄ 0.4 vs 4 mg/L and thickener
diameter; cylinder sizes and drum withdrawal rate.

## Verification
155 engine checks pass, including D3 Annex A (screens), B.1/B.2 (aerators), C.1/C.2 (Parshall, flash mixer), D.2
(paddle), F.1 (N = 2.48, 1200 d₁₀), H (sludge 561.23 → 707.4 kg/d, 34.95 m³/d, Ø 3.35 m), Table 6-4/6-5 CT values,
Annex G (36–40 g per 1000 gal) and the Ch 8 Rochester example (pHs 9.43, LSI −1.83, RSI 11.25). The three sample
projects pass with 0 review / 0 fail (advisories only).
