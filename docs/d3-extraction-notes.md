# D3 Manual (NWSDB, Rev 01 Nov 2020) - Part 1 extraction
Scope: Ch 2 (2-1..2-26), Ch 4 (4-1..4-27), Ch 5 (5-1..5-33), Annex A (A-1..A-3), B.1 (A-4..A-10), B.2 (A-11..A-13).
Conventions: "shall" = mandatory wording in manual; "typ." = typical/recommended. Units as printed. [!] = typo/inconsistency flag (value recorded as printed).

## 1. Water quality standards (Ch 2)

### 1a. SLS 614:2013 potable water - D3 §2.3.1 Table 2-4 (p 2-14..2-15)
Manual prints ONE limit column ("Requirement" / "Limit (mg/L) Maximum"); no desirable/permissible split (only Table 2-5 has that). WHO column = value printed in D3 Tables 2-9/2-10/2-11/2-13 (source table noted).

| Parameter | Unit | SLS 614 max | WHO (D3 table) |
|---|---|---|---|
| Colour | CTU | 15 [!] text p2-15 says SLS colour = 5 Pt-Co | no health GV (2-9) |
| Odour / Taste | - | Unobjectionable | - |
| Turbidity | NTU | 2 (# see §6.4.2) | "<0.2 NTU for effective disinfection" (2-9); text p2-15 says WHO <0.5 NTU [!] |
| pH at 25 C | - | 6.5-8.5 | no health GV (2-9) |
| Aluminium (Al) | mg/L | 0.2 | 0.2 (2-11) |
| Free ammonia (NH3) | mg/L | 0.06 | n/a |
| Albuminoid ammonia | mg/L | 0.15 | - |
| Anionic detergents (MBAS) | mg/L | 0.2 | - |
| Calcium (Ca) | mg/L | 100 | n/a |
| Chloride (Cl) | mg/L | 250 | no health GV (2-10) |
| COD | mg/L | 10 | - |
| Copper (Cu) | mg/L | 1.0 | 1 (2-11) vs 2,000 ug/L (2-13) [!] |
| Fluoride (F) | mg/L | 1.0 | 1.5 (2-10) |
| Residual free chlorine | mg/L | 0.5 [!] Table 2-13 SLS chlorine = 1,000 ug/L | 5 (2-10) |
| Iron (Fe) | mg/L | 0.3 | 0.3 (2-11) |
| Magnesium (Mg) | mg/L | 30 | 150 (2-11) |
| Manganese (Mn) | mg/L | 0.1 | 0.4 (2-11 row 08) AND 0.1 (row 11) [!] duplicate |
| Nitrate (NO3-) | mg/L | 50 | 50 |
| Nitrite (NO2-) | mg/L | 3 | 3 |
| Nickel (Ni) | mg/L | 0.02 | 0.07 |
| Oil and grease | mg/L | 0.2 | - |
| Phenolic compounds (C6H5OH) | mg/L | 0.001 | - |
| Sodium (Na) | mg/L | 200 | 200 |
| Sulphate (SO4) | mg/L | 250 | 400 (2-10) |
| Total alkalinity (CaCO3) | mg/L | 200 | "acceptable 500" (2-9) |
| TDS | mg/L | 500 | 1500 (2-9; text: unpalatable >~1000) |
| Total hardness (CaCO3) | mg/L | 250 | no health GV |
| Total phosphates (PO4) | mg/L | 2.0 | - |
| Zinc (Zn) | mg/L | 3.0 | 3.0 |
| Arsenic (As) | mg/L | 0.01 | 0.05 (2-11) vs 10 ug/L (2-13) [!] |
| Cadmium (Cd) | mg/L | 0.03 [!] Table 2-13 SLS = 3.0 ug/L (=0.003) -> likely 10x typo | 0.003 |
| Chromium (Cr) | mg/L | 0.05 | 0.05 |
| Cyanide (CN) | mg/L | 0.05 | "occurs well below" |
| Lead (Pb) | mg/L | 0.01 | 0.01 |
| Mercury (Hg) | mg/L | 0.001 | 0.006 |
| Selenium (Se) | mg/L | 0.01 | 0.01 (2-11) vs 40 ug/L (2-13) [!] |
| Uranium | mg/L | - | 0.30 (2-11) [!] WHO 2011 = 0.03 |

- Microbial: total coliform & E. coli "should be absent" after disinfection to consumer; SLS 614 allows 3 coliform at user point, E. coli shall be 0; no algae/zooplankton/flagellates/parasites | §2.3.1 (p 2-15)
- NWSDB design target filtered-water turbidity: 0.2 NTU ("should achieve ... in designing WTPs") | §2.3.1 (p 2-15), ref §6.2.4
- Cyanotoxins (Table 2-5, p 2-16), desirable / permissible: Microcystin-LR 1 / 3 ug/L; Cylindrospermopsin 2 / 5 ug/L. WHO MC-LR 0.001 mg/L (Table 2-12).
- Table 2-13 (p 2-23..2-25, 121 rows WHO/USEPA/EU/SLS ug/L) has SLS values only for: As 10, Cd 3.0, Cl2 1,000, Cr 50, Cu 1,000, 2,4-D 50, F 1,000, Pb 10, Hg 1.0, Ni 20, NO3 50,000, NO2 3,000, Se 10.

### 1b. SLS 722:1985 raw water (inland surface water for public supply) - §2.3.2 Table 2-6 (p 2-16)
| Determinant | Unit | Tolerance limit |
|---|---|---|
| Coliform (monthly avg) | MPN/100 mL | <=5000; <5% of samples at 20,000 and <20% at 5000 (as printed) |
| pH | - | 6.0-9.0 |
| Chloride / Nitrate (as N) / Fluoride | mg/L | 1,200 / 10 / 1.5 max |
| Phenolics (phenolic OH) / Oil & grease | mg/L | 0.005 / 0.1 max |
| Pesticide residue | mg/L | "WHO requirement" |
| As / CN / Pb / Hg / Se / Cr | mg/L | 0.05 / 0.05 / 0.1 / 0.001 / 0.05 / 0.05 max |
| Dissolved oxygen | mg/L | 4 min |
| BOD | mg/L | 5 max |
| Alpha / Beta emitters | uc/mL | 1e-9 / 1e-8 |

### 1c. Other Ch 2 numbers
- Turbidity >4 NTU noticeable/objectionable | §2.2.2.4 (p 2-2)
- Hardness >~200 mg/L -> scale; <100 mg/L soft, low buffering, aggressive | §2.2.3.5 (p 2-5)
- Sulphate taste 300-400 mg/L; chloride >250 mg/L salty | §2.4.2.1 (p 2-19); chloride 500-1000 unpalatable, >4,000 unsafe | Table 2-10 (p 2-19)
- Iron: surface water 0.05-0.2 mg/L typ.; groundwater 1.0-10 common, up to 50 mg/L (ferrous) | §2.4.2.2 (p 2-19)
- Trophic state Table 2-3 (p 2-13) Chl-a ug/L | TP | TN mg/L | Secchi m: Oligo <8 | 0.01 | 0.2-0.4 | >3; Meso 8-25 | 0.01-0.035 | 0.4-0.6 | 3-1.5; Eu 25-75 | 0.035-0.1 | 0.6-1.5 | 1.5-0.7

## 2. Process selection (Ch 4)

### 2a. General rules
- Activated carbon filtration "shall be used" to minimise T&O and adsorb pollutants escaping conventional treatment | §4.3.2 (p 4-6)
- Pilot plant studies "highly recommended" where unit process not proven / performance uncertain | §4.3.2 item 7 (p 4-6)
- High true colour -> coagulation+flocculation+sedimentation+filtration (SSF removes little true colour) | §4.3.5 (p 4-8)
- Mn: needs high pH + oxidant (usually Cl2); 2-3 stage: (1) coag+sed/DAF for colour/turb/Fe, (2) rapid filtration, (3) high pH + oxidant + high-rate filtration for Mn | §4.3.5 (p 4-8/4-9)
- Algae -> microstrainer and DAF preferred; short T&O episodes -> PAC preferred over GAC; T&O-prone sites shall provide for future microstrainer + GAC | §4.3.5 (p 4-9)
- Coagulant + pre-Cl2 + PAC: contact time and dosing sequence must be strictly defined | §4.3.5 (p 4-9)
- Redundancy: treatment "shall be divided into two or more independent trains" (low initial demand, day/night, cleaning/repair); VSD recommended; inter-unit water levels shall be set by headloss calcs | §4.3.8 (p 4-17)
- Direct river intake: backside storage 1-2 days adequate for short-term pollution | §4.5.4(a) (p 4-25)
- Source algae control: keep T-N <0.2 mg/L, T-P <0.02 mg/L; retention <10-20 days | §4.5.6.2 (p 4-27)
- Jar test: rapid mix 0.5-1.0 min full rpm; floc 80->20 rpm over 5-20 min; settle 30-60 min; floc settling <5 min -> conventional settling, suspended >30 min -> flotation, pin floc -> direct filtration | §4.4.3.2 (p 4-20)

### 2b. Table 4-5 Recommended processes (p 4-12) - E = Essential, O = Optional
Columns: Scr(coarse/fine), RawStor/Desilt, Microstrainer, Aeration, PreCl/Oxid, PrelimSettle/Roughening, Coag+Floc, Settling, DAF, RapidF, SSF, GreenSand, PostCl, SuperCl+deCl, Lime softening, AC(PAC/GAC), IX, MF/NF/UF, RO.
- Floating debris: Scr E; Microstrainer O
- Algae (# sonicator at intake optional): Scr O, Microstr O, PreCl O, Coag O, DAF O, RapidF E, AC E
- Turbidity 0-2 NTU: Scr O, Settling E [!as printed, Coag blank], RapidF O, SSF O, PostCl E
- 2-30 NTU: Scr O, Coag O, Settling E, RapidF E, SSF O, PostCl E
- 30-100 NTU: Scr O, PrelimSettle O, Coag E, Settling E, RapidF E, SSF O, PostCl E
- 100-750 NTU: Scr E, PrelimSettle E, Coag E, Settling E, RapidF E, PostCl E
- 750-1000 NTU* and >1000 NTU*: Scr E, RawStor/Desilt O, PrelimSettle E, Coag E, Settling E, RapidF E, PostCl E (* coagulant aid/polymer optional)
- Colour <30 Hazen: Coag O, Settling O, RapidF O, SSF O, PostCl E
- Colour >30 Hazen: RawStor O, Coag E, Settling E, RapidF E, PostCl E
- Taste & odour: Aeration O, PreCl O, SSF O, SuperCl O, AC O
- Hardness >200 mg/L: Lime softening E, membrane O, RO O
- Fe <0.30 mg/L: Aeration E, PreCl O, PrelimSettle O, RapidF E, GreenSand O, PostCl E
- Fe 0.30-1.0: Aeration E, PreCl O, Coag E, Settling E, RapidF O, SSF O, GreenSand O, PostCl E, IX O, membrane O
- Fe >1.0: Aeration O, PreCl E, Coag E, Settling E, SSF O, GreenSand E, PostCl E, IX O, membrane O (RapidF blank as printed)
- Chloride 0-250: none; >250 mg/L: RO E
- Coliform (MPN/100 mL) 0-20: RapidF O, SSF O, PostCl E
- 20-100: Coag E, Settling O, DAF O, RapidF E, SSF O, PostCl E
- 100-5000: PreCl O, Coag E, Settling O, DAF O, RapidF E, SSF O, PostCl E
- >5000: PreCl E, PrelimSettle O, Coag E, Settling O, DAF O, RapidF E, PostCl E
- Toxic chemicals: SSF O, PostCl E, AC E, RO E
- TOC/UV254: Coag E, Settling O, DAF O, RapidF O, SSF O, PostCl O, AC E
- Selection rule: union of E across all characteristics; Table 4-4/4-5 "should be used with caution" | §4.3.6 (p 4-9)

### 2c. Table 4-4 effectiveness (p 4-10) cols Aer/Coag/Sed/RSF/SSF/Cl2 (o = no effect)
DO addition +,o,o,-,--,+ ; CO2 removal ++,o,o,+,+,+ ; Turbidity o,+++,+,+++,+++,o ; Colour o,++,+,+,++,++ ; T&O ++,+,+,++,++,+ ; Bacteria o,+,++,++,++++,++++ ; Fe&Mn ++,+,+,++++,++++,o ; Organics +,+,++,+++,++++,+++ ; Hardness +,--,--,--,o,o ; Corrosiveness +++,--,--,--,o,-

### 2d. Treatment trains - Fig 4-3 groundwater (p 4-14), Fig 4-4 surface (p 4-15)
- GW aerobic, non-corrosive -> PostCl
- GW aerobic, corrosive -> Aeration (decrease CO2+NH3) -> PostCl
- GW anaerobic, non-corrosive, no Fe/Mn -> Aeration (increase O2, remove NH3 & H2S) -> PostCl
- GW anaerobic, non-corrosive, with Fe -> Aeration -> Prelim settlement -> SSF -> PostCl (bypass options shown around settlement/SSF)
- GW anaerobic, corrosive, no Fe/Mn -> Aeration (incr O2 / decr CO2) -> PostCl
- GW anaerobic, corrosive, with Fe & Mn -> Aeration -> Prelim settle -> SSF -> PostCl; OR Aeration -> [Cl2, KMnO4] -> Coag/Floc -> Sedimentation -> RapidF -> PostCl
- Protected hill streams turbidity <2 NTU -> PostCl
- Streams slightly turbid, occasionally >2 NTU -> Roughening filter (used when >10 NTU, else bypass) -> SSF -> PostCl; or slightly polluted occ. >2 NTU -> Infiltration gallery -> PostCl
- Streams slightly polluted, frequent high turbidity & colour -> Coag/Floc (bypassable) -> Sed -> RapidF -> PostCl
- Tanks/lakes/canals slightly polluted, low turbidity + algae -> Prelim settlement (bypassable) -> SSF -> PostCl; OR Microfiltration -> Oxidation -> Coag/Floc -> DAF -> RapidF -> PostCl
- Low-land rivers/tanks polluted, high turbidity, algae, T&O -> Aeration (bypassable) -> PreCl (bypassable) -> Coag/Floc -> Sed -> RapidF -> PostCl
- Brackish/sea (Fig 4-5 p 4-16): screening + pH + coagulant -> DMF/settler/DAF or MF/UF pretreatment -> cartridge filter -> RO

## 3. Intake, screens, pre-treatment (Ch 5)
- Coarse screen (should be considered): clear opening typ. 50-100 mm at 22-45 deg incline; approach V >=0.4 m/s (no deposition), <=0.9 m/s at peak; headloss limited to 150 mm; mechanical rake cycle ~24 h | §5.1.5.1 (p 5-10/5-11)
- Fine bar screen: bar spacing 5-20 mm; approach <=1.4 m/s (fish); avg approach 0.6-1.0 m/s; max at peak 1.2-1.4 m/s; optimum 0.6 m/s through opening; min 0.4 m/s; hL 0.05-0.15 m; inclination 10-30 deg to vertical; duplicate screens provided | §5.1.5.2 (p 5-11)
- Band screen belt speed ~15 mm/s; drum screens 0.2-2 rev/min | §5.1.5.2 (p 5-11)
- Microstrainer: headloss 150 mm; drum peripheral speed 0.25 m/s (Fig 5-13); ~60% submerged; wash pressure ~0.20 MPa (0.196 in table); selection by pilot test | §5.1.5.3 (p 5-12..5-14)
- Table 5-2 (p 5-13) drum DxL mm: bed m2; Q m3/d at 1.0 m/min (0.5/1.5/3.0 scale ~linear): 35x300 0.21; 300 | 500x700 0.70; 1,000 | 700x900 1.98; 1,750 | 900x1200 3.39; 2,290 [!~2,920] | 1200x1500 5.65; 4,880 | 1500x2000 9.42; 8,130 | 2000x2400 15.1; 13,040 | 2000x3000 18.8; 16,240 | 2800x3600 31.7; 27,380 | 2800x4000 35.2; 30,410 (0.5 m/min printed 12,200 [!~15,200]). Derived (not stated): Q ~= rate x 1440 x 0.6 x pi*D*L.
- PAC spec: apparent density 0.36-0.74 g/cm3 (AWWA min 0.25); iodine no. 550-1200 mg/g (AWWA min 500); moisture should not exceed 8%; 65-95% passing 325 mesh (44 um) | §5.2.3 (p 5-15)
- PAC contact >=15 min min (longer for MIB/geosmin); not concurrently with Cl2/KMnO4; best at plant head; dose 2-20 mg/L nominal, >100 mg/L severe episodes | §5.2.3.1 (p 5-15/5-16); application-point pros/cons Table 5-4
- Coagulation pH (turbidity): alum 5.5-7.5 (typ 7.0); ferric 5.0-8.5 (typ 7.5); enhanced coag (organics): alum 6.0-6.5, ferric 5.5-6.0; readjust pH post-filtration preferred | §5.2.4 (p 5-16/5-17)

## 4. Aeration & gas stripping (Ch 5 §5.3)
- Mn deposition at pH 8-8.5; raise pH to 8.5 for Mn oxidation | §5.3 (p 5-17), §5.3.1 (p 5-19)
- Aeration adds 1-3 m pumping head; aerators should not be operated unless needed (decide on raw DO) | §5.3 (p 5-18)
- Cascade weir/step (typ.) | §5.3.3.2 (p 5-22): drops 4-6; drop height 30-60 cm; overflow 0.01 m3/s per m width of step; aerator height 2-3 m; cascade area 120 m2/(m3/s); flow velocity 0.3 m/s; weir height 0.2 m; inlet/outlet velocity 0.6-1.0 m/s; freeboard 100 mm. Cascade preferred where space permits.
- Multiple platform cascade (typ.) | §5.3.3.2b (p 5-22/5-23): drops 4-6; 0.3-0.8 m; 0.01 m3/s per m; height 2-3 m; area 85-105 m2/(m3/s). Wind effect "shall be considered" (CP3 Ch V-2:1972 / NA to BS EN 1991-1-4)
- Multiple tray (slat & coke) (typ.) | §5.3.3.3 (p 5-23): trays 3-5; perforations 10 mm @ 50 mm c/c; spacing 300-750 mm; height 2-3 m; media 4-7 cm, depth 10-25 cm; loading 0.01-0.02 m3/s per m2 tray; tray area 50-160 m2/(m3/s) [!] loading implies 50-100; air (if used) 7.5 m3/m3
- Packed tower (typ.) | §5.3.3.5 (p 5-24): 40-100 m3/m2/h; removal 95%; packing 25-50 mm; dia 3-6 m; packing ht 3-5 m; total 5-7 m; air:water 30:1-100:1 vol
- Spray (typ.) | §5.3.3.7 (p 5-25/5-26): jet 5-7 m/s; nozzle 25-40 mm; spacing 0.6-1.0 m; 5-10 L/s per nozzle; head 2-9 m; 10-50 Wh/m3; pipe V 1.0-1.5 m/s; area 105-320 m2/(m3/s); nozzles tilted 3-5 deg to vertical
- Plate (Inka) | §5.3.4.1 (p 5-26): 30-40 m3/m2/h; holes 1.0-1.5 mm; open area 1.5-3.0%; 30-40 Wh/m3
- Diffused | §5.3.4.2 (p 5-27): depth 3-4.5 m; width 3-9 m; HRT 10-30 min; W/D <2; max vol 150 m3; orifice 2-5 mm; air 0.7-1.1 m3/m3; blower 11-45 kW per m3/s
- Venturi: air 0.3-0.5 m3/m3, 20-30 Wh/m3 | §5.3.4.3 (p 5-27); membrane stripping air/water 10:1 | §5.3.4.5
- Weir aeration K formula valid for 20-100 m3/h per m straight weir; >=4 jets per m weir; best efficiency h <= 0.7 m where K*Cs = 7h (g/m3) | §5.3.5.1 (p 5-31, Fig 5-27); Annex B.1 uses h1 <= 0.80 m
- Tail-water depth d = 2/3 h (design estimate) | §5.3.5.1 (p 5-30)
- Table 5-5 (p 5-30) T 0/5/10/15/20/25/30 C: pw 0.611/0.872/1.23/1.71/2.33/3.17/4.24 kPa; O2 sat 14.6/12.75/11.27/10.07/9.07/8.24/7.54 mg/L
- Wind Table 5-6 (p 5-32) "10 min mean speed" (text: 3-s gust, 50-yr): Normal Z1/Z2/Z3 = 32/28/22 m/s; Post-disaster 36/31/25
- Table 5-8 efficiency % (CO2/VOC/H2S/O2) (p 5-33): Cascade 20-45/-/-/-; Tower co-current no vent >90/>95/-/85; Tray >90 (CO2 only); Mechanical/Plate(Inka) 75/95/-/90; Pressure/Venturi -/-/-/85; Spray 70-90/78/25-40/78; Diffused 80/-/-/-; Membrane 90/-/-/-
- All aerated water must be disinfected before distribution | §5.3.5.1 (p 5-30)

## 5. Formulas
- Screen headloss h = 0.0729 (V^2 - U^2) [m]; V through screen, U before screen [m/s] | §5.1.5.2 (p 5-11). Note 0.0729 = 1/(2g*0.7) -> h = (V^2-U^2)/(2g*0.7)
- Gas transfer rate M = KL*a*(Ci* - Di): M kg/h/m3, KL m/h, a m2/m3, conc kg/m3 | §5.3.2.5 (p 5-21)
- Weir: Q = 1.833 B H^1.5 (B width m, H head m) | §5.3.5.1 (p 5-30). Annex B.1 also Q = (2/3) Cd B H^1.5 sqrt(2g), Cd = 0.602 + 0.083 h/p
- Oxygenation efficiency K = (Ce - C0)/(Cs - C0); Ce = C0 + K(Cs - C0); multi-step: apply repeatedly | §5.3.5.1 (p 5-31)
- K = 0.452 (1 + 0.46 T) h (unpolluted, T in C, h step m) printed p 5-31 [!] gives K>1; Annex B.1 uses K = 0.45 (1 + 0.046 T) h -> use the Annex form
- Spray: V = Cv sqrt(2gh); Q = Cd a sqrt(2gh); t = 2 Cv sin(a) * (2h/g) as printed [!] dimensionally should be 2 Cv sin(a) sqrt(2h/g); Cv = Cd = 0.9; a = angle to horizontal | §5.3.5.2 (p 5-32)
- Table 5-7 (p 5-32): batch (Cs-Ct)/(Cs-C0) = e^-kt; CSTR (Ce-C0)/(Cs-Ce) = kt; plug flow (cascade, spray) (Cs-Ce)/(Cs-C0) = e^-kt
- Wind: Vb0 = Vb,zone x Calt; Calt = 1 + 0.001A <= 1.5 (Zone 3 only); Vb = Cdir x Cseason x Vb0, Cdir = Cseason = 1.0 | p 5-31, A-6
- Channels (Annex): D = Q/(V B); Manning v = R^(2/3) S^(1/2)/n, n = 0.013, S = (V n / R^(2/3))^2; Hazen-Williams H/L = 10.65 (Q/C)^1.85 / D^4.87, C = 120
- Free-fall nappe: t = sqrt(2h/g); x = v t; splash: v = g t, e = 0.5

## 6. Annex design examples (regression data)

### A: Coarse & fine screens (A-1..A-3)
Inputs: 15,000 m3/d; losses 7.5% ("5% in practice") -> 16,125 m3/d; 24 h ("22 h in practice") -> 672 m3/h -> Q = 0.187 m3/s.
- Channel: V = 0.4 m/s (recommended 0.15-0.4 m/s, cites p5-10 but not there [!]); B = 1.0 m; D = Q/(VB) = 0.467 m; channel depth 0.5 + freeboard 0.3 -> H = 0.8 m; R = 0.2415; n 0.013; S = 0.00018 -> 1:5560; v = 0.400
- Coarse: pitch 60 mm, bar 10 mm (10x40 rect.), W 1.0 m, H 0.80 m, d 0.47 m, 1 line, 30 deg to vertical; length = 0.8/cos30 = 0.924 (printed "mm", is m [!]); clear 50 mm; spaces 1000/60 = 16.70 -> 17; bars n = 16; actual clear = (1000-16x10)/17 = 49.41 mm; A1 = 0.47; A2 = 16x0.010x0.47 = 0.0752; A = 0.467-0.0752 = 0.3918 m2 (uses 0.467 not 0.47 [!]); V = 0.477 m/s (check 0.40-0.90 OK); hL = 0.0729(0.477^2-0.40^2) = 4.92 mm (limit 150)
- Fine: data cites spacing 5-25 mm [!] (Ch5: 5-20); V 0.6 m/s; S 5 mm; W 1.0, H 0.8, d 0.47; 20 deg to vertical; screen efficiency factor 0.56; effective opening 60% (SS); length 0.8/cos20 = 0.851; As = 0.47; Aeff = 0.6x0.467 = 0.2802; Vs = 0.667 m/s (0.60-1.0 OK); blocked Vs = 0.187/(0.467x0.56) = 0.715 OK; hL = 0.0729(0.667^2-0.4^2) = 20.77 mm (below 0.05-0.15 m range, not commented)

### B.1: Cascade platform aerator, Fe/Mn GW (A-4..A-10)
Inputs: 16,125 m3/d, 672 m3/h, 0.187 m3/s; Fe 0.13, Mn 0.05 mg/L, C0 = 0; T = 28 C; h = 0.75 m; Cs(28 C) = 7.81 mg/L.
- Criteria quoted: drops 4-6; 0.3-0.8 m; ht 2-3 m; 0.01 m3/s/m; area "85-105 m2/m3/hr" = 1.42-1.75 m2 per m3/min [!] numbers consistent with per m3/s
- K = 0.45(1+0.046x28)x0.75 = 0.77
- O2 demand: 0.14 mg O2/mg Fe2+, 0.27 mg O2/mg Mn -> 0.0182 + 0.0135 = 0.0317 mg/L
- DO by step (Table A1): in 0/6.01/7.40/7.72/7.79 -> out 6.01/7.40/7.72/7.79/7.81; selected steps = 3; h1 = 0.75 m (<=0.80); tail water x1 >= 2/3 h1 = 0.50 m
- Wind: Vb,zone = 28.0 m/s for "Zone 1" [!] Table gives Z1 normal = 32 (28 = Z2); Vb = 28.0 m/s
- Inlet shaft: Vmax 0.60-1.6 m/s; V 1.0 -> d = (4Q/(pi V))^0.5 printed 0.412 m [!] correct 0.488; adopt 600 mm -> V = 0.66 m/s; bell mouth Db 0.90 m, height 0.30 m
- Bell-mouth weir: trial h 0.110, p 0.3 -> Cd 0.632, L = pi x 0.9 = 2.83 m, Q = 0.193 m3/s; trial h 0.034, p 0.150 -> Cd 0.621, L = 16.34 m [!] (not pi x 0.9), Q = 0.188; concludes p = 0.10 m [!]; rise over bell mouth = 0.66^2/(2x9.81) = 0.02 m
- Area: Q = 11.20 m3/min x 1.75 = 19.6 m2 -> d = 4.995 -> 5.0 m; weir loading 0.187/(pi x 5.0) = 0.012 m3/s/m, printed "0.006 < 0.01 OK" [!]
- Trays: U1 = 0.187/(pi x 0.90 x 0.034) = 1.94 m/s; wind 5% x 28 = 1.40; total 3.34; t = (2x0.75/9.81)^0.5 = 0.39 s; Sf1 = 1.31 m; v = 3.84; e = 0.5 -> 1.92 m/s; T1 = 0.20 s; Sr1 = (0.5x1.94)x0.20 = 0.190 m; D1 = Db + 2(Sf1+Sr1) = 3.89 -> 3.9 m
- Tray 1->2: H = (Q/(1.833 x pi x D))^(2/3) = 0.041 m (printed without pi [!]); U2 = 0.371; total 1.77; Sf2 = 0.69 -> 0.70; D2 = 3.9 + 2x0.7 = 5.3 m (duplicate block with wrong inputs [!])
- Tray 2->3: h 0.033; U3 0.335 (total uses 0.362) -> 1.74; Sf3 0.68 -> 0.70; D3 = 6.7 m
- Tray 3->4 (collecting pan): h 0.029; U4 0.310; total 1.71; Sf4 0.67 -> 0.70; D4 = 8.1 m
- Inlet pipe: L 5 m, C 120, D 0.6 -> H/L = 0.818 mm/m, Hf = 4.1 mm
- Outlet channel: V 0.524 (outside 0.15-0.4 [!]); W 1.0; d = 356 mm; R = 0.2080; S = 0.000377 -> 1:2600; v = 0.530 m/s; depth 500 + FB 100
- Summary: N = 3, H = 0.75 m, inlet 600 mm, D1-D4 = 3.9/5.3/6.7/8.1 m, aerator height 2.75 m, channel 1000x500 mm, 1 in 2600

### B.2: Cascade step aerator (A-11..A-13)
Inputs: 15,000 m3/d + 7.5% = 16,125 m3/d; Q = 671.875 m3/h = 0.187 m3/s.
- Criteria quoted: drops 4-6; 300-600 mm; ht 2-3 m; weir loading 0.010-0.028 m3/s/m [!] (Ch5: 0.01)
- Assume N = 3, drop 0.40 m, q = 0.021 -> L = 0.187/0.021 = 8.90 -> 9.00 m
- H0 = (0.187/(1.833x9))^(2/3) = 0.0505 -> 0.05 m; V = 0.187/(9x0.05) = 0.416 m/s
- Tail water H = 2/3 x 0.4 = 0.267 m; t = (2x0.4/9.81)^0.5 = 0.286 s; x = 0.412 x 0.286 = 0.118 m; Bmin = 2x = 0.236 -> 0.24 m, "take 300 mm" (summary 0.24, figure 0.3 m [!])
- Channel: v 0.7 (0.6-1.0); W 1 m; d = 0.267 m; R = 0.174; S = 0.000852 -> 1:1100; v = 0.723; depth 500 + FB 200 = 700 mm
- Summary: contact time 0.286 s; q = 75 m3/h per m (=0.021 m3/s/m) yet also printed "0.01 m3/s/m" [!]; L 9.00, B 0.24, H 1.20 m (< 2-3 m criterion [!]); walls 0.200 m; horizontal run 0.9 m

## 7. App mapping (values: see §3/§4; m2/(m3/s) / 3600 = m2/(m3/h))
| Key | Value | Source |
|---|---|---|
| scr.coarseV | 0.4 min - 0.9 max (peak) m/s | §5.1.5.1 |
| scr.fineV | avg 0.6-1.0; peak 1.2-1.4 (max 1.4); min 0.4; opt 0.6 m/s | §5.1.5.2 |
| scr.headloss | 0.0729(V^2-U^2); coarse <=0.150 m; fine 0.05-0.15 m | §5.1.5 |
| scr.coarseOpen / Angle | 50-100 mm clear / 22-45 deg (Annex 30 deg to vert.) | §5.1.5.1 |
| scr.fineOpen / Angle | 5-20 mm (Annex 5-25) / 10-30 deg to vertical | §5.1.5.2 |
| scr.fineEffOpen / blockFactor | 0.60 / 0.56 (Annex A example values) | A-3 |
| channel V | 0.15-0.4 (Annex A, B.1) vs 0.6-1.0 (B.2, §5.3.3.2) m/s; n 0.013 | annex |
| aer.stepH | step 0.30-0.60 m; platform 0.3-0.8 m; best h <=0.7 (Fig 5-27) / <=0.8 (B.1); tail water 2/3 h | §5.3.3.2, §5.3.5.1 |
| aer.drops / height / weirLoad | 4-6 / 2-3 m / 0.01 m3/s per m (B.2: 0.010-0.028) | §5.3.3.2 |
| aer.cascadeArea | step 120 -> 0.0333; platform 85-105 -> 0.0236-0.0292 m2 per m3/h | §5.3.3.2 |
| aer.trayArea | 50-160 -> 0.0139-0.0444 m2 per m3/h; loading 0.01-0.02 m3/s/m2 | §5.3.3.3 |
| aer.traySpacing / trays | 300-750 mm / 3-5; media 40-70 mm x 100-250 mm deep | §5.3.3.3 |
| aer.sprayArea | 105-320 -> 0.0292-0.0889 m2 per m3/h | §5.3.3.7 |
| aer.K, DO chain | 0.45(1+0.046T)h; Ce = C0 + K(Cs-C0); Cs Table 5-5; O2 0.14/Fe, 0.27/Mn | §5.3.5.1, B.1 |
| aer.efficiency | Table 5-8 | p 5-33 |
| process selection | Table 4-5 E/O matrix + Fig 4-3/4-4 trains; >=2 independent trains (shall) | §4.3.6, §4.3.8 |
| raw-water check | SLS 722 Table 2-6 | §2.3.2 |
| treated-water check | SLS 614 Table 2-4; turbidity design target 0.2 NTU | §2.3.1 |
# D3 Manual (NWSDB Rev 01, Nov 2020) - Part 2: Coagulation, Rapid Mix, Flocculation, Clarification
Scope: Ch.5 labels 5-33…5-86 (§5.4–§5.7.9) + Annex C.1, C.2, D.1, D.2, E.1–E.4 (A-14…A-46).
Convention: `(p X)` = printed page label. "shall" / "should" / "must" quoted where the manual uses them; otherwise typical/recommended. [!] = ambiguity/erratum noted against the page image.

---
## 1. §5.4 Chemical coagulation (5-33…5-45)

### pH / chemistry
- Alum optimum coagulation + minimum floc solubility: pH 6.0–7.0 (normally) — D3 §5.4.4.1 (p 5-40)
- Iron coagulants usable over pH 5.0–11.0 — §5.4.4.1 (p 5-40)
- Minimise residual Al: keep coagulation/flocculation pH 6–6.5 (near min. solubility of Al(OH)3) — §5.4.9 (p 5-45)
- Colour coagulation: normally pH 4.5–5.5; alum most effective ≈ pH 5, ferric sulphate ≈ pH 4 for colour; turbidity optimum pH "much higher" — §5.4.3.1 (p 5-39)
- Fe²⁺ in-situ oxidation: water should contain O₂ and pH should be > 8.5; alt. O₂ at pH < 3 with PAC catalyst, or Cl₂ — §5.4.4.1 (p 5-40)
- pH corrections "shall be done prior to addition of coagulant" (lime at aerator inlet; acid after aeration) — §5.4.8 (p 5-44)
- Hydrolysis: fast 10⁻⁴–1 s, Al(OH)3 floc 1–7 s (p 5-40) → disperse coagulant instantly (p 5-45)
- Jar test: "essential tool" for coagulant type, dose and optimum pH — §5.4.3.1 (p 5-39); §5.7 (p 5-61)
- Alkalinity consumption: NO numeric alkalinity-per-mg-coagulant factor in this range. Only: "depending on raw-water alkalinity and pH, an alkali such as lime or caustic must be added" (p 5-39). Cross-refs outside range: alkalinity "should not be less than 30 mg/L nor higher than 400 mg/L" (§3.4.2.1, p 3-13); alum + 3Ca(HCO3)2 stoichiometry 594 : 3×100 (§5.14.3.4, p 5-174) → 1 mg/L alum (14H2O) consumes ≈ 0.505 mg/L alkalinity as CaCO3 (derived from that equation, not stated as a number).

### Table 5-10 Common inorganic coagulants (p 5-40) [checked on image]
| Name | Formula | Typical strength | Form | SG |
|---|---|---|---|---|
| Aluminium sulphate (alum) | Al2(SO4)3·14–18H2O | 16% Al2O3 | lump/granular/powder (white) | ≈1.3 |
| Aluminium chloride | AlCl3·6H2O | 35% AlCl3 | liquid | ≈1.3 |
| PACl | Alx(OH)yClz | 10% Al2O3 | liquid | ≈1.2 |
| Ferric sulphate | Fe2(SO4)3·9H2O | 68% Fe2(SO4)3 | granular (green) | ≈1.5 |
| Ferric-floc | Fe2(SO4)3·9H2O | 41% Fe2(SO4)3 | solution (brown) | ≈1.45 |
| Ferric chloride | FeCl3 | 60% FeCl3; 35–45% FeCl3 | crystal, solution (brown) | 1.5 |
| Sodium aluminate | Na2Al2O4 | 38–46% Na2Al2O4 | liquid (white) | ≈1.3 |
- Commercial alum strength in Sri Lanka 15–22% as Al2O3 (outside range, §5.14.3.4 p 5-174).
- Standard alum solution 4.2% Al may contain 1000 ppm Fe — §5.4.9 (p 5-44)

### Table 5-11 Dosing (solution) concentration (p 5-44) [checked]
| Chemical | Manual feed | Mechanical feed |
|---|---|---|
| Alum | 3–7 % | 3–7 % |
| Lime | 3–10 % | 2–10 % |
| PACl | 2–10 % | 2–10 % |
| KMnO4 | 2 % | 2 % |

### Feed / storage
- Solution tanks hold solution "to feed for 12–24 hours" — §5.4.8 (p 5-44)
- Duplicate feeding arrangements "must be provided"; storage adjacent to feeder "should be provided for at least one-month's requirements" — §5.4.8 (p 5-44)
- Tanks plastic or plastic-lined; feed lines non-corrosive (plastic, alkathene, PE, rubber) — (p 5-44). Detail → Chapter 6.
- Turndown / feeder range: not given numerically in this range (see Ch.6).

### Coagulant selection / polymers
- Raw water < 10 NTU: usually cannot be clarified by cationic polymer alone → alum + cationic polymer; consider in-line (direct) filtration for low turbidity — §5.4.6 (p 5-42)
- 10–60 NTU: inorganic coagulant + cationic polymer most effective; > 60 NTU: polymeric primary coagulant alone normally sufficient — §5.4.6 (p 5-43)
- FeCl3 needs ≈ half the alum dose (NWSDB study, Ref 22) but gave higher coagulated/settled turbidity than alum — (p 5-43)
- Polymers cut sludge 50–90 %; dry solids ≈ 0.12 (alum) / 0.25 (ferric sulphate) "kg per pound" [! units mixed]; 1 ppm alum adds 0.45 ppm sulphate (as CaCO3) — (p 5-41)
- Coagulant aids for low temperature (< 12–15 °C) (p 5-42); acrylamide monomer traces "should not be present"

---
## 2. §5.5 Rapid / flash mix (5-45…5-52)

### General criteria (p 5-45)
- Detention time in mixer "should be less than 1 min"
- G "should be" 500–1,000 s⁻¹; in certain raw waters G up to 3,500 s⁻¹ may be optimum
- Typical Gt = 30,000–60,000; if t increases, G should decrease
- Order of preference (p 5-46): 1 pressurised-water-jet diffusion, 2 inline static, 3 inline mechanical, 4 hydraulic, 5 mechanical flash, 6 pipe-grid diffusion
- Mechanical mixers: square basins, depth/width ≈ 2; avoid round/cylindrical chambers (or baffle them) — (p 5-46)

### Mechanical flash mixer typical criteria (§5.5.5, p 5-49)
- t = 30–60 s; G = 500–1,000 s⁻¹; Gt = 30,000–60,000
- Minimum no. of tanks = 2
- Water depth / tank width = 2
- Impeller diameter = 50–80 % of tank width
- Baffle width = 8–10 % of tank width; no. of baffles = 4 (square), 6 (circular)
- Mixing devices "shall be able to adjust the intensity" (variable speed drive) — (p 5-49)
- Package plants: flash mixer "shall be designed" for G "in the range of 1000" — §5.7.7.1 (p 5-78)

### Table 5-13 Power number k of rapid-mix impellers (p 5-50; source Qasim, Water Works Engineering p 251)
| Flow | Impeller | k |
|---|---|---|
| Radial | Straight-blade turbine, 4 blade w/d=0.15 | 2.6 |
| Radial | Straight-blade turbine, 4 blade w/d=0.20 | 3.3 |
| Radial | Disc turbine 4 blade w/d=0.25 | 5.1 |
| Radial | Disc turbine 6 blade w/d=0.25 | 6.2 |
| Axial | Propeller 1:1 pitch | 0.3 |
| Axial | Propeller 1.5:1 pitch | 0.7 |
| Axial | 45° pitched blade 4 blade w/d=0.15 | 1.36 |
| Axial | 45° pitched blade 4 blade w/d=0.20 | 1.94 |

### Other mixers
- Static mixer: length typically 2–4 × pipe diameter; head drop ≈ 0.5 m; must be in pressure pipeline; poor for large flow variation — §5.5.6 (p 5-51)
- Jet (pressurised nozzle) mixing: total jet flow ≈ 10 % of water flow (rule of thumb) — §5.5.8 (p 5-52)
- Weir mixing: chamber volume = L×W×D; energy largely independent of flow — §5.5.2 (p 5-47)
- Parshall-flume hydraulic jump mixer → Annex C.1 — §5.5.3 (p 5-47)
- Flow regime: laminar Re < 10 for many impellers, laminar may persist to Re ≈ 100 — (p 5-47); Annex C.2 requires Re > 10,000 for turbulent formula.

---
## 3. §5.6 Flocculators (5-52…5-58)
- Extreme local velocities of moving element/liquid limited to 0.4 m/s (floc shear) — §5.6 (p 5-52)

### Hydraulic (baffled) flocculators §5.6.1 (p 5-53…5-55)
- G "should be" > 10 (promote flocculation) and < 75 (avoid floc break-up); initial ≤ 100, final ≥ 10; typical 15–90 s⁻¹ (p 5-53/54)
- Typical criteria (p 5-54): G = 10–100 s⁻¹; t = 1,200–1,800 s; channel velocity up to sed. tank v = 0.1–0.3 m/s; typical head loss H = 0.5 m; no. of baffles n = 12–20 with 180° turns and well-rounded corners
- Minimum detention time "should be at least 20 minutes"; velocity in canal/pipe to sedimentation "should be" 0.1–0.3 m/s, laminar flow (p 5-54)
- Velocity in horizontal- and vertical-flow units 0.1–0.3 m/s; t 20–30 min; G 100→10 s⁻¹ (p 5-55)
- Tapered G recommended ≈ 75 s⁻¹ inlet → 10–15 s⁻¹ outlet (p 5-55); taper by baffle spacing (fixed section) or channel depth (p 5-54)
- Baffles "shall be fixed as removable" for cleaning (p 5-53)

Table 5-15 Guidelines (p 5-55) [checked]:
- Around-the-end (horizontal): spacing between baffles should not be < 45 cm; clear end distance baffle–wall ≈ 1–1.5 × spacing and not < 60 cm; water depth not < 1.0 m; timber/SS/PVC/PPE baffles; no asbestos-cement.
- Over-and-under (vertical): spacing not < 45 cm; depth 2–3 × spacing; clearance baffle edge–surface or –floor ≈ 1–1.5 × spacing; weep holes for drainage.

### Mechanical flocculators §5.6.2 — Table 5-16 (p 5-56) [checked]
| Parameter | Horizontal shaft, paddle | Vertical shaft, turbine |
|---|---|---|
| G (s⁻¹) | 50–10 | 70–10 |
| t (min) | 30–40 | 20–40 |
| Stages | 3–6 | 2–4 |
| Max flow velocity (m/s) | 1.0 | 2–3 |
| Paddle area (%) | 5–20 | 0.1–0.2 |
| Blade dia / tank width D/L | 0.5–0.75 | 0.2–0.4 |
| Shaft speed (rpm) | 1–5 | 8–25 |
- Variable speed drive range up to 1:4 (p 5-56)
- Starter baffles (vertical shaft): 2 or 4 pairs; width 1/8–1/12 of compartment width (p 5-57)
- Paddle-wheel design criteria (p 5-57) [checked]: wheel dia 3–4 m; paddle board section 100–150 mm; board length 2–3.5 m; board area / tank section area < 20 %; paddle tip speed "Strong floc, 4 m/sec and Weak floc, 2 m/sec" [! as printed – conflicts with 0.4 m/s limit (p 5-52) and Annex D.2 0.40 m/s; likely decimal error]; spacing between wheels on a shaft 1 m; clearance from walls 0.7 m; min basin depth 1 m or wheel diameter; min clearance between stages 1 m
- Alternate rotation direction of successive shafts; taper by slower sequential shafts (p 5-57/58)
- Annex D.2 note (p A-28): peripheral speed of paddle wheel "should be limited to 0.40 m/s for alum coagulation and 0.50 m/s for lime softening"
- Annex D.2 version of Table 5-16 differs [!]: paddle G 50–5, turbine G 80–10, paddle stages 2–6; its "design data" G 60–10 (p A-24)

---
## 4. §5.7 Clarification (5-58…5-86)

### Settling fundamentals (p 5-59…5-61)
- Settling column: full-scale settling rate = column rate × 0.65–0.85; detention = column time × 1.25–1.5 (p 5-61)
- Floc settling velocity 0.5–3.5 m/h; alum floc 1.0 m/h "commonly used for design" (p 5-63)
- Table 5-19 settling velocities (p 5-61): d (mm) 1/0.5/0.25/0.1/0.05/0.005/0.001/0.0001 → Vs (m/h) 365/194/97.5/29/10.6/0.14/0.005/0.00005

### §5.7.1 Horizontal-flow rectangular basin — typical design criteria (p 5-63) [checked]
- Basin depth D = 2.5–4.0 m
- L/W = 3–6
- Detention t = 4–6 h pre-settling; 2–4 h coagulant settling
- L/D = 20 "(for basins over 60 m long)" [! Annex E.1 uses L/D ≤ 20 as a max]
- Weir overflow rate < 18 m³/m·h (= 432 m³/m·d)
- Sludge storage additional depth 0.15–0.3 m; freeboard 0.3 m
- Circular basin diameter < 60 m
- Average velocity in basin < 0.02 m/s (Annex E.1 note: Sanks 0.005–0.03 m/s)
- Velocity in sludge drains > 1.4 m/s
- Velocity in inlet pipe/channel & outlet 0.15–0.4 m/s
- Sludge-zone floor slope "should have a minimum of 5 %" to drain (p 5-63)
- Number of basins at least two (p 5-63)
- Outlet: submerged orifices preferred over V-notch; adjustable V-notch plates 50 mm deep at 75–150 mm spacing preferred (p 5-62/64)

Table 5-20 Recommended surface overflow rate Q/A, m³/h per m² (p 5-63) [checked column order]
| Type | Normal | Easy | Very bad |
|---|---|---|---|
| No pre-treatment | 0.50 | 1.00 | 0.10 |
| With chemical coagulation | 0.75 | 1.00 | 0.40 |
| With coagulant aids | 1.13 | 1.50 | 0.75 |
(m³/m²·d = ×24: coag normal 18, easy 24, very bad 9.6; aids 27.1/36/18; none 12/24/2.4)

Sludge removal (p 5-64/65):
- Manual cleaning: extra depth 1.2–1.5 m "should be provided"; floor sloped to drain
- Mechanical scraper used when settling-zone area > 30–40 m²; allows slope down to 2 % (light sludge)
- Flight & chain: scraper speed ≤ 1 cm/s; max scraper width 6 m. Travelling bridge speed 3–4.5 cm/s
- De-sludging pipe minimum 300 mm (non-mechanised); 200–300 mm (mechanical)

### §5.7.2 Radial/circular: same surface overflow rates as rectangular (p 5-65); peripheral-feed less short-circuiting than centre-feed.

### §5.7.3 Flocculator-clarifier (clari-flocculator): qualitative only (Table 5-21, p 5-67).

### §5.7.4 Pyramid (hopper-bottom) sludge-blanket clarifier (p 5-67/68)
- Surface loading 1.25–2.5 m³/h/m²
- Detention ≈ 2 h ("not usually used as a criterion")
- Weir loading < 9 m³/h per m weir (Annex E.3: ≤ 215 m³/d/m)
- Not recommended for small WTPs with river sources (high turbidity variation); unsuitable for high silt loads (p 5-68)

### §5.7.5 Sludge recirculation / solids-contact (p 5-69) [checked]
- Recirculation through rapid-mix 1–4 × throughput; turbine internal recirculation 8–20 × max influent
- "Shall" considerations for suspended-solids-contact clarifier: turbidity 10–1,000 (units not stated; small fluctuation); surface loading "24-36 m³/m²/hr" [! as printed, almost certainly m³/m²/d ≈ 1.0–1.5 m/h]; weir loading "8-15 m³/m²/hr" [! as printed, likely m³/m/h]; detention 1.5–2.5 h; no. of tanks > 1

### §5.7.6 Pulsator (p 5-70…5-72) [Table checked]
- Vacuum pump air rate = half the water flow rate; chamber rises 0.6–1.0 m above clarifier level; drains in 5–20 s, fills in 20–40 s
- Upward rise velocity limited to 2.4 m/h; detention generally 2 h
- Super Pulsator: 1 h detention, 6–7.3 m/h overflow
Table 5-24: Pulsator 2–3 / 3–4.5 m/h; Pulsator T (Pulsatube) 4–6 / 6–9 m/h; Pulsator U (Ultra) 9 m/h; all max inlet turbidity 1,000 NTU, max algae 100,000 cells/mL (settling velocity w.r.t. sludge bed).

### §5.7.7 Tube / plate settlers (p 5-72…5-79) [criteria page checked]
- Overflow rates 5–8 × conventional rectangular (p 5-73); upgrade of existing basins 4–5 × (p 5-75); tube-settler basins 2–4 × standard rates (p 5-73)
- Tubes ≈ 5 cm, inclined 60°, loading normally 9 m³/h per m² (p 5-73)
- Plates/tubes inclined 45–60°; spacing w "should not be less than 4 cm"; for up-flow slope > 50° (p 5-73); tubes at 50–60° self-cleaning; typical separation 50 mm, inclined length 1–2 m (p 5-75)
- Horizontal basin with settlers: space between settler system and tank base & inlet wall "shall be 1.5 m or more"; average inlet flow velocity "shall be 0.7 mm/min or less" [! as printed] (p 5-76)
- Commonly used criteria (p 5-76):
  - Inlet: distance to perforated baffle ≤ 2 m; hole dia 0.1–0.2 m
  - Settling zone: overflow rate 2.5–7.5 m³/m²/h; side-wall depth 3–5 m (chain & flight); length 60 m; width 6 m max per train
  - Settler: fraction of basin covered < 0.75 (≤ 0.95 plates); height 0.5–2 m (≥ 1.0 m plates); angle ≥ 55° plates (≥ 60° tubes); tube hydraulic dia 0.05–0.08 m; tube velocity 0.0025–0.0033 m/s; plate spacing 5 cm; approach velocity 1.3 mm/s (horizontal mean); Reynolds < 50; Froude > 10⁻⁵
  - Outlet: launder length = settler length; spacing 1.5 m c/c; elevation 0.6–1.0 m above settler top; launder weir loading 12.5 m³/h/m
  - Sludge zone: depth 0.6–1.0 m; slope 1:600 (mechanical); collector speed 0.3–0.9 m/min
- Up-flow settler installation area "shall be" 90 % of basin (may be 80 %); gap to walls/baffles "shall be" ≤ 100 mm (p 5-76)
- Tube design on total projected area: 1.2 m/h for Al/Fe coagulants (range 1–2 m/h) (p 5-76); stilling zone 25 % of basin area; ≥ 3 m clear depth below tubes; 2–3 m clear above (p 5-77)
- Plate (lamella) loading 0.7–1.7 m/h (projected) ≡ 5–15 m/h overall basin (co-current); launders ≈ 1.8 m apart; orifice velocity 46–76 cm/s (p 5-77)
- Package plants (§5.7.7.1, p 5-77/78): capacity limit ≈ 10,000 m³/d (NWSDB type drawings 500/1000/1500 m³/d, up to 2000; SETA up to 50,000 m³/d); plate spacing "shall be" 50 mm, best angle "shall be" 60°; 50 mm PVC tubes, recommended length 1 m, 1×1×1 m modules; area ≈ 1/5 of plain sedimentation; criterion = overflow rate ≈ 6 m/h (not retention); 100–150 mm vertical drop between modules; 500 m³/d plant → mechanical flocculator
- Tube settling cuts settling time to ≈ 45 min (p 5-79/80)

### §5.7.8 DAF (p 5-80…5-85) [criteria page checked]
- Design criteria (p 5-83): flocculation time 15–30 min; flotation detention 10–20 min; overflow/rise rate 5–15 m³/m²/h; saturator pressure 450–620 kPa; recycle rate 5–15 %; float percent solids "0.2 6 %" [! as printed, probably 0.2–6 %]; float layer 5–15 mm; lower values when flotation + filtration combined
- Text: saturation 450–600 kPa, recycle 5–10 % (p 5-82/83); bubbles 10–100 µm (mean 40–50); eductor saturator efficiency 80–85 %
- SLR traditionally 10–15 m/h; high-rate 30–50 m/h (p 5-83/84); floc ahead often 20–30 min, but 10–30 µm floc with < 10 min effective (p 5-84)
- Not suited to turbidity > 100 NTU or high-density solids (p 5-84); effluent typically < 0.5 NTU
- Float solids: mechanical skimming 3–6 % (2–5 % p 5-83); hydraulic flooding ≈ 0.5 %
- Sri Lanka: DAF + separate granular filtration preferred over DAF-over-filter for algae (p 5-82)

### §5.7.9 Sludge quantity (p 5-85/86)
- No explicit formula in §5.7.9; refers to Table 5-44 (p 5-172, outside range): turbidity 0.5–2 mg TSS/L per NTU removed (1 common); alum 0.26, Fe2(SO4)3 0.54, FeSO4·7H2O 0.39, FeCl3 0.66, polymer 1, PAC 1 kg/kg coagulant [! footnote letters misaligned in source]
- "Actual reported" sludge quantities (bound water) alum 0.33, ferric sulphate 0.59, ferric chloride 0.48 → designers should increase theoretical values (p 5-85)
- Coagulation sludge solids 0.5–2 %; 80–90 % of solids removed in sedimentation (p 5-85/86) [§5.14.3.3 says 60–90 %]
- Annex E.4 uses: Dry solids (mg/L) = X + S + H + C + Fe + Mn + P + L + Y (see E.4)

---
## 5. Formulas (as used)
- G = √(P/(μV)); P power (manual states "kW" [! must be W for SI]), μ = 1.0×10⁻³ N·s/m² at 20 °C, V m³ — §5.5 (p 5-46)
- Hydraulic: P = ρ g h Q → G = √(ρ g h/(μ T)), T = detention in chamber — (p 5-46)
- Baffled flocculator: G = √(s g H/(ν T)); s specific gravity, H head loss per baffle (m), ν = 0.898×10⁻⁶ m²/s "at 25 °C" [! Annex D.1 labels same value 20 °C], T detention per baffle (s) — (p 5-55)
- Rushton: turbulent P = k ρ n³ d⁵; laminar P = k μ n² d³; k power number (Table 5-13), n rev/s, d impeller dia (m) — (p 5-47)
- Impeller Re = d² n ρ/μ (Annex C.2)
- Per-baffle head loss h = 3.2 v²/(2g); time per baffle t = L*/u (L* = travel length) — Annex D.1
- Paddle power P = 0.5 Cd ρ Ap Vp³, Vp = 0.75 × π n d (relative = 75 % of absolute peripheral); multi-blade: P = 0.5 Cd ρ Ap (0.75 π n)³ (d1³+d2³+d3³) — Annex D.2. Cd vs L/W: 5→1.2, 20→1.5, ∞→1.9 (Qasim p 257)
- Motor power Pm = P/(ηb ηm) (D.2: ηb 0.70, ηm 0.90); flash mixer Pm = P/ηm (C.2: 0.90)
- Stokes Vs = g(ρp−ρ)dp²/(18μ); ideal basin Vo = H/T = Q/A; removal fraction = Vs/Vo — (p 5-60)
- Inclined plate overflow (p 5-75): s′ = (w+t)/(H0 cosθ + w)·s0 (up-flow); (w+t)/(H0 cosθ − w)·s0 (co-current); (w+t)/(H0 cosθ − 0.5w)·s0 (cross-flow); s0 = Q/(B0 L0); w plate spacing, t plate thickness, θ from horizontal, H0 tank height
- Parshall free flow Q = 2.273 W Ha^(1.4757C), C = W^0.026 (W m, Ha m, Q m³/s); submergence limits Table A4: W < 0.3 m → Hb/Ha < 0.60; 0.3–2.5 m → < 0.70; 2.5–15.2 m → < 0.80
- Froude F = v/√(g h)
- Weir: Q = 1.833 B H^1.5 (E.1); Q = 1.84 B h^1.5 (E.3); trough upstream depth h2 = h1 + q²/(2 g h1² B²) (E.1)
- Baffle-wall port head loss = 1.7 v²/2g (E.1)
- Outlet weir length L = 0.2 Q/(D·Vs) (E.1; Q per basin, Vs settling velocity, D depth) [! units mixed in example]
- Scour pipe q = C a √(g h), C = 0.6 (E.1); Hazen-Williams H/L = (6.81/D^1.167)(V/C)^1.85, C = 130 (E.3)
- Manning V = R^(2/3) S^(1/2)/n, n = 0.013 (E.1)
- Hopper (frustum) volume = 1/3 (H_big B² − h_small b²), H = (B/2) tanθ (E.3)

---
## 6. Annex worked examples (regression data)

### C.1 Hydraulic rapid mix – Parshall flume (A-14…A-16)
Inputs: Q = 16,125 m³/d = 0.187 m³/s; W = 610 mm.
Table A3 (Okun) row W=610: A 1,530; B 1,500; C 900; D 1,210; E 900; F 600; G 900 mm; Qmin 1,030, Qmax 81,100 m³/d. Others: H 920, K 75, M 375, N 225, S 1,020, T 100 mm. Full Table A3 (W: A,B,C,D,E,F,G; Qmin–Qmax m³/d): 150: 620,600,390,400,600,300,600; 122–9,550 | 300: 1370,1340,600,850,900,600,900; 274–39,500 | 460: 1450,1420,750,1030,900,600,900; 367–60,200 | 610: as above | 910: 1680,1650,1200,1570,900,600,900; 1,500–123,000 | 1220: 1830,1790,1520,1940,900,600,910; 3,190–166,000 | 1520: 1860,1940,1830,2150,900,600,910; 3,920–210,000.
Steps: C = 0.610^0.026 = 0.987; Ha = (Q/(2.273W))^(1/(1.4757C)) = 252 mm; va = 0.187/(1.210×0.252) = 0.61 m/s; F = 0.388; Hb = 0.70 Ha = 176.4 mm; vb = 0.187/(0.610×0.1764) = 1.74 m/s; F = 1.32. Limiting submergence 0.70. Inlet depth du = T + Ha = 352 mm; min 140 mm at max flow → max d/s level = Ha − 140 = 112 mm above throat floor; outlet depth Dd = 0.5C = 450 mm. (No G/t computed for the jump; no Froude criterion stated.)

### C.2 Mechanical flash mixer (A-17/18)
Inputs: Q = 0.187 m³/s; t = 40 s; 2 tanks; D/B = 2; μ = 0.0010 N·s/m² (20 °C); ρ = 1000.
V = 7.48 m³ → 3.74 m³/tank → B = (3.74/2)^(1/3) = 1.23 → B = L = 1.30 m, D = 2.60 m, V = 4.39 m³; freeboard 0.3 → H = 2.90 m; t = 4.39/0.0935 = 47 s.
Impeller d = 0.5×1.3 = 0.65 → 0.70 m. G = 950 s⁻¹ → P = G²Vμ = 3,962 W; motor (η 90 %) 4.40 kW. Gt = 950×47 = 44,733 (OK 30,000–60,000).
4-blade turbine w/d = 0.16 → K = 2.74 (interpolated Table 5-13); n = (P/(ρKd⁵))^(1/3) = 2.05 rps = 123 rpm; Re = d²nρ/μ = 1,004,500 > 10,000 OK. Baffle width 0.1×1.30 = 0.13 m; 4 baffles; impeller height above floor = d = 0.70 m.

### D.1 Hydraulic around-the-end flocculator (A-19…A-23)
Inputs: Q = 0.187 m³/s, 20 °C, μ = 1.009×10⁻³ N·s/m², ν = 0.898×10⁻⁶ m²/s; 3 trains → 0.062 m³/s each; T = 28 min; G min 20/max 80/avg 50 → GT = 84,000 (range 10⁴–10⁵). Design data also lists: slot width ratio p = 0.9–1.1, overlap ratio q = 4–5, depth ratio r = 1–3 (not used); baffle thickness 0.04 m.
V = 104.51 m³; L = 6.0 (= sed. basin width), D = 3.0 → B = 5.81 → 3 channels of 2.0 m, walls 0.15 → width 6.30 m; H = 3.30 m; Vprov = 108.0 m³; T = 1,736 s (28.9 min).
Entrance spacing 0.12 m: u = 0.258 m/s; h = 3.2u²/2g = 0.0108 m; L* = 3.0 m; t = 11.6 s; G = 100.85 s⁻¹.
Exit spacing 0.54 m: u = 0.057; h = 0.00053 m; t = 52.6 s; G = 10.49 s⁻¹.
Table A5 (n baffles, spacing m, v m/s, h/baffle m, total h m, G s⁻¹, baffle length "width" m, section length m):
| n | s | v | h | Σh | G | width | length |
|---|---|---|---|---|---|---|---|
| 8 | 0.120 | 0.259 | 0.0110 | 0.088 | 96 | 1.820 | 1.40 |
| 10 | 0.200 | 0.156 | 0.0039 | 0.039 | 45 | 1.700 | 2.64 |
| 6 | 0.250 | 0.124 | 0.0025 | 0.015 | 32 | 1.625 | 2.03 |
| 8 | 0.310 | 0.100 | 0.0016 | 0.013 | 23 | 1.535 | 3.11 |
| 6 | 0.430 | 0.072 | 0.0009 | 0.005 | 14 | 1.355 | 2.82 |
| 5 | 0.450 | 0.069 | 0.0008 | 0.004 | 13 | 1.325 | 2.45 |
| 6 | 0.540 | 0.058 | 0.0005 | 0.003 | 10 | 1.190 | 3.85 |
Total head loss 0.167 m; total length 18.3 m; 49 baffles. (Observed: baffle length = 2.0 − 1.5×spacing, i.e. end clearance 1.5 s; Σh = n·h.) Last 1.2 m = transition to sedimentation. Baffles timber ≥ 12 mm or plastic 10 mm in wall grooves.
[!] Example spacings 0.12–0.43 m violate Table 5-15 minimum 45 cm, and 49 baffles exceed "12–20"; manual notes depth/overlap/slot ratios were ignored as uneconomical.

### D.2 Mechanical paddle flocculator (A-24…A-28)
Inputs: Q = 15,000 m³/d, "0.189 m³/s" [! inconsistent; 15,000 m³/d = 0.174]; 2 trains, Qd = 340.9 m³/h = 0.0947 m³/s; G stages 60/30/15 (avg 35); T = 30 min → GT = 63,000.
V = 170.5 m³; 3 stages × 56.8 m³; B = 6 m (= sed width), D/L = 1 → L = D = 3.1 m; t/stage = 600 s; basin length 3×3.1 + 0.1×2 = 9.43 → 9.5 m; H = 3.4 m (fb 0.3).
Power (μ = 0.001): P1 = 60²×56.8×0.001 = 204.55 W, Pm = 324.68 W (ηb 0.7, ηm 0.9); P2 = 51.14 W, Pm 81.17 W; P3 = 12.78 W, Pm 20.29 W.
Paddle: Dp = 0.75×3.1 = 2.3 m; 2 segments × 3 m; 12 blades 0.10 m wide, 0.1 m apart; blade circle dia d1 = 1.4, d2 = 1.8, d3 = 2.2 m; blade area 0.3 m²; A1 = 1.2 m² per location per segment; Ap = 2.4 m² per location per flocculator; L/W = 30 → Cd = 1.5.
n1 = 0.0767 rps (4.6 rpm); n2 = 0.0483 rps; n3 = 0.0304 rps.
Table A6 tip velocities 0.75πnd (m/s): stage1 0.253/0.325/0.398; stage2 0.159/0.205/0.251; stage3 0.100/0.129/0.158 (all ≤ 0.40 m/s). Paddle-area ratio not checked in example.

### E.1 Horizontal-flow sedimentation (A-29…A-33)
Inputs: 16,125 m³/d = 672 m³/h; T = 3 h; D = 3 m.
V = 2,016 m³; A = 672 m²; 4 basins × 168 m², B = 3 m, L = 56 m (+1 m inlet); Q/basin 4,031 m³/d = 0.047 m³/s; L/D = 18.67 (< 20); vh = 0.047/(3×3) = 0.005 m/s (< 0.02).
Sludge: manual cleaning floor slope 10 %; 0.3×56×3 = 50.4 m³; fb 0.3 m. Fig A12 depths h1 4.05, h2 4.20, h3 5.10, h4 3.30 m; L2/L1 = 2.0, L1′ 9.0, L2′ 18.0 m.
[!] From step 3 the example switches to 6 basins of 5.5×27 m, 112 m³/h (0.031 m³/s) each:
SOR all 6 = 672/6/(5.5×27) = 0.75 m/h (OK, coag. normal); one out (5) = 0.90 m/h.
Inlet baffle at 1.0 m; port velocity 0.2–0.3 (used 0.3 m/s); port area 0.10 m²; 50 mm ports → 53 needed; 12 cols @450 × 5 rows @400 = 60; ports span half water depth starting 1/4 depth below surface; head loss 1.7v²/2g = 8 mm.
Weir: 168/3 = 56 m³/m/h > 18 → fail; L = 0.2×112/(3.0×0.75) = 9.9 m; 2 troughs × 4.0 m (both sides) → 21.5 m [as printed]; 112/21.5 = 5.21 m³/m/h. H0 = (0.031/(1.833×21.5))^(2/3) = 0.009 m. Trough 300 mm: h1 = 147 mm, h2 = 150.78 mm, DT = 200 mm; trough loss 62 mm.
Channel: V 0.4 m/s, B 0.4 m → D 194 → 200 mm (+100 fb = 300 mm); R ≈ 0.0986 m; S = 0.00059 (1:1684 → 1:1600); outlet loss 253 mm.
Scour: C 0.6, h 4.6 m (printed 3.9), V basin 621 m³, empty in 30 min → q 0.345 m³/s, a 0.09 m², d 339 mm → 400 mm. Mechanical collector travel 0.30 m/min. Total head loss 9+62+253 = 324 mm.

### E.2 Lamellar (plate) clarifier (A-34/35; labelled "Annex F1" in header)
Inputs: 15,000 m³/d + 7.5 % losses = 16,125 m³/d = 671.875 m³/h; Vs = 0.6 m/h; plates 2 m × 1 m at 60°, spacing 50 mm, thickness 10 mm, 3 tanks.
Effective area 1,042 m²; projected area/plate = 2×1×cos60 = 1 m² → 1,042 plates; v = (625/3600)/1042/(0.05×2) = 0.0017 m/s [! uses 625 m³/h]; Re = 1000×0.0017×0.05/0.001791 = 48 < 800 (criterion "< 800" here vs "< 50" in §5.7.7) [! μ 0.001791 = 0 °C value]; +25 % entry/exit → 1,302.5 plates; 435/tank; tank length = 435×0.06/cos30 + 1×cos60 = 30.64 m; tank area 2×30.64 = 61.3 m²; total 183.9 m²; apparent SOR = (15000/183.9)/24 = 3.4 m/h; height 1×sin60 = 0.866 m; volume 159.26 m³; detention 15.3 min — note: "better to provide > 45 minutes" on whole tank volume incl. sludge cones.

### E.3 Hopper-bottom sludge blanket clarifier (A-36…A-41)
Inputs: 16,125 m³/d; 6 units → 112 m³/h (0.031 m³/s) each; SOR 2 m/h (range 1.25–2.5); weir ≤ 215 m³/d/m; T 2 h.
A = 56 m² → side 7.48 → B = 8.0 m; bottom b = 1.10 m; θ = 60°; hopper height (B−b)/2·tanθ = 6.0 m; full pyramid 6.9 m; small 0.95 m; frustum V = 147 m³; sludge allowance 25 % → Ve = 118 m³; clear-water zone 2.0 m → 128 m³; total 246 m³; T printed 218/112 = 1.95 h [! 246/112 = 2.2 h]; v bottom = 112/1.21 = 92.5 m/h (printed "/1.12"); v top = 112/64 = 1.75 m/h.
Inlet channel B 0.6 m, v 0.4 m/s (range 0.20–0.40) → h 0.778, D 1.10 m; weir hw = (Q/(1.84B))^(2/3) = 0.306 m. Inlet pipe 250 mm: 0.634 m/s (range 0.60–1.80), HW C 130 → 1.81 mm/m, 18.1 mm over 10 m.
Outlet: weir length 8.0 m; 4 collecting channels 0.008 m³/s each, Bc 0.25, v 0.40 → hc 0.078, hw 0.066; 24 slots 50 mm, hw 0.023, slot depth 0.06, Vs 0.26 m/s (0.20–0.40); channel depth 0.35 m, Vc 0.25 m/s; outlet channel same as inlet. Backflow check prints Dc − Ds = 0.29 m and ho − S = 0.58 m, concluding "Dc-Ds > ho-S" [! numerically false].
Scour pipe 250 mm, peak waste 20 % → 3,225 m³/d = 0.037 m³/s, 0.76 m/s, 2.54 mm/m, 15.24 mm over 6 m.
Sludge cones: 2; peak sludge 1.5 % → 242 m³/d → 5.04 m³/h per cone; 2 h storage 10.08 m³; cone height 2.0, b 1.10, 60° → top 3.41 m; V = 11.06 m³ (≥ 10.08 OK) [formula printed "2×B²" but result uses full-pyramid height ≈ 2.95 m].

### E.4 DAF (A-42…A-46) [! example mixes 3/2 units and "6/5 in operation"; 251 vs 408 m³/h]
Inputs: 15,000 m³/d ×1.075 = 672 m³/h; recycle 12 % (MWH 6–12 %) → 753 m³/h; 3 units (min 2 "shall"), 2 in operation min.
Flow/unit 251 (3 op) / 376 (2 op) m³/h. Targets: nominal rise ≤ 9 m/h, max ≤ 12 m/h (excl. recycle). Area 408/9 = 28 m²; 376.32/12 = 31 m².
L (headwall–float beach) 6.5 m ("shall be < 11 m"); W 5.25 m ("5.3"); L:W = 1.24 ("shall be 1–1.25"); area 34.125 m²; total 102.38 m² ("90–110 m²"); SLR 376.32/34.125 = 11.03 m/h ("shall be 10–20 m/h"); max hydraulic capacity/basin 0.10 m³/s ("shall be 0.25–0.5 m³/s" – not met); depth 3.0 m ("2.5–3 m"); cross-flow velocity 376.32/(5.25×3) = 23.9 m/h ("18–100 m/h").
Volume 102.4 m³; residence 24.5 min (408) / 16.3 min (376.32). Rise rates 7.4 m/h (< 9) and 11.0 m/h (< 12).
Voids: under head wall vmax 0.04 m/s → 0.498 → 0.500 m; separation-zone exit 0.05 m/s → 0.398 → 0.400 m; over angled baffle 0.015 m/s (55 m/h) → 1.303 → 1.310 m.
Contact zone: baffle vertical height 3 − 1.31 = 1.69 m; angle 60° ("60–90°"); top width 1.25 m; bottom width 1.25 − 1.69/tan60 = 0.275 → 0.280 m; volume 6.8 m³; detention 65 s ("60–240 s") [printed formula uses 8.4]; contact loading 376.32/(5.25×1.25) = 57.3 m/h ("35–100 m/h"); L:W excl. contact zone 1.00.
Sludge: DS = X+S+H+C+Fe+Mn+P+L+Y with factors alum 0.26, SS 1.5 × NTU, colour 0.2 × Hazen, chlorophyll 0.2, Fe 1.9, Mn 1.6, PAC 1, lime 1, polymer 1. Avg inputs: alum 20 mg/L, 50 NTU, 300 Hazen, chl 1 mg/L, Fe 0.3, Mn 0.10 → 5.2+75+60+0.2+0.6+0.05 = 141.05 mg/L [Mn printed 0.05]; max (alum 50, 200 NTU, 1300 Hazen, chl 600, Fe 1.0, Mn 0.30) → 695.01 mg/L. Daily avg = 141.05×672×24/1000 = 2,274.85 kg/d; solids loading 0.93 (3 units) / 1.39 (2 units) kg/m²/h; float 1 % (10 g/L) → 227.39 m³/d; 3 h emptying → 28.4 m³.

---
## 7. App mapping (criteria keys → D3 rule)
| Key | D3 value (clause, page) | Note |
|---|---|---|
| coag.pH | Alum 6.0–7.0 (§5.4.4.1 p5-40); min residual Al 6.0–6.5 (p5-45); Fe 5.0–11.0; colour 4.5–5.5 (p5-39) | pH adjust before coagulant ("shall") |
| coag.resAlk | No value in §5.4. Use §3.4.2.1 30–400 mg/L (p3-13) + alum stoichiometry (p5-174) | flag source outside range |
| coag.solConc | Alum 3–7 %; PACl 2–10 %; lime 2/3–10 %; KMnO4 2 % (Tbl 5-11 p5-44) | |
| coag.storage | ≥ 1 month adjacent to feeder ("should"); day tanks 12–24 h (p5-44) | duplicate feeders "must" |
| coag.turndown | Not numeric here; VSD 1:4 is for flocculators (p5-56) | see Ch.6 |
| rm.G | 500–1,000 s⁻¹ (≤ 3,500 special) (p5-45/49); package ≈ 1,000 (p5-78) | |
| rm.t | < 60 s; mechanical 30–60 s (p5-45/49) | |
| rm.Fr | No criterion stated; Annex C.1 reports F = 0.388 upstream, 1.32 throat; submergence Hb/Ha ≤ 0.60/0.70/0.80 (Tbl A4) | add rm.submergence |
| rm.Re | > 10,000 turbulent (Annex C.2); laminar < 10 (to 100) (p5-47) | |
| fl.G | Hydraulic 10–100 (10 < G < 75; typ 15–90; taper 75→10–15) (p5-53/55); paddle 50–10; turbine 70–10 (Tbl 5-16) | |
| fl.t | Hydraulic 20–30 min (≥ 20 "should") (p5-54/55); paddle 30–40; turbine 20–40 min; DAF floc 15–30 min | |
| fl.Gt | 10⁴–10⁵ (Annex D.1/D.2 only) | |
| fl.v | 0.1–0.3 m/s in channels and to sed tank (p5-54/55) | Tbl 5-16 "max flow velocity" 1.0 / 2–3 m/s is element velocity |
| fl.spacing | ≥ 45 cm; end clearance 1–1.5 s and ≥ 60 cm; depth ≥ 1.0 m; over-under depth 2–3 s (Tbl 5-15) | Annex D.1 violates |
| fl.tip | ≤ 0.4 m/s (p5-52; Annex D.2 alum), 0.5 m/s lime softening; list p5-57 says 4 / 2 m/s [!] | use 0.4 |
| fl.paddleRatio | 5–20 % (Tbl 5-16 paddle); board area/tank section < 20 % (p5-57); turbine 0.1–0.2 | |
| fl.hl | Hydraulic typical total 0.5 m (p5-54); per baffle 3.2v²/2g (D.1) | D.1 total 0.167 m |
| sed.sor | Tbl 5-20 (m/h): coag 0.75 normal / 1.00 easy / 0.40 bad → 18/24/9.6 m³/m²/d; aids 1.13/1.50/0.75; none 0.50/1.00/0.10 | design floc Vs 1.0 m/h |
| sed.hrt | 2–4 h coagulated; 4–6 h pre-settling (p5-63) | |
| sed.depth | 2.5–4.0 m + 0.15–0.3 sludge + 0.3 fb (p5-63) | manual cleaning +1.2–1.5 m |
| sed.LW | 3–6 (p5-63) | |
| sed.LD | 20 (basins > 60 m long) (p5-63); Annex E.1 uses ≤ 20 | ambiguous |
| sed.vh | < 0.02 m/s (p5-63); Sanks 0.005–0.03 | |
| sed.weir | < 18 m³/m/h = 432 m³/m/d (p5-63); pyramid < 9 m³/m/h (≈ 215 m³/m/d); tube launder 12.5 m³/m/h | |
| sed.Re / sed.Fr | No criteria for conventional basins in §5.7; settler Re < 50, Fr > 10⁻⁵ (p5-76) | |
| sed.portV | Perforated baffle ports 0.2–0.3 m/s (E.1); inlet pipe/channel/outlet 0.15–0.4 m/s (p5-63); sludge drains > 1.4 m/s | |
| sed.circD | < 60 m (p5-63) | |
| tube.loading | Projected 1.2 m/h (1–2); plates 0.7–1.7 m/h ≡ 5–15 m/h basin; settling-zone 2.5–7.5 m/h; tubes "normally 9 m/h"; package ≈ 6 m/h | |
| tube.Re | < 50 (p5-76); Annex E.2 < 800 | |

New parameters the app should add:
- rm.Gt 30,000–60,000; rm.mech geometry (D/W = 2, impeller 50–80 % W, baffles 8–10 % W, 4/6 baffles, ≥ 2 tanks); rm.static headloss ≈ 0.5 m, L = 2–4 D; rm.jetFlow ≈ 10 %; rm.submergence (Tbl A4).
- fl.stages (paddle 3–6, turbine 2–4); fl.baffleCount 12–20; fl.vsd 1:4; fl.wheel (dia 3–4 m, wall clearance 0.7 m, stage clearance 1 m).
- sed.slope ≥ 5 % (2 % with scrapers); sed.nBasins ≥ 2; sed.desludgeDia ≥ 300 / 200–300 mm.
- tube.angle (≥ 55° plates, ≥ 60° tubes; 45–60°; > 50° up-flow), tube.spacing (≥ 4 cm; 5 cm), tube.length (1–2 m; 1 m package), tube.velocity 0.0025–0.0033 m/s, tube.coverage (≤ 0.75 tubes / 0.95 plates; installation 80–90 %), tube.Fr > 10⁻⁵, tube.clearBelow ≥ 3 m / above 2–3 m, tube.stilling 25 %, launder spacing 1.5 m.
- sbc.* (pyramid blanket): SOR 1.25–2.5 m/h, HRT 2 h, weir < 9 m³/m/h, hopper 60°.
- scc.* (solids contact, "shall"): turbidity 10–1,000, SOR 24–36 [unit!], weir 8–15, HRT 1.5–2.5 h, > 1 tank, recirc 1–4× / 8–20×.
- pulsator.*: upflow ≤ 2.4 m/h, HRT 2 h; super-pulsator 6–7.3 m/h, 1 h; Tbl 5-24 velocities; inlet ≤ 1,000 NTU.
- daf.*: floc t 15–30 min; tank HRT 10–20 min; SLR 5–15 (10–20 E.4; high-rate 30–50) m/h; nominal rise ≤ 9, max ≤ 12 m/h; saturator 450–620 kPa; recycle 5–15 %; contact t 60–240 s; contact loading 35–100 m/h; L:W 1–1.25; L < 11 m; depth 2.5–3 m; cross-flow 18–100 m/h; headwall void ≤ 0.04 m/s; exit ≤ 0.05 m/s; baffle clearance ≤ 0.015 m/s; baffle angle 60–90°; ≥ 2 units; raw turbidity ≤ 100 NTU.
- sludge.*: factors (alum 0.26 / 0.33 actual; Fe2(SO4)3 0.54 / 0.59; FeCl3 0.66 / 0.48; TSS/NTU 0.5–2, E.4 uses 1.5; colour 0.2; Fe 1.9; Mn 1.6), solids 0.5–2 %, DAF float 1–6 %.

## 8. Errata / ambiguities to respect in code
1. Paddle tip speed 4 / 2 m/s (p5-57) vs 0.4 m/s (p5-52, A-28).
2. Solids-contact SOR "24–36 m³/m²/hr" and weir "8–15 m³/m²/hr" (p5-69) – units doubtful.
3. ν = 0.898×10⁻⁶ m²/s labelled 25 °C (p5-55) and 20 °C (A-19); μ = 0.001791 (0 °C) used in E.2.
4. G formula P stated in kW (p5-46) – use W.
5. Settler Re < 50 (p5-76) vs < 800 (A-34).
6. Annex D.1 baffle spacing < 45 cm and 49 baffles vs Table 5-15 / 12–20.
7. Annex E.1, E.3, E.4 internal inconsistencies (basin count, flows, T = 218 vs 246 m³, unit counts) – regression-test the individual formula steps, not cross-step totals.
8. Inlet velocity "0.7 mm/min or less" for settler basins (p5-76) – likely unit error.
9. DAF float "0.2 6 %" (p5-83) – likely 0.2–6 %.
10. Table 5-16 (p5-56) vs Annex D.2 copy (G 50–5/80–10, stages 2–6).
# D3 Manual (NWSDB Rev 01, Nov 2020) – Part 3: Filtration (§5.8–5.13, Annex F.1–F.3)

Source labels = printed page numbers. "list" = the "Common criteria for rapid gravity filters" list in §5.9.1 (pp 5-92/5-93). The manual mixes "shall/must/should" loosely; the modal verb is noted where the manual uses one. ⚠ = manual inconsistency or typo, flagged instead of corrected.

## 1. Filtration – general (§5.8)

- Clarifier effluent 2–5 NTU can be improved to 0.1–1.0 NTU by conventional sand filtration (typical) — D3 §5.8.1 (p 5-86)
- Rapid filtration recommended for medium/large schemes with skilled operators — §5.8.2 (p 5-87)
- RSF **must** have efficient pre-treatment when turbidity > 5 NTU — §5.8.2 (p 5-87)
- Media must allow solids to penetrate 50–100 mm. Most SS are trapped in the top 25–50 mm — §5.8.2 (p 5-87)
- **Filtered-water turbidity: filters must reduce turbidity to < 0.3 NTU in 95 % of monthly measurements and must never exceed 1 NTU in any sample** — §5.8.3 (p 5-87)
- Backwash trigger reference: "exceed the standard of 0.2 NTU … WHO guideline" — §5.9.12.1 (p 5-113) (⚠ conflicts with the 0.3/1 NTU rule above)
- Regulatory removal: ≥ 99.9 % Giardia cysts, ≥ 99.99 % viruses. Conventional treatment ≥ 99 % oocysts — §5.8.3 (p 5-88)
- Typical RSF pore size ≈ 50 µm (52 µm in Fig 5-67, grain 400 µm). Particles to remove are 1–30 µm. Minimum-removal particle size ≈ 1 µm — §5.8.4 (pp 5-88/89)
- Filterability number (Ives): **F = H·C / (C0·v·t)**, where H/t = rate of rise of head loss, C = mean filtrate quality over t, C0 = inlet quality, v = approach velocity. It has no absolute criterion: lowest F among tests = optimum. It is a screening tool, not a design tool — §5.8.5 (p 5-90/91)

### Table 5-25 Classification (p 5-87)
| Basis | Options |
|---|---|
| Mode of action | Deep-bed / surface |
| Rate | Rapid / slow |
| Operation | Semi-continuous / continuous |
| Medium | single / dual / multi |
| Hydraulics | Gravity / pressure |
| Flow direction | Down-flow / up-flow |
| Cleaning | Backwash (water or air+water) / manual |
| Rate control | Constant-rate / variable declining-rate |

### Table 5-26 Characteristics of sand filters (p 5-87) (text cites it as "Table 5-24" ⚠)
| Characteristic | Slow | Rapid – Gravity | Rapid – Pressure |
|---|---|---|---|
| Filtration rate | 0.1–0.4 m³/m²/h | 5–15 m³/m²/h | (same) |
| Size of bed | Large (2000 m²) | Small (100 m²) | |
| Depth of bed | 0.3 m gravel, 1 m sand unstratified | 0.5 m gravel, 0.7–1.0 m sand stratified | |
| Sand ES d10 | 0.1–0.3 mm | 0.4–1.2 mm | |
| UC | 1.5–2.5 | 1.2–1.7 | |
| Head loss | up to 1 m | up to 3 m | |
| Length of run | 20–90 days | 1–7 days | |
| Cleaning | Skimming (scrape top layer & wash) | Backwash with air or mechanical scour | |
| Wash-water consumption | 0.2–0.6 % of filtered water | 1–6 % of filtered water | |
| SS penetration | Superficial | Deep | |
| Mechanism | Physical + biological + biochemical | Physical + chemical | |
| Removes | Fine particles, bacteria | Fine particles, flocs | |
| Oxidizes | Organics (THM), NH3→NO3 | Fe, Mn, NH3→NO3 | |
| Pre-treatment by coagulation | No | Yes | Yes |
| Direct on main | No | No | Yes |
| Easily extended | No | No | Yes |
| Covered | No | Optional | Yes |
| Visible operation | Yes | Yes | No |
| Capital cost | Higher | High | Medium |
| Operating cost | Low | High | Higher |
| Flow control | Constant rate | Constant rate, Declining rate | |

## 2. Rapid sand filters (§5.9)

### 2.1 General / run termination (§5.9, p 5-91/92)
- Rate 5–15 m/h — §5.9 (p 5-91)
- Pressure filters are restricted for surface/polluted waters and after lime-soda softening — §5.9 (p 5-91); §5.10.3 (p 5-132)
- Backwash at the first of these: head loss reaches the available limit or a set limit, **usually 2.4–3.0 m**; filtrate quality deteriorates or hits a pre-set limit; max time **usually 3–4 days** — §5.9 (p 5-91)
- Typical filter cycle 12–96 h — p 5-92
- Media depth "usually 600–750 mm" sand or anthracite. Best determined by pilot test — §5.9.1 (p 5-92)

### 2.2 "Common criteria for rapid gravity filters" (§5.9.1, pp 5-92/93, verified on page image)
| Parameter | Value |
|---|---|
| Minimum no. of beds | 2 |
| Influent turbidity | 5 NTU (< 1 NTU preferred) after pre-treatment |
| Unit area | up to 140 m² |
| Filtration rate | "40–60 m³/m²/hr" ⚠ as printed. This conflicts with 5–15 m/h everywhere else and is a likely typo. Do not use |
| Head loss | up to 2.5 m |
| Filter run | 1–3 days |
| Wash water consumption | 1–6 % of filtered water |
| Depth of filter | 0.3–0.6 m gravel (2–50 mm graded); 0.6–1.0 m stratified sand |
| Sand spec | ES 0.4–1.2 mm; UC 1.2–2.0; gravel ES 2–50 mm |
| Min depth of water when operating | 1.0 m |
| Minimum inlet velocity | 0.6 m/s |
| Min ratio underdrain area / filter area | 0.003 |
| Backwash velocity | 10–15 mm/s (36–54 m/h) |
| Minimum backwash time | 5 min |
| Wash water basin | 2 (or min 1) filter washes of 10 min, refilled in 60 min each |
| Air scour | 0.015–0.025 m³/m²/s (54–90 m³/m²/h) for several minutes before backwash, 20–35 kN/m². Alternative: mechanical rake in sand at 1–10 rev/min |
| Surface wash | additional 1–20 mm/s jetted onto sand surface at 150–450 kN/m² |
| Head loss in wash-water system | 8–15 m |
| Wash-water troughs | clear of expanded sand; **max horizontal spacing 2 m**; tops level; carry max flow with **50 mm freeboard** |
| Velocity in wash-water outlet | 2.4–3.6 m/s |
| L/B of filter bed | 1.25–1.33 |
| "Minimum depth of filter bed" | 2.5 m (⚠ wording: from context this is the filter-box depth) |
| Filter controls | sampling taps, loss-of-head gauge, rate-of-flow control, wash-line rate indicator, sand-expansion gauge, backwash flow meter |
| Underdrains | central manifold + laterals **only in very small WTP/RWS schemes**, otherwise false bottom with nozzles |
| *Manifold & laterals:* min underdrain dia | 20 cm |
| perforation dia | 6–12 mm (staggered, slight angle to vertical axis) |
| perforation spacing along laterals | 7.5 cm for 6 mm; 20 cm for 12 mm |
| total perforation area / total lateral c/s area | 0.25 (6 mm); 0.50 (12 mm) |
| total perforation area / filter area | 0.003 |
| lateral L/D | 60 |
| max lateral spacing | 30 cm |
| manifold c/s area | 1.5–2.0 × total lateral area |
| *False bottom:* nozzles | 55 nos/m² |
| Velocity of filtered-water outlet | 1.0–1.8 m/s |
| Air inject | 2–3 min |
| Total wash water | 1.5–2.5 % of production |
| Backwash power (blower + pump) | 1.5 kW/m² |
| Bed expansion | 15–20 % of depth (water only); typically < 5 % for 5 minutes (as printed) |

### 2.3 Table 5-27 / 5-32 Air-scour & water backwash rates (p 5-94 imperial+SI; p 5-123 SI)
| Medium | Sequence | Air scfm/ft² (m/h) | Water gpm/ft² (m/h) |
|---|---|---|---|
| Fine sand 0.5 mm ES | Air first / Water second | 2–3 (37–55) | 15 (37) |
| Fine dual & multi/triple media, 1.0 mm ES anthracite | Air first / Water second | 3–4 (55–73) | 15–20 (37–49) |
| Coarse dual media 1.5 mm ES anthracite | Air first; Air+water on rising level; Water third | 4–5 (73–91); 4–5 (73–91) | –; 10 (24); 25 (61) |
| Coarse sand 1.0 mm ES | Air+water simultaneously; Water second | 3–4 (55–73) | 6–7 (15–17); same or double rate |
| Coarse sand 2.0 mm ES | Air+water simultaneously; Water second | 6–8 (110–146) | 10–12 (24–29); same or double |
| Coarse anthracite 1.5 mm ES | Air+water simultaneously; Water second | 3–5 (55–91) | 8–10 (20–24); same or double |
Note: water rates for dual/triple media vary with temperature and should fluidize the bed to re-stratify it (p 5-123).
- Collapse-pulsing (Amirtharajah 1984): **0.45·Qa² + 100·(V/Vmf) = 41.9**, Qa = air scfm/ft², V/Vmf = superficial water velocity / Vmf (Vmf based on d60). Valid over air 37–110 m/h. Use tabulated values until research reconciles the two — §5.9.12.1 (p 5-123)
- Typical wash-water volume **4–8 m³/m² per wash** — p 5-124

### 2.4 Arrangement, number, size, box (§5.9.2)
- **N = 1.2·√Q**, Q in **mgd** (US; 1 mgd = 3,785 m³/d) (Kawamura 1999) — §5.9.2.2 (p 5-95)
- Min **2 units** for small plants (≤ 2 mgd). Min **4** for medium/large plants > 15 mgd. Design must cater for max flow with **one filter out for maintenance and another backwashing** — p 5-95. (Annex F.1 note: min 4 if > 2 mgd per Kawamura; "minimum 3 filters advisable" — p A-47)
- 4 filters with one washing → rate on the others +33 % — p 5-95
- Self-backwashing type: **min 4 filters regardless of size, preferably 6** — p 5-96. §5.9.12.3: 4–6 filters, supernatant depth 3–4 m (p 5-116)
- Practical max gravity filter ≈ **100 m²** (plants > 10 mgd) and ≈ **50 m²** (< 10 mgd) — §5.9.2.3 (p 5-96). (List: up to 140 m²)
- Pressure filters: largest standard tank 3.7 m → vertical ≤ ~10 m² media. Horizontal normally ≤ 12 m long — p 5-96
- Box depth factors: available head, water depth, fixed losses, media loss (pilot or Kozeny), curve shape, rate, weir elevation. Avoid negative pressure — §5.9.2.4 (p 5-96)
- Avoid a clearwell under the pipe gallery and common walls between filtered and unfiltered water. Use a false floor in the wash-water gullet — p 5-94

### 2.5 Underdrains & gravel (§5.9.3)
- Pipe laterals: perforations 6–13 mm on 8–30 cm spacing, on the underside — §5.9.3.1 (p 5-97)
- Ratios: total orifice area / bed area **0.0015–0.005 : 1**; lateral c/s area / orifice area served **2–4 : 1**; manifold c/s area / laterals served **1.5–3 : 1** — p 5-97
- Laterals at about the same spacing as orifices (8–30 cm). **≈ 45 cm support gravel** covers lateral network, **3–5 graded layers, 38 → 3 mm** — p 5-97
- Block underdrain (air/water): IMS cap openings ≈ 6 mm — §5.9.3.2 (p 5-98)
- False bottom (Leopold/Wheeler type): depressions filled with 25–38 mm gravel. Replace the last silica layer with coarse garnet in mixed-media beds — p 5-99
- Nozzle false floor 0.3–0.6 m above filter bottom. Nozzles at "about 9 to 150 cm centres" (as printed ⚠). Coarse openings ≈ 6 mm or fine (media-retaining). Stem protrudes 15–23 cm. Bottom resistance for uniform distribution **0.5–2 m** — §5.9.3.3 (p 5-100)
- **Nozzles 50–90 per m²** (depends on max backwash velocity). **Slot width 0.5–1.0 mm**, smaller than the smallest media grain. Support layer generally not needed — p 5-101
- Short-stem nozzles without air holes/slots are unsuitable for air scour — p 5-100
- Porous-bottom plates: unsuitable for softening or Fe/Mn plants — §5.9.3.4 (p 5-101)
- **Gravel grading rules (Huisman 1974)** — §5.9.3.5 (p 5-102):
  - each layer as uniform as possible: d90/d10 ≤ 1.414 (USA: passing/retaining sieve ratio 2)
  - bottom layer lower size limit = 2–3 × underdrain orifice dia
  - top layer lower size limit = 4–4.5 × ES of media retained
  - upper limit of the coarser layer = 4 × lower limit of the adjacent finer layer
  - each layer ≥ 7 cm thick or 3 × its upper size limit, whichever is greater
- Underdrain must be test-backwashed before gravel/media placement. Design the false-bottom slab for loads from both sides (media + backwash uplift) and for shear — p 5-102

### 2.6 Backwash troughs (§5.9.4)
- Wash-water velocity drops by ×2.5 on leaving the bed. Wash ≈ 4 displacement volumes of (bed voids + water up to overflow) — p 5-102
- Free fall into troughs at max backwash rate even at the upstream end. All trough edges at one level — p 5-103
- Expanded media surface **must stay below trough bottoms** — p 5-103
- Trough edge height above media: traditional **0.75–0.9 m**. With anthracite raise to **1.1–1.2 m** — p 5-103
- Table 5-30 (p 5-117), backwash alternatives:

| | With fluidization | Without fluidization |
|---|---|---|
| Applications | fine sand, dual, triple media | coarse mono-medium sand or anthracite |
| Routines | water + surface wash; or air first, water second (no air during overflow) | air + water simultaneously during overflow, finish with water only |
| Fluidization | yes | no |
| Bed expansion | 15–30 % | nil |
| Wash troughs | usually used | usually not used |
| Horizontal travel to overflow | up to 0.9 m | up to 4 m |
| Vertical height to overflow | 0.75–0.90 m | 0.5 m |

- Coarse sand without troughs: overflow wall ≥ 0.5 m above sand, top edge sloped 45° toward the bed. Use baffled troughs for anthracite — p 5-121

### 2.7 Media (§5.9.5)
Table 5-28 Multilayer media (p 5-104):
| Media | ES mm | SG | Loose-bed porosity | Sphericity |
|---|---|---|---|---|
| Anthracite | 0.7–1.7 | 1.45–1.73 | 0.56–0.60 | 0.46–0.60 |
| Silica sand | 0.3–0.7 | 2.65 | 0.42–0.47 | 0.70–0.80 |
| Garnet | 0.4–0.6 | 3.6–4.20 | 0.45–0.55 | 0.60 |
| GAC | 0.38–0.76 | 1.30–1.50 | 0.50 | 0.75 |
- Conventional RSF sand: ES 0.6 mm, UC 1.5–2.0 — p 5-104
- Anthracite SG 1.35–1.70; sand SG 2.65–2.70 — p 5-104
- **Small dual-media RSF: 0.3–0.5 m sand ES 0.4–0.7 mm under 0.5–0.7 m anthracite ES 1.0–1.6 mm** — p 5-104
- Sri Lanka pilot: 50–60 cm coconut-shell charcoal (SG 1.42, 0.83–1.4 mm) over 25 cm sand (0.5–1.44 mm) gave good results — p 5-104
- Coarse-media option: narrowly graded sand ES 2 mm, deeper (vs ES 0.45–0.55, UC ≈ 1.5). Needs air-water backwash — p 5-104
- Dual media with charcoal: provide a high-pressure hose jet into the expanded bed (mudballs) — p 5-105
- Particle removal falls with grain dia up to 2 mm (70 → 40 %) — p 5-103 (as printed)

### 2.8 Rate control (§5.9.6–5.9.9)
- Equal-rate: variable-level influent flow splitting (inlet weir/orifice above max WL, no instruments); proportional-level influent splitting (LT+LC+modulating valve+HL instrument per filter); proportional-level equal-rate (flow meter + controller + valve per filter, one channel LT). Declining-rate: variable-level declining rate (submerged inlet below LWL, common WL, fixed flow restrictor per filter, effluent above media); proportional-level declining rate — pp 5-105–5-109
- Downstream control point (weir) **above top of media** → no negative head. Constant-rate systems consume the full head. Declining-rate needs less total head — §5.9.9 (p 5-109)
- Valve drives should be electric motors (not pneumatic/hydraulic) — p 5-109
- Selection: small non-automated plants with **≤ 4 filters** and unskilled operators → variable-level influent flow splitting. Larger non-automated → variable-level declining rate. Butterfly valves preferred over gate valves — §5.9.9.1 (p 5-110)
- Filter-to-waste mode is the best answer to cyst passage during ripening — p 5-110
- Declining-rate (F.1 ex 2): rate varies **50 %–150 % of average** — p A-64

### 2.9 Up-flow & direct filtration (§5.9.10–5.9.11)
- Up-flow: only for low/medium turbidity **< 80 units**. Restraining grid spacing = **100 × sand grain dia** just below the top of the bed. Service rate **290–590 m³/m²/d**. Up-flow filters **shall be covered** — p 5-110
- Direct filtration: recommended for raw turbidity **up to 20 NTU and colour up to 30**. Coagulant dosing required when turbidity > 5 NTU. "30–60 min contact basin between flocculation and filtration" (as printed) — pp 5-111
- AWWA "perfect candidate": colour < 40 CU, turbidity < 5 NTU, algae < 2000 asu/mL, Fe < 0.3 mg/L, Mn < 0.05 mg/L (1 asu = 20×20 µm ≈ 0.1 µg/L chl-a per asu/mL) — p 5-111
- Dose by full-length filter runs (jar test misleading); screen with filter-paper test (Annex F.3) — p 5-112

### 2.10 Backwashing (§5.9.12)
- Floc settling velocity 2.5–25 cm/min. **Minimum peak wash rinse rate 30 cm/min** (= 18 m/h) — p 5-112
- Media settling velocity at 20 °C: **Vs = 10·d60 (sand SG 2.61); Vs = 4.7·d60 (anthracite SG 1.5)** (Newton; units not stated ⚠) — p 5-112
- Air wash design **0.6–1.5 m³ air per m²** filter area — p 5-112
- Backwash when HL limit, turbidity breakthrough or set run hours is reached. Always backwash after being out of service — p 5-113
- Runs > 1 week not recommended (bed packing) — p 5-113
- Procedure: drain to **150 mm above media**; surface wash several min; ramp to full flow over **> 1 min**; expansion **20–40 %** of bed volume; wash **10–15 min**; open valves slowly — p 5-113. Ramp-up **≥ 30 s** (§5.9.12.5 p 5-117)
- Stop the wash when waste wash water is ≈ **10 NTU** — p 5-117
- Max grain shear at 80–100 % expansion. Optimal < 20 %. Water-only wash normally **20–50 %**. **High-rate wash = ≥ 10 % expansion; low-rate < 10 %** — §5.9.12.5 (p 5-117)
- Table 5-31 (p 5-118):

| | No aux | + surface wash | + air scour (air first) | Simultaneous air+water (no fluidization) |
|---|---|---|---|---|
| Wash effectiveness | Weak | Fair | Fair | Good |
| Solids transport | Fair | Fair | Fair | Good |
| Fine media / dual-triple / graded gravel compatible | Yes | Yes | Yes | No |
| Media loss potential | Nil | Yes, mainly coal | Yes unless used properly | Major unless used properly |

- Surface wash: ≈ 5 cm above unexpanded bed; orifices 2–3 mm, 15–45° below horizontal; 350–520 kPa; fixed 4.9–9.8 m/h, rotary 1.2–2.4 m/h; rotary ≤ ≈ 4 m dia. Run 1–2 min before upflow and stop 2–3 min before the end. Backflow preventer **must** be provided — pp 5-118/119
- Air-scour sequences — pp 5-120/121:
  - (a) air alone, then water (fine sand/dual/triple): lower WL ≈ 15 cm below overflow, air 1–2 min, low-rate water to expel air, then fluidize.
  - (b) simultaneous on rising level (fine sand, dual, triple, coarse anthracite): WL just above media, air 1–2 min, add water < ½ Vmf, shut air ≈ 15 cm below overflow, then fluidize.
  - (c) simultaneous during overflow (coarse ≥ 1.0 mm ES mono sand/anthracite): air + water < ½ Vmf for ≈ 10 min, then water only.
- Expansion with full fluidization: **15–30 %** — §5.9.12.9 (p 5-121)
- Fluidization transitional if Re > 6 — p 5-121
- **Min backwash rate > Vmf of d90. Suggested 1.3·Vmf90** (closer to Vmf to protect gravel). UC < 1.7, often < 1.5 — §5.9.12.11 (p 5-122)
- Continuous (travelling-hood) backwash media 0.8–0.9 m — p 5-123
- Washwater source options and Table 5-29 (unchlorinated vs chlorinated backwash) are qualitative. Do not recycle waste backwash with toxin/T&O algae unless destruction processes follow — pp 5-113–5-115

### 2.11 O&M, efficiency (§5.9.13)
- Ripening lasts 5–30 min. Mitigate with filter-to-waste, slow rate increase, resting, polymer in the wash water — p 5-124
- **Efficiency: Re/Ro = (UFRV − UBWV)/UFRV**. Example: 10 m/h × 48 h with UBWV 12,200 L/m² → Re 9.5 m/h, efficiency 97 % (as printed; arithmetic gives 97.5 %) — p 5-124/125
- **Net filter production (UFRV − UBWV): well-designed 306,000–509,000 L/m² (306–509 m³/m²); ≤ 204,000 L/m² indicates problems** — p 5-125. (⚠ worked example "10 m/h × 48 h − 105 L/m² = 3,946 L/m²" is arithmetically wrong)
- Pretreated (settled) water turbidity **≤ ≈ 4 NTU, < 2 NTU preferred**. ≤ 1 NTU may mean inefficient filtration — §5.9.13.6 (p 5-125)
- Initial filling rate **≤ 12.2 m/h**. Fill from the bottom — p 5-126/127
- **Min water depth over media 1 m (recommended). Modern high-rate plants ≥ 1.5 m** to prevent air binding — §5.9.13.9 (p 5-126)
- Media loss 5–7 %/yr for dual/mixed media. Performance declines when loss > 20 % of depth. Run 2 full washes after media top-up — p 5-127

### 2.12 Backwash recovery, upgrading (§5.9.14–15)
- Waste wash water = **1–5 % of production**. Return supernatant at **≤ 10 % of raw inflow**, equalized over 24 h (or the operating period) — pp 5-127/128
- Dual-media conversion: gravel 35–40 cm + sand 25 cm + anthracite 50–60 cm = 1.10–1.20 m, + 50 cm expansion/safety → **≥ 1.75 m box below wash-water overflow** — p 5-128
- Field rate test: time a 15–20 cm drop in WL. Backwash test: filter down to 10 cm above the bed, then time the rise — p 5-128
- **Effective backwash rate 30–36 m³/h per m²**. Existing plants probably < 30 — p 5-129
- Table 5-33 (p 5-129, verified):

| Rate m³/m²/d | Run h | Wash rate m³/m²/min | Wash water m³/m²/d | Filtered lost (30 min downtime/wash) m³/m² | Total lost m³/m² | Lost % | Net m³/m²/d |
|---|---|---|---|---|---|---|---|
| 100 | 72 | 0.5 | 1.67 | 0.7 | 2.37 | 2.37 | 97.63 |
| 234 | 8 | 0.5 | 15.00 | 14.6 | 29.60 | 12.65 | 204.40 |
- Direct-filtration conversion test: take units out until runs < 12 h or effluent > 4.5 NTU (as printed) — p 5-129
- Dolomite filters: remineralisation after RO. No numeric criteria — §5.9.16 (p 5-130)

## 3. Pressure filters (§5.10)
- Use the same media, rates and terminal HL as gravity filters. Do not push higher rates/HL unless no harm to quality is shown — p 5-131
- Vertical: dia 0.3–3 m, up to 19 L/s at **175 m³/m²/d**. Horizontal: usually 2.4 m dia, "10–7.5 m" long (as printed), 12.5–38 L/s, compartmented. Multi-cell horizontal tanks have 4–5 cells — pp 5-131
- Some agencies exclude pressure filters for surface/polluted/lime-softened water — p 5-132
- Water-only backwash. Table 5-34 (15–25 °C), p 5-132:

| Sand ES mm | 0.35 | 0.55 | 0.75 | 0.95 |
|---|---|---|---|---|
| Rate m/h | 25–35 | 40–50 | 55–70 | 70–90 |
- Wash time 5–8 min — p 5-133
- A flow meter on each filter is desirable — p 5-133

## 4. Precoat / DE filters (§5.11)
- DE mean 23.5 µm (80 % in 5–64 µm). Cake pore ≈ 7 µm. Captures ≥ ≈ 2 µm — p 5-134
- Precoat ≈ **3 mm** thick. **Precoat rate 1 kg/m² recommended** — pp 5-134/135
- Suitable raw water (direct in-line): turbidity ≤ 10 NTU (inorganic) or ≤ 5 NTU (organic/algal), acceptable colour — p 5-135
- Giardia up to 6-log. Virus rarely > 1-log — p 5-135
- Precoat slurry ≥ 12 % recirculated at **2.4–3.7 m/h**. **Body feed 1–10 mg/L DE per 1 mg/L SS** (compressible Al/Fe floc needs the highest ratio) — pp 5-137/138
- Pilot test up to 4 months — p 5-136

## 5. Slow sand filtration (§5.12)
- Rate **0.1–0.4 m/h**. Cycle 1–6 months. Cleaning removes the dirty layer "along with 130–500 mm of sand" (as printed) — p 5-138
- **Pre-treatment necessary when raw-water maximum turbidity ≥ 20 NTU. Should be considered at 10–20 NTU** — p 5-138
- **Limited to max 50 NTU with pre-treatment.** Most practical < 50 NTU (higher tolerated for a few days) — pp 5-139/140
- **Best purification < 10 NTU** — §5.12.3 (p 5-140)
- Land ≈ ½ acre per 1000 m³/d. Removal: bacteria 2-log, E. coli and virus 3-log (p 5-139). Total bacteria ×10³–10⁴, E. coli ×10²–10³ (p 5-140)
- Purification zone 0.3–0.4 m deep. Impurities removed in the top 0.5–2 cm — p 5-139/140
- Ripening: new filter ≈ 3 weeks; after cleaning 1–2 days. No ammonia in the filtrate means ripening is complete — p 5-140
- Pilot test up to 1 year — p 5-141

Table 5-35 Source-water limits for conventional SSF (p 5-141, verified):
| Parameter | Recommended limit |
|---|---|
| Turbidity | 5–10 NTU (clay presence must be determined) |
| Algae | 200,000 /L |
| True colour | 15–25 Pt-Co |
| DOC | 2.5–3.0 mg/L |
| UV254 | 0.080 /cm |
| Dissolved oxygen | 6 mg/L |
| Phosphorus (PO4) | 30 µg/L |
| Ammonia (NH3) | 3 mg/L |
| Iron | < 1 mg/L |
| Manganese | < 1 mg/L |

Design criteria §5.12.5 (Huisman & Wood 1974), pp 5-142/143:
- Rate: traditional **0.1 m/h**, safe up to **0.4 m/h**. Use the higher rate while units are being cleaned instead of building extra units
- **Supernatant depth 1.0–1.5 m**
- **Sand bed 1.0–1.4 m initial. Not less than 0.5–0.8 m after scrapings. ES 0.15–0.35 mm. UC 1.5–3 (< 2 desirable)**
- Gravel under a brick bottom with 10 mm open joints: 4 layers 0.4–0.6 / 1.5–2 / 5–8 / 15–25 mm, each ≈ 10 cm
- Underdrain: perforated uPVC main + laterals is the simplest

Box depth (min) (p 5-143):
| Element | m |
|---|---|
| Freeboard above supernatant | 0.20 |
| Supernatant | 1.00 |
| Filter medium (initial) | 1.00 |
| Four-layer gravel | 0.30 |
| Brick filter bottom | 0.20 |
| **Total** | **2.70** (general practice 3–4 m) |
- **Number of units: always ≥ 2.** Reserve units for large plants (off-line up to 2 weeks for scraping). First estimate **n = 15·√Q, Q in m³/s** (verified on image) — p 5-143
- Table 5-36 WHO: < 3,000 m³/d → 2; 3,000–6,000 → 3; 6,000–9,000 → 4; 9,000–13,500 → 5 — p 5-143
- Inlet: entrance velocity ≈ **0.1 m/s**. Plank (weir) length 0.4–1 m. Inlet pipe velocity **0.3–0.5 m/s** at design rate — p 5-143
- Outlet: overflow weir crest slightly above the top of the sand (prevents sub-atmospheric pressure). Refill via the underdrains — p 5-144
- Control: constant rate. Head loss clean → clogged **0.6–1.2 m**. Declining-rate night operation: effluent weir **≥ 0.2 m above top of bed** — p 5-144
- Pre-treatment targets: average turbidity **≤ 5 NTU**. Pre-treat to avoid cleaning more often than every 2–3 months — p 5-147
- Clear-water tank: 2 compartments. Head loss through the filter 1 m. As chlorine contact, **min 30 min detention** — p 5-147
- O&M (pp 5-147–5-151): 24 h/d or declining-rate 8–16 h/d (intermittent not recommended). Fill bottom-up. Run to waste at **≈ 25 % of the normal rate for 1–2 weeks** to form the schmutzdecke. For scraping, drain to ≈ 20 cm below the sand. Scrape **1.0–2.5 cm** per cleaning, done in 1–2 days. Harrowing: 15 cm of flowing water, wastewater 163–244 L/m², ¼ of the cleaning time. Sand-washer pipes ≥ 1.5 m/s, ≈ 8 m³ sand/h per m² washer. **Re-sand when the bed is 0.5–0.8 m (§5.12.8.3) or 50–60 cm (§5.12.8.6)**, every 2–3 yr (e.g. 80 cm initial, 6 × 2 cm/yr → 2.5 yr). Filter fabric 20–30 mm thick, 13,000–15,000 m²/m³, run +400 %. GAC sandwich 75–200 mm layer placed 100–150 mm below the surface, life ≥ 5 yr
- Table 5-37 (p 5-151): conventional SSF vs GAC sandwich: cleaning 30 d / no change; colour removal 20 % / 50 %; TOC 20 % / 35–40 %; THMFP 130 µg/L / 60 µg/L
- Table 5-38 schedule: daily (intake, rate, levels, quality, pumps, log); weekly (grease, fuel, network); monthly or less (scrape, wash scrapings); yearly (clean clear-water well, tightness); every 2 yr (re-sand) — p 5-152
- Control options A–D: upstream WL/downstream rate or upstream rate/downstream WL control — p 5-152
- Monitoring: flow measurement at each filter; caretaker turbidity of raw, inflow and outflow — pp 5-153/154

## 6. Roughing filters (§5.13)
- For SSF, influent should preferably be **< 10 NTU (2–5 mg/L SS)**. RF is effective for raw water **10–150 NTU** — p 5-154
- Intake filters remove 50–70 % of solids. RF ≥ 90 %. Faecal coliform 1–2 log — p 5-154
- Table 5-39 (p 5-155) performance: Jayalath 1994, 1.5 m/h, colour/turbidity 50/60 %; Dome 2000, 0.3, algae/turbidity 95/90; Mahvi 2004, 1.5, turbidity 90; Ochieng & Otieno 2004, 0.75, turbidity/algae 90/95; Pacini 2005, 1.20, Fe/Mn 85/95; Dastanaie 2007, 1.8, turbidity/TSS/coliforms 63.4/89/94; Rabindra 2008, 1.0, TSS/turbidity 95/95; Mukhopadhay 2008, 0.75, turbidity 75
- 2–4 compartments, coarse to fine. Rate usually **0.3–1.5 m/h**. Height limited to ≈ 1.5 m. **Min 2 HRF units**. Provide a gravel-cleaning area — §5.13.3 (p 5-156)
- **Vertical RF (up/down-flow):** ≈ 10 cm water over the gravel, top covered with coarse stones. **0.3–1.0 m/h**, operate at constant flow. Resistance < 20 cm per unit. Depth ≈ 1 m per unit, 3 units in series = 3 m. Handles **50–150 NTU**. Layered single-box (≈ 1 m) only as **up-flow**. Up-flow preferred over down-flow (cleaning). False bottom preferred for drainage — pp 5-156–5-158
- **Horizontal RF:** media 20–4 mm in 3 fractions. WL kept below the media surface. **Rate 0.3–1.5 m/h (hydraulic load / vertical cross-section area)**. **Filter length usually 5–7 m**. Handles short peaks of 500–1,000 NTU. Drains perpendicular to flow, at the inlet of each compartment (perforated pipes best, no false bottom). **Drainage velocity 60–90 m/h**, emptying in 1–2 min. Resistance ≤ 20 cm — pp 5-158/159
- Design criteria §5.13.6 (p 5-160, verified): filter box length **9–12 m**, height **1–1.5 m**, width **2–5 m per unit**. Media coarsest **35–40 mm**, finest **4 mm**. Required effluent for SSF: turbidity **10 NTU**, SS **2–5 mg/L**. Wall openings **10–20 %** of cross-section, evenly distributed. **Outlet weir 30–40 cm below the top of the media**. (⚠ box length 9–12 m vs "filter length 5–7 m" in §5.13.5)

Table 5-40 Media sizes (mm) (p 5-160):
| RF type | 1st comp. | 2nd | 3rd |
|---|---|---|---|
| Coarse | 24–16 | 18–12 | 12–8 |
| Normal | 18–12 | 12–8 | 8–4 |
| Fine | 12–8 | 8–4 | 4–2 |

Table 5-41 Tentative HRF guidelines (p 5-160):
| Max SS in pre-settled water (mg/L) | > 300 (High) as printed "300" | 300–100 (Medium) | < 100 (Low) as printed "100" |
|---|---|---|---|
| Filtration rate m/h | 0.5 | 0.75–1 | 1–1.5 |
| Length (m), 20 mm media | 3–5 | 3* | 3* |
| 15 mm | 2–5 | 2–4 | 2–3 |
| 10 mm | 2–4 | 2–3 | 2 |
| 5 mm | 1–2 | 1–2 | 1 |
| Max SS in HRF effluent (mg/L) | 5 | 2–3 | 2 |
\* this gravel size can possibly be omitted.
- Media: gravel, broken stone, broken burnt brick, burnt charcoal (pilot test first), processed coconut fibre — p 5-161
- Drain at the nearest-inlet drain first. Refill slowly. Do not keep an HRF dry unless cleaned. Runs ≥ 6 months, then excavate and wash the media — p 5-163
- Operate the HRF continuously. Consider raw-water balancing storage for 24 h operation — p 5-163
- "1/3–2/3 theory": each layer removes about 1/3 — p 5-166
- Monitoring in year 1: turbidity twice/day (min once/day); SS and FC twice/month (min once/month), at inlet, each outlet, combined outlet and SSF outlet — p 5-166

## 7. Annex F.1 – RSF design example (pp A-47 … A-79)

### 7.1 Example (a): filter with nozzles (constant rate)
**Inputs:** Q = 15,000 m³/d, plant loss 7.5 % → **Qf = 16,125 m³/d = 4.26 mgd**. Criteria: rate 120–360 m³/m²/d; L/W 1.25–1.33; sand UC 1.5–2.0, ES 0.4–1.2 mm, depth 0.6–1.0 m; gravel ES 2–50 mm, depth 0.3–0.6 m; wash water 1–6 %.
1. Assume rate 200 m³/m²/d. N = 1.2·Q^0.5 = **2.48 (2.5)**, Q in mgd (⚠ text says "Q in m³/hr"). Provided **N = 5**.
2. Area = 16,125/200 = **80.6 m²**. Per filter **16.13 m²**. L:W = 1.3 → L = 4.58, W = 3.52. Select **4.60 × 3.60 = 16.56 m²**, L/W = 1.28 ✓.
3. Flow/filter 3,225 m³/d. **Actual rate 194.7 m³/m²/d** ✓. One out: factor 5/4 = 1.25 → **243.4** ✓. One out + one washing: 5/(5−2) = 1.67 (printed "5/(5−3)" ⚠) → **325.23** ✓. Peak factor 1.5 → **292** ✓. All ≤ 360.
4. Avg **2.254 mm/s = 8.11 m/h**. Max (×1.5) **3.381 mm/s = 12.17 m/h**. Min (×0.5) **1.127 mm/s = 4.06 m/h**.
5. Sand SG 2.65, UC 1.5, ES 0.55 mm. Rule: thickness = **d10 × 1200 = 660 mm**. Adopted **900 mm** (allows future deep coarse mono-media). Gravel **200 mm, 1 layer 5–10 mm**.
6. Kozeny: **h/l = (k·ν/g)·V·(1−ε)²/ε³·(6/ψ)²·Σ(xi/di²)**, with k = 5, ν = 1.009 mm²/s (25 °C), ψ = 0.75, ε = 0.4 → **h/l = 0.185·V·Σ(xi/di²)** (V mm/s, d mm). Sand sieve Table A8 (di = √(d1·d2)): fractions 0.01/0.16/0.20/0.25/0.21/0.16/0.01 at di 0.35/0.5/0.65/0.77/0.92/1.19/1.54 mm → **Σ = 1.982 mm⁻²**.
7. Sand HL: avg h/l 0.827 → **0.744 m**. Max h/l 1.241 → **1.116 m**. Min 0.414 → **0.372 m**. Gravel (Σ = 0.050): **4.2 / 6.3 / 2.1 mm** (avg/max/min).
8. Nozzles: dia 22 mm, spacing 0.125 m (rule: **nozzle spacing 125–150 mm**). Slabs 6 (long) × 5 (short) = 30, slab 0.767 × 0.720 m, 6 × 6 = **36 nozzles/slab, 65.2/m², 1,080/bed**. Flow/nozzle 0.124 m³/h (avg) → HL **0.010 m**. Max 0.187 → **0.016 m**. Min 0.0622 → 0. (manufacturer curve)
9. Exit pipe DN 250, Q = 0.037 m³/s, v = **0.760 m/s**, v²/2g = 0.029. ΣKi = 6.28 (entrance 0.5, 2 tees 1.2, orifice meter 2.5, BFV 0.48, exit 1.0, 2 bends 0.6). H = (k + ΣKi)·v²/2g → **0.200 m** (avg). HL ∝ V².
10. Table A12, total HL (m) at rate (m/h) [media / nozzle / pipe / total]: 12.00: 1.106/0.010/0.437/**1.553**; **12.17 (max): 1.122/0.016/0.449/1.587**; 10.00: 0.922/0.010/0.303/1.235; 8.11: 0.738/0.005/0.194/0.937 and 8.00: 0.748/0.010/0.200/0.958 (⚠ rows swapped; avg ≈ 0.958); 6.00: 0.666; 4.00: 0.417; 4.06 (min): 0.424; 2.00: 0.197.
11. **Max clogging head 1.22–2.44 m** (criterion). Assume 2.2 m. LWL above effluent weir 2.00 m. Required orifice-meter loss = 2.0 − 1.587 = **0.413 m**. Orifice loss = 60 % of meter HL → Hw = **0.69 (0.688) m**. A = Q/(C·√(2gh)), Q = 0.056 m³/s, C = 0.6 → **A = 0.0254 m², d = 180 mm**. **Check d_orifice/d_pipe < 0.8** (0.72 ✓). **Plate thickness = d_pipe/50** → 5 mm. Meter: 9 × pipe dia straight upstream, 3.5–4 × downstream.
12. Box (Fig A18): DA 400 (weir above media), DT 475 (freeboard), DL 650 (HWL − LWL), D1 2400, DS 900, DG 500 → **DF = 4,925 mm**. HWL 2.65 m and LWL 2.0 m above the effluent weir. Weir 0.40 m above media.
13. Backwash: "limiting HL reached within 8–24 h". **Vmf = 0.00381·d60^1.82·[γ(γm−γ)]^0.94/μ^0.88** (US units, γ = 62.4 lbf/ft³, γm = 165.36). d60 = ES × UC = 0.825 mm. **Vs = [0.018·g²·(sg−1)²/ν]^(1/3)·d = 167.7·d** (m/s, d in m) → **Vs = 0.138 m/s**. Re = 112.8. Backwash **V = 0.013 (0.0132) m/s**, "effective backwash at ≈ 10 % of media settling velocity". Q_bw = 0.0132 × 16.56 = **0.219 m³/s = 13.12 m³/min**.
14. Expansion criterion "20–50 %": **ε_e = (Vb/Vs)^0.22 = 0.597**. **le = lmf(1−ε0)/(1−εe)** = 900 × 0.6/0.403 = **1,339 mm → 49 %** ✓ (printed "(1−0.461)" ⚠).
15. Alternative (Cleasby/AWWA): **Vmf = 3.2193×10⁻¹¹·d60^1.82·[ρ(ρm−ρ)]^0.94/μ^0.88** (d60 mm, ρ kg/m³, μ Pa·s → m/s; verified numerically) = **0.0069 m/s**. Remf = ρ·Vmf·d60/μ printed **3.2** (⚠ recomputes to ≈ 5.7). If 10 < Re < 300: **KR = 1.775·Remf^−0.272** = 1.292. **Reo = 8.45·KR·Remf** = 35.08. **n = 4.45·Reo^−0.1** = 3.118. **K = Vmf·KR/εmf^n** = 0.1557 (εmf 0.4). With V = 0.016 m/s: **ε = (V/K)^(1/n) = 0.482**, le = **1.0426 m → 16 %**, checked against 15–30 % ✓. Drag: CD = 24/Re (laminar) or 24/Re + 3/√Re + 0.34. Shape factor sand 2, coal 2.25. Trial-and-error Vs = 0.148 m/s.
16. Backwash HL: fluidized sand **h = l·(Sg−1)·(1−ε)** = **599 mm** (computed with l = 900; printed "600 ×" ⚠). Gravel by Ergun: **h/l = 150·(ν/g)·(1−ε)²/ε³·V·(1/ψ)²·Σ(xi/di²) + 1.75·(1−ε)/ε³·(V²/g)·(1/ψ)·Σ(xi/di)** → 0. Underdrain BW **0.12 m** (method HL ∝ Q², H2 = 5 mm at the average rate; ⚠ 5 × (1140/195)² ≈ 171 mm, not reproducible). Exit pipe **H1 = H2·(Q1/Q2)² = 200 × (1140/195)² ≈ 6,847 mm**. **Total BW HL 7.57 m** (= 0.599 + 0.12 + 6.847).
17. Pump: Q = 1,140 m³/m²/d (0.219 m³/s). Head = 7.57 × 1.1 = 8.32 m + static 3.2 m = **11.49 m**. η 65 %. **P = ρgQH/η = 37.89 kW**.
18. Wash water: 7 min wash, 24 h run → **5.54 m³/m²** per wash; vs 195 m³/m²/d → **2.85 % < 6 %** ✓.
19. Trough (US units): **D = 1.73·(Q²/(g·W²))^(1/3)** (D, W ft; Q cfs; g = 32.3). Q_bw printed 7.52 cfs (⚠ 0.219 m³/s = 7.73 cfs). 2 troughs, 3.76 cfs each, W = 1.5 ft (formula then printed with 1.25 ⚠) → **D = 1.00 ft**. Area required 216.44 in². Section X = 18 in, Y = 12 in: area = X·Y + X²/4 = **297 in²** ✓ (printed "15×12+15×15/4" ⚠). Adopt **450 mm wide × 525 mm deep**.
20. Collecting drain: W = 2D, Manning **Q = (1.873/n)·D^(8/3)·S^(1/2)** (ft, cfs), n = 0.013 → D^(8/3)·S^½ = 0.052166. S = 0.001 → D = 1.21 ft (S 0.002/0.003/0.004/0.005 → D 1.06/0.98/0.93/0.89). D = 368, W = 736 mm, + 150 mm FB → **525 × 750 mm**.
21. Air: **1.25 m³/m²/min (75 m³/m²/h)** × 16.56 = **20.70 m³/min**. Pressure = water height 3.2 m (0.33 bar) → say **0.5 bar**.
Summary (A-61/62): Qf 16,125 m³/d; rate avg/max/min **194.7 / 292.1 / 97.4** m³/m²/d; 5 filters, 4.60 × 3.60 × 4.925 m; sand 900 mm, ES 0.55, UC 1.5, SG 2.65; gravel 200 mm (5–10 mm); 30 slabs/filter (printed "36 nozzles per filter" ⚠, = 36/slab, 1,080/filter); exit DN 250; orifice 180 mm × 5 mm; HWL 2.65 m, LWL 2.0 m above weir; weir 0.400 m above media; BW 0.013 m/s (printed "mm/s" ⚠), pump 0.219 m³/s, 11.49 m, 37.89 kW, 7 min every 24 h; 2 troughs 450 × 525 mm; drain 750 × 525 mm.

### 7.2 Example (b): filter with lateral pipes (declining rate)
**Inputs:** Q 15,000 m³/d + 7.5 % → **16,125 m³/d**. Max unit area **140 m²**. Same media criteria.
1. Declining rate → lower rate assumed: **140 m³/m²/d**. N = 1.2·√4.26 = 2.48 → provide **4**.
2. Area/filter = 4,031/140 = **28.8 m²** (< 140 ✓). L:W 1.30 → L 6.12, W 4.71. Select **6.25 × 4.75 = 29.69 m²**, L/W 1.32 ✓.
3. Flow/filter 4,031 m³/d = 0.047 m³/s. **Actual 135.8 m³/m²/d** ✓. One out: ×4/3 → **181** ✓. Peak factor **2.0** → **271.6** ✓.
4. Declining rate: **max = 1.5 × avg, min = 0.5 × avg**. **q_avg 1.572 mm/s (5.66 m/h), q_max 2.357 mm/s (8.49 m/h), q_min 0.786 mm/s (2.83 m/h)**.
5. Sand 600 mm, ES 0.50, UC 1.5, ε 0.4. Gravel 500 mm, 4 layers 2–50 mm (3–6 mm 150, 6–12 mm 150, "12–15" (sic, 12–25) mm 100, 25–50 mm 100 mm). ν = 1.0 mm²/s (20 °C).
6. Sand Σ(xi/di²) = **1.985** (Table A13). h/l avg **0.572** → **343 mm**. Max 0.859 → **515 mm**. Min 0.286 → **172 mm**. (factor (kν/g)…(6/ψ)² = 0.1835 for ν = 1.0)
7. Gravel: (h/l)/Σ = 0.288 (avg), 0.433 (max), 0.1442 (min). Layer Σ: 0.050/0.012/0.003/0.001 → HL **2.30 / 4.2 / 1.4 mm**. Media total **346 / 519 / 173 mm**.
8. Laterals (criteria from list): perforation **12 mm @ 150 mm**, laterals @ **250 mm**. Perforation area = 0.003 × 29.69 = **89,063 mm²**. Lateral area = 89,063/0.5 = **178,125 mm²**. **NL = 2·(L/SL + 1) = 52**. A_lateral = 3,425 mm² → 66 mm → select **90 mm (ID 79 mm)**. L/D = (W/2)/DL = **30.1 < 60** ✓.
9. Perforations per lateral = (W/2)/Sp = **16**. Total **832**, **28.03/m²**. Area **94,097 mm² > 89,063** ✓. Qp = 0.056 L/s, **Vp = 0.495 m/s**. Orifice **h = [Q/(C0·A)]²/2g**, C0 = 0.6 → **34.7 mm**.
10. Lateral: QL = 0.896 L/s, VL = 0.183 m/s. Manning (PVC n = 0.01): **S = 10.29·Q²·n²/D^5.33** (printed 10.2) = 0.00061. HL = S·(W/2)/3 = **0.487 mm**. + v²/2g 1.70 → **2.19 mm**.
11. Manifold channel 550 × 500 mm (A 0.275 m² ≥ 1.5 × 0.178 = 0.267 ✓). Depth from weir eq. **Q = 1.833·B·H^1.5** → H0 = 0.129 m, Vm = 0.658 m/s. Entrance 0.8·V²/2g = **17.6 mm**, exit 1.0·V²/2g = **22.0 mm**, friction ⅓·S·L = **5.4 mm** → **45.0 mm**.
12. Underdrain total: avg **82 mm** (34.7 + 2.2 + 45.0). Max **178 mm** (78.1 + 4.9 + 94.5). Min **25 mm** (8.7 + 0.5 + 15.3).
13. Effluent pipe DN 350, L = 10 m, v = **0.488 m/s**. ΣKi = 5.98 (1 bend 0.3), + k 0.5. Hazen-Williams C = 120: **h/l = 10.7·(Q/C)^1.85/D^4.67** (⚠ standard exponent is 4.87) = 0.000717 → **7.2 mm**. Minor 0.012 × 6.48 = **77.8 mm** → **84.9 mm**.
14. HL vs rate (mm) [media / underdrain / pipe / total]: 2.83: 173/25/21/**219**; 4.24: 260/55/48/**363**; 5.66: 346/98/85/**529**; 7.07: 433/153/133/**719**; 8.49: 519/221/191/**931** (⚠ underdrain column ≠ step 12).
15. Orifice: max clogging head 1.22–2.44 m, assume **1.8 m**. LWL above weir **1.3 m**. Loss = 1.3 − 0.931 = **0.369 m**. Meter = 0.369/0.6 = **0.615 m**. Q_max 0.070 m³/s, C 0.6 → printed **A = 0.0193 m², D = 157 mm** (⚠ recomputes to ≈ 0.034 m² / 207 mm). d/D = 0.45 < 0.8 ✓. Thickness d_pipe/50 (printed 3.1, ⚠ 350/50 = 7) → say 5 mm. Box (Fig A23): DA 75, DT 350, DL 500, D1 1300, DS 600, DG 500 → **DF = 3,250 mm**.
16. Backwash criteria (A-72): **air scour 2–3 min, 50–60 m³/m²/h, 20–35 kN/m²; water wash 10–15 min; BW head loss 8–15 m; wash volume 1.5–2.5 % of production**.
17. d60 = 0.75 mm, **Vs = 167.7·d = 0.126 m/s**, Re = 94.5 (> 10, transitional). **Vb = 0.012 m/s (43.2 m/h)** ("≈ 10 % of Vs"). Q_bw = 0.012 × 29.69 = **0.356 m³/s = 21.38 m³/min**. ε_e = (Vb/Vs)^0.22 = **0.60**. le = **891 mm → 49 %** (criterion printed "40–50 %"). Colder water → reduce the rate. Shape factor sand 2.0, coal 2.3. Trial Vs = 0.136 m/s.
18. Cleasby: **Vmf = 0.0058 m/s**, Remf = **4.4**, KR = 1.189, Reo = 43.84, n = 3.049, K = 0.11. V = 0.012 → **ε = 0.479**, le = **0.69 m → 15 %** (15–30 % ✓).
19. BW HL: sand = lmf·(Sg−1)·(1−ε) = **400 mm** (0.6 × 1.65 × 0.4). Gravel (Ergun, h/l = 0.251·Σ(xi/di²) + 0.026·Σ(xi/di)) → 7.5 + 2.7 + 0.6 + 0.2 = **11 mm**. Media **411 mm**. Underdrain 82 × (1037/136)² = **4,775 mm**. Effluent pipe 78 × (1037/136)² = **4,534 mm**. **Total 9.72 m**.
20. Air blower: 50 m³/m²/h = 0.83 m³/m²/min × 29.69 = **24.74 m³/min**. Water height 3.25 m → 0.33 bar → say **0.5 bar**.
21. Cycle: air **5.0 min** (⚠ vs 2–3 min criterion). Water starts at 4.00 min; ramp up 1.3 + hold 6.0 + ramp down 1.3 min → **cycle 12.6 min, water 8.6 min**. Volume 21.38 × 8.6 = **183.9 m³** per wash vs 4,031 m³/d → **4.56 % < 6 %** ✓.
22. Trough: free fall **5–10 cm** at the upper end. **D = (Q/(1.38·B))^(2/3)** (SI: Q m³/s, B m). Printed Q = 0.012 m³/s (⚠ the BW velocity used as a flow), 2 troughs, B = 0.4 → D 0.049 m, FB 50–100 mm, P = 0.170 m; area 0.020 required vs 0.100 provided, printed "not satisfied" ⚠. (My recomputation, not in the manual: Q/trough = 0.178 m³/s → D ≈ 0.47 m.) V/U shapes preferred, flat bottoms not.
23. Trough location: **height above media at rest 0.75–0.9 m**, Ho = 0.90. Check **(0.75·L + P) < Ho < (L + P)** → 0.62 < Ho < 0.77 (L = sand depth, P = trough depth) (⚠ 0.90 violates its own check). **Spacing 1.5·Ho < S < 2·Ho** → 1.35–1.80 m. W/2 = 2.375 > 1.80 → set 1.80 m (summary prints 2.38 m ⚠). Box = underdrain 0.55 + media (0.5 + 0.6) + trough 0.9 + freeboard 0.4 = **2.95 m** (summary prints 3.5 m).
24. Elevated BW tank: **2 wash cycles** × 183.9 = 367.8 m³ + 10 % → **410 m³**. Refill in **120 min**, pumps n+1 (1+1): Q = 3.4 m³/min = 0.057 m³/s. H = 9.72 + 10 % = 11.0 + 2.0 sump inlet = **13.0 m**. η 0.65 → **11.17 kW**.
25. Direct BW pumping: 0.356 m³/s, 13.0 m, η 0.65 → **69.90 kW**.
26. Wash-water drain: Q 0.356, B 0.40 → D = **0.75 m** + 0.20 → **0.95 m**.
27. HL at max (printed): media 519 + underdrain 178 + pipe 78 = **775 mm**.
28. Influent channel: Q 0.187 m³/s, **v = 0.578 m/s**, B 0.5 m → depth 0.65 + FB 0.1 = **0.75 m**. R = 0.1802, n = 0.013. **S = (v·n/R^(2/3))² = 0.000555 → 1:1800**.
Summary (A-79): rate avg/max/min **136 / 204 / 68** m³/m²/d; 4 filters 6.25 × 4.75 × 3.5 m; sand 600, gravel 500 mm; laterals 90 mm @ 250 mm, perforations 12 mm; manifold width 0.55 m; orifice plate 5 mm (orifice dia printed "0.5 mm" ⚠); HWL 1.8 m, LWL 1.3 m above weir; weir 0.075 m above media; air 24.74 m³/min, 5.0 min, 0.5 bar; BW 0.356 m³/s, 8.6 min, 13 m, 70 kW; 2 troughs 0.400 × 0.17 m, 0.90 m above media, 2.38 m c/c; drain 0.40 × 0.95 m; inlet channel 0.5 × 0.75 m, slope 1:1800.

## 8. Annex F.2 – Sand preparation (pp A-80–A-82)
- ES = d10, UC = d60/d10, from a log-probability sieve curve
- Usable sand **pu = 2·(P60 − P10)**. Too fine below **pf = P10 − 0.1·pu = 1.2·P10 − 0.2·P60**. Too coarse above **pc = P60 + 0.4·pu = 1.8·P60 − 0.8·P10** (P10, P60 = stock % passing at the desired d10, d60)
- In practice waste ≤ 10 % fines and ≤ 50 % coarse. Do not use sand coarser than 2 mm
- Example: desired ES 0.30, d60 0.75, UC 2.50; stock ES 0.28, d60 0.95, UC 3.40; P10 = 12, P60 = 48 → pu **72 %**, pf printed **48 %** (⚠ arithmetic gives 4.8 %), df = 0.20 mm; pc **76.8 %**, dc = 1.40 mm
- Hazen washing (75 % removal): **D(mm) = 0.318·f·S/A** (S L/min overflow, A m², f = 3.0 for ordinary boxes) or **0.0065·f·S/A** (gal/min, ft²)
- Sand spec: hard quartz/quartzite, no clay. **Ignition loss ≤ 0.7 %. HCl-soluble ≤ 5 %. Silica ≥ 99.8 %. SG 2.55–2.65**
- Thumb rule: **RSF ES 0.35–0.5 mm, UC 1.3–1.7** (BS sieve 16 (1.003 mm) to 52 (0.295 mm)). **SSF ES 0.25–0.35 preferred (0.15–0.35 possible), UC 2–3 (2–5 possible)** (BS 14 (1.204 mm) to 100 (0.152 mm))
- Table A15: Tyler/ASTM/BS/DIN sieve equivalences (reference only)

## 9. Annex F.3 – Filter-paper test (pp A-83–A-85)
- Whatman No. 40 paper (results comparable to a plant filter). Step 1: raw water with no coagulant; a large turbidity drop means a good direct-filtration candidate
- Jar series e.g. 0.5/1.0/1.5/2.0 mg/L. Rapid mix 20–30 s at max speed, then ≈ 40 rpm for 2–3 min. Filter each jar and read turbidity
- Ambalanthota: raw 25 NTU → 5 NTU with paper only = excellent DF candidate (polymer > FeCl3 > alum). Matara: alum 5–6 mg/L satisfactory, FeCl3 poor
- **If > 10–12 mg/L coagulant is needed to destabilize, direct filtration is doubtful**
- Pilot-test candidates: Galle, Matara, Ambalanthota, Kandy, Kegalle, Kurunegala

## 10. App mapping (criteria keys; app units)
| Key (app unit) | D3 value | Clause / page | Note vs current app |
|---|---|---|---|
| f.rate (m/h) | 5–15 m/h (120–360 m³/m²/d). Examples: 8.11 (const.) and 5.66 (declining) avg | Tbl 5-26 p5-87; §5.9 p5-91; F.1 | App max 7.5/hard 10 is stricter than D3. D3 hard limit = 15 |
| f.rateDual (m/h) | no separate D3 number (only "higher rates"); same 5–15 envelope. Dual layout §5.9.5 | p5-104 | keep app value, cite D3 envelope 15 |
| f.rateSSF (m/h) | 0.1–0.4 (traditional 0.1). Use higher rate when units are out for cleaning | §5.12.1/5.12.5 p5-138/142 | matches (hardMax 0.4) |
| f.rateMax (m/h) | ≤ 15 m/h (360 m³/m²/d) with N/(N−1) one out, N/(N−2) one out + one washing, and at peak factor (1.5–2.0) | §5.9.2.2 p5-95; F.1 A-48, A-64 | add the N−2 and peak checks; hardMax 15 |
| f.area (m²) | practical max ≈ 100 (> 10 mgd ≈ 37,850 m³/d), ≈ 50 (< 10 mgd); list: up to 140 | §5.9.2.3 p5-96; p5-92 | max 100 / hardMax 140. Flow-dependent 50 |
| f.ES (mm) | 0.4–1.2 (list, Tbl 5-26); conventional 0.6; F.2 thumb 0.35–0.5; examples 0.50/0.55 | p5-92, 5-104, A-81 | |
| f.UC (–) | 1.2–2.0 (list); 1.2–1.7 (Tbl 5-26); < 1.7 often < 1.5 (§5.9.12.11); F.2 1.3–1.7 | | |
| f.depth (m) | 0.6–1.0 stratified sand (list); usually 0.60–0.75 (§5.9.1); 0.7–1.0 (Tbl 5-26); L ≥ 1200·d10 (F.1) | p5-92, A-48 | app max 0.75 → D3 allows 1.0 |
| f.water (m) | min 1.0. ≥ 1.5 for modern high-rate | p5-92; §5.9.13.9 p5-126 | matches |
| f.expansion (%) | 15–30 fluidized (Tbl 5-30, §5.9.12.9); 20–40 (§5.9.12.1); water-only 20–50 (§5.9.12.5); list 15–20; F.1 checks 20–50 or 15–30 | | min 15, max 30, hardMax 50 |
| f.bwPct (%) | 1–6 (list, Tbl 5-26); 1.5–2.5 (nozzle/air-scour system); waste 1–5 (§5.9.14); F.1 check < 6 | | hardMax 6 ✓ |
| f.run (h) | 24–72 (1–3 d list); 12–96 typical; time limit 72–96 (3–4 d); 1–7 d (Tbl 5-26); > 1 week not recommended; DF reject < 12 | p5-91/92, 5-113 | |
| f.UFRV (m³/m²) | net production 306–509 good; ≤ 204 indicates problems; UBWV 4–8 m³/m²/wash | §5.9.13.4 p5-125; p5-124 | min 306, hardMin 204 |
| f.troughSp (m) | max horizontal spacing 2 m (list); travel ≤ 0.9 m when fluidized; 1.5·Ho–2·Ho (F.1) | p5-92; Tbl 5-30; A-77 | max 2.0 |
| f.orificeRatio (%) | 0.3 (list, F.1); 0.15–0.5 (§5.9.3.1) | p5-93, 5-97 | matches |
| f.latOrif (–) | 2–4 (§5.9.3.1); 4 for 6 mm, 2 for 12 mm perforations (list) | p5-93, 5-97 | matches |
| f.manLat (–) | 1.5–2.0 (list, F.1); 1.5–3 (§5.9.3.1) | | |
| f.latLD (–) | ≤ 60 | p5-93; A-67 | matches |
| f.vInf (m/s) | min inlet velocity 0.6 (no max given); F.1 inlet channel 0.578 | p5-92; A-78 | D3 gives a minimum only |
| f.vEff (m/s) | 1.0–1.8 (filtered-water outlet) (F.1 examples 0.76 and 0.49 are below it) | p5-93 | min 1.0 |
| f.vWash / f.vWaste (m/s) | one value only: "velocity in wash-water outlet 2.4–3.6" (⚠ ambiguous: supply or waste). No other value | p5-93 | ambiguous; don't invent |
| f.ssfDepth (m) | 1.0–1.4 initial; min 0.5–0.8 after scraping; re-sand at 0.5–0.6 | p5-142, 5-150/151 | max 1.4 |
| f.ssfES (mm) | 0.15–0.35 (§5.12.5); 0.1–0.3 (Tbl 5-26); F.2 0.25–0.35 preferred | | matches |
| f.ssfTurb (NTU) | recommended 5–10 (Tbl 5-35); best < 10; pre-treat if max ≥ 20 (consider at 10–20); absolute max 50 with pre-treatment; pre-treat to avg ≤ 5 | p5-138–5-141, 5-147 | max 10, hardMax 20, absolute 50 |
| filtered-water turbidity | < 0.3 NTU in 95 % of monthly samples; never > 1 NTU (0.2 NTU WHO cited p5-113) | §5.8.3 p5-87 | new key e.g. f.turbOut |
| RSF influent turbidity | ≤ 5 NTU after pre-treatment (< 1 preferred, list); ≤ ≈ 4 NTU, < 2 preferred (§5.9.13.6) | p5-92, 5-125 | new key f.turbIn |

**New parameters to add:** f.nFilters (N = 1.2√Q_mgd, min 2; ≥ 4 if > 15 mgd; self-backwash ≥ 4, preferably 6); f.LB (1.25–1.33); f.boxDepth (≥ 2.5 m list; ≥ 1.75 m below overflow for dual-media retrofit); f.headloss terminal (≤ 2.5 m list, 2.4–3.0 m trigger, 1.22–2.44 m clogging head F.1); f.gravelDepth (0.3–0.6 m) and size (2–50 mm), gravel rules (§5.9.3.5); f.bwRate (10–15 mm/s = 36–54 m/h; effective 30–36 m/h; ≥ 1.3·Vmf90; ≥ 18 m/h rinse); f.bwTime (≥ 5 min; typ 10–15); f.bwHead (8–15 m); f.bwTank (2 washes × 10 min, refill 60 min; F.1: 2 cycles + 10 %, refill 120 min); f.airRate (54–90 m³/m²/h list; 50–60 F.1; Table 5-32 by media); f.airP (20–35 kPa); f.airTime (2–3 min); f.surfWash (1–20 mm/s @ 150–450 kPa list; fixed 4.9–9.8 / rotary 1.2–2.4 m/h @ 350–520 kPa); f.troughH (0.75–0.9 m above media; anthracite 1.1–1.2); f.troughFB (50 mm, free fall 5–10 cm); f.nozzles (50–90/m², 55 typ; slots 0.5–1.0 mm; spacing 125–150 mm); f.latSp (≤ 0.30 m); f.perf (6–12 mm; spacing 7.5/20 cm); f.recycle (≤ 10 % of raw flow); f.bwPower (1.5 kW/m²); f.ssfSuper (1.0–1.5 m); f.ssfUC (1.5–3, < 2 desirable); f.ssfN (≥ 2; n = 15√Q m³/s; Table 5-36); f.ssfBox (≥ 2.70 m; 3–4 typical); f.ssfHL (0.6–1.2 m); f.ssfWeir (≥ 0.2 m above sand); SSF inlet 0.1 m/s, inlet pipe 0.3–0.5 m/s; SSF raw-water limits (Table 5-35: algae, colour, DOC, UV254, DO, PO4, NH3, Fe, Mn); rf.rateH (0.3–1.5 m/h, Table 5-41 by SS), rf.rateV (0.3–1.0 m/h), rf.length (5–7 m; box 9–12 m), rf.height (1–1.5 m), rf.width (2–5 m), rf.media (Table 5-40; 35–40 → 4 mm), rf.openings (10–20 %), rf.drainV (60–90 m/h), rf.weirDrop (0.30–0.40 m), rf.inTurb (10–150 NTU; VRF 50–150; HRF peaks 500–1,000), rf.effluent (≤ 10 NTU, SS 2–5 mg/L), rf.n (≥ 2); direct-filtration screen (turbidity ≤ 20 NTU and colour ≤ 30; ideal colour < 40, < 5 NTU, algae < 2000 asu/mL, Fe < 0.3, Mn < 0.05 mg/L; coagulant ≤ 10–12 mg/L); up-flow (< 80 NTU, 290–590 m³/m²/d); pressure-filter backwash (Table 5-34); DE (precoat 1 kg/m², body feed 1–10:1).
# D3 Manual (NWSDB Rev.01 Nov 2020) – Part 4: Sludge §5.14 (5-167…5-198), Ch.6 Chemicals & Disinfection (6-1…6-60), Annex G (A-86…A-90), Annex H (A-91…A-94)

Conventions: "shall"/"must" = mandatory wording in D3; "should" = recommended; "typ." = typical/literature value. [!] = ambiguity/error in the manual (value recorded as printed).

---
## A. SLUDGE / RESIDUALS (§5.14)

### A1. Regulatory / policy
- Effluent discharge to inland surface waters: CEA tolerance limits, 31 params — D3 §5.14.1 Table 5-42 (p 5-168). Key ones for WTP residuals:

| Param | Limit | Param | Limit |
|---|---|---|---|
| TSS | 50 mg/L max | Particle size of TSS | < 850 µm |
| pH | 6.0–8.5 | BOD5 (20 °C) / BOD3 (27 °C) | 30 mg/L max |
| Temperature | ≤ 40 °C in any section within 15 m downstream of outlet | Oil & grease | 10 mg/L |
| COD | 250 mg/L | Total residual chlorine | 1.0 mg/L |
| Colour (max spectral absorption coeff.) | 436 nm 7 m⁻¹; 525 nm 5 m⁻¹; 620 nm 3 m⁻¹ | Dissolved phosphate (P) | 5 mg/L |
| TKN (N) | 150 mg/L | Ammoniacal N | 50 mg/L |
| Iron (Fe) | 3.0 mg/L | Copper | 3.0 mg/L |
| Fluoride | 2.0 | Sulphide | 2.0 |
| Arsenic | 0.2 | Cyanide | 0.2 |
| Cadmium | 0.1 | Cr total / Cr6+ | 0.5 / 0.1 |
| Lead | 0.1 | Mercury | 0.0005 |
| Nickel | 3.0 | Selenium | 0.05 |
| Zinc | 2.0 | Pesticides | 0.005 |
| Phenolics (C6H5OH) | 1 | Detergents | 5 |
| Faecal coliform | 40 MPN/100 mL | Alpha / beta emitters | 10⁻⁸ / 10⁻⁷ µCi/mL |

  - Note 2: limits assume dilution ≥ 8 volumes of receiving water; if dilution < 8, permissible limits × (actual dilution / 8). — Table 5-42 (p 5-168)
- NWSDB Sludge management policy: Board approval 21 Jun 2012; GM circular 19 Dec 2012. EPL (CEA) required for surface-water disposal. (p 5-168, 5-170)
- Land application metals, EU Directive 86/278/EEC — Table 5-50 (p 5-197):

| Metal | g/ha/yr | mg/kg DS |
|---|---|---|
| Cd | 30 | 10 |
| Cu | 3000 | 1000 |
| Ni | 900 | 300 |
| Pb | 2250 | 750 |
| Zn | 7500 | 2500 |
| Hg | 30 | 10 |
| Cr | 3000 | 1000 |

### A2. Sludge sources & quantities (§5.14.3)
Table 5-44 Typical constants for sludge production (p 5-172):

| Source | Constant |
|---|---|
| Turbidity removal | 0.5–2 mg TSS/L per NTU removed ("1 is a common occurrence") |
| Alum Al2(SO4)3·14H2O | 0.26 kg/kg coagulant |
| Ferric sulphate Fe2(SO4)3 | 0.54 kg/kg |
| Ferrous sulphate FeSO4·7H2O | 0.39 kg/kg |
| Ferric chloride FeCl3 | 0.66 kg/kg |
| Polymer | 1 kg/kg |
| Powdered activated carbon | 1 kg/kg |
| Softening – Ca removed (as Ca) | 2.5 kg/kg |
| Softening – Mg removed (as Mg) | 2.4 kg/kg |

- Theoretical alum yield: 1 mg/L alum (MW 594) → 2 × 1.684×10⁻⁶ mol/L × 132.05 g/mol = 4.446×10⁻⁴ g/L ≈ **0.44 mg/L dry solids** (as Al(OH)3·3H2O) — §5.14.3.5 (p 5-174). [!] Two factors coexist: 0.44 (Method 01) and 0.26 (Table 5-44 / Method 02).
- PACl: typical liquid PACl ≈ 30–35 % PACl, ≈10 % Al2O3; dry solids ≈ **0.8 mg per mg PACl** (as product) — "very rough" — §5.14.3.5 (p 5-175)
- Fe/Mn precipitation: 1.5–2 mg/L sludge per mg/L Fe or Mn — §5.14.3.10 (p 5-179)
- Commercial alum strength 15–22 % as Al2O3; dry granular — §5.14.3.4 (p 5-174)
- Sedimentation removes 60–90 % of total solids; TSS:TU ratio 0.5–2.0 — §5.14.3.3 (p 5-173)
- Alum-coagulation solids 8–210 kg/1000 m³ raw water (p 5-173; Table 5-45), elsewhere "8–200" (p 5-177, A-93)
- Safety allowance on computed solids: +20–60 % (example uses +40 %) — §5.14.3.6 (p 5-177)
- Solids removed in sed tank (example assumption) 90 % — (p 5-177)
- Sludge flow ≈ 0.3–1 % of plant flow — (p 5-175)

Table 5-45 Alum vs iron sludge (p 5-173):

| Characteristic | Alum sludge | Iron sludge |
|---|---|---|
| Quantity kg/1000 m³ | 8–210, typ 48 | 80 |
| lb/MG | 67–1750, typ 400 | 668 |
| Specific resistance s²/g | 1.05–5.4×10¹⁰ | 1×10⁸ |
| Viscosity g/cm·s | 0.03 (non-Newtonian) | 0.03 |
| Initial settling velocity cm/s | 0.06–0.15 | – |
| Dry density kg/m³ | 1200–1520 | 1200–1800 |
| Dewaterability | 10 % in 2 d on sand beds | – |
| BOD mg/L | 30–300 | 30–300 |
| COD mg/L | 30–5000 | 30–5000 |
| pH | 6.0–8.0 | 7.4–8.5 |
| Total solids % | 0.1–4 | 0.25–3.5 |
| Al2O3·5H2O % | 15–40 | – |
| Fe % | – | 4.6–20.6 |
| Silicate & inert % | 35–70 | – |
| Organics % | 15–25 | – |
| Volatiles % | – | 5.1–14.1 |

Solids concentrations / SG:
- Alum sludge in sed basin 0.5–2 % solids; reaches 10 % in 2 d on sand beds (p 5-173)
- Sed basin underflow typ. 0.1–1 %; if accumulated ≥ 1 month → 4–6 % (p 5-173)
- Horizontal basins w/ continuous collection, low–moderate turbidity: 0.5–2 % (often < 1 %); high-turbidity: 2–4 % (p 5-175)
- Organic fraction of solids 20–40 % (p 5-175)
- Dry sludge density 1200–1520 kg/m³; SG of solids 1.5–2.5 (p 5-173); SG alum solids 1.2–1.5, iron 1.2–1.8 (p 5-175) [!] inconsistent ranges. Design example uses SG solids 2.4, 2 % underflow.
- Below ~2 % solids, specific resistance rises as concentration falls; above 2 % ≈ constant (p 5-173)

Table 5-48 Solids content by process (p 5-180):

| Process | Alum / metal hydroxide | Lime sludge |
|---|---|---|
| Thickening | < 8 % | < 25 % |
| Dewatering | 8–35 % | 25–60 % |
| Drying | > 35 % | > 60 % |

- Landfill paint-filter test: cake < 15–20 % solids may fail (p 5-180). Centrifuge: metal hydroxide → 15 %, lime → 50 % (p 5-180).

### A3. Spent filter backwash water (SFBW) (§5.14.3.7, Table 5-47)
- Backwash volume 2–3 % of plant capacity (p 5-178); Table 5-47: 1–5 %, average 2 % of treated water
- SFBW carries 10–20 % of total solids; SS 30–400 mg/L; solids < 3 to > 16 kg/1000 m³ (p 5-178)
- Table 5-47: solids 0.01–0.1 %; settleability 80 % of initial volume in 2–24 h with polymer; specific resistance 1.5×10¹⁰ s²/g; viscosity 0.01 g/cm·s; BOD 2–10 mg/L; COD 28–160 mg/L; pH 7.2–7.8; solids: Al2O3 25–50 %, SiO2 34–35 %, C & organics 15–22 %; "must be coagulated and settled"

### A4. Backwash recovery / recirculation (§5.14.3.8–9, §5.14.12)
- Recycling advantageous when capacity **> 4,500 m³/d** (or smaller where source scarce / high raw-water pumping energy) — (p 5-170)
- Recycling **not allowed where polymer is used**; not applied where raw water contains blue-green algae, Cryptosporidium, Giardia — (p 5-170, 5-194)
- Recovers **2–5 %** of water — §5.14.12 (p 5-194)
- Reuse of thickener supernatant **not recommended**; dewatering centrate/filtrate **should not be recycled** to WTP → return to sludge regulation tank — (p 5-185, 5-193, 5-194)
- Recovery tank: store backwash from two filters simultaneously; assume half of filters washed per day; 2 compartments each ≥ 1 filter backwash — §5.14.3.8 (p 5-178). [!] §5.14.12 (p 5-194): "minimum two tanks each having capacity at least to hold two backwashes".
- Settling time in recovery tank ≈ 1–2 h; decant by pontoon/floating hinged inlet (p 5-178, 5-194)
- Recirculation tank: hold & transfer half of backwash water of total daily backwash cycles; pump to raw-water inlet with minimum variation (p 5-179)
- Pumps: recirculation 1 duty + 1 standby submersible w/ float switches; sludge-regulation → thickener 1D+1S; thickener → disposal progressive cavity 1D+1S — (p 5-194, 5-195)
- Sludge regulation tank with mixer (homogenise sed + backwash sludge) (p 5-194)

### A5. Gravity thickener (§5.14.5)
- Hydraulic loading (conditioned sludge) **4–10 m³/m²·d** (Qasim 2007) — §5.14.5.2 (p 5-181, 5-184)
- Solids loading (conditioned sludge) **20–80 kg/m²·d** (design examples use 80) — (p 5-181)
- Depth **4.5–6.5 m**; detention **8–24 h** — (p 5-181)
- Achievable: alum/iron 3–6 %; lime 9–20 % — (p 5-181); gravity thickening DS 2–2.5 %; with polymer ≥ 4 % — (p 5-185)
- Solids recovery ≈ 95 % (well operated) — (p 5-181)
- Side water depth = clear zone 1.0 + settling 1.5 + thickening 3.0 = **5.5 m**; freeboard **0.6 m**; floor slope **20 cm/m**; hopper depth = 0.20 × D/2 — (p 5-184)
- Inlet central well; outlet 90° V-notch weirs around periphery — (A-94)
- Volume reduction example: 0.8 % → 4 % DS = 5-fold — (p 5-181)
- Supernatant may be discharged if compliant with CEA, else pretreat — (p 5-185)
- Talmage & Fitch (§5.14.5.4, p 5-183): Cu·Hu = Co·Ho; tu from tangent at critical point; **At = 1.5 Q / tu** (1.5 = scale-up); **Ac = 2.0 Q / ZSV** (2.0 = scale-up); larger governs. [!] At formula printed dimensionally as 1.5Q/tu (standard form is A = Q·tu/Ho).
- Batch flux (p 5-182): A·U·s (A vessel area, s solids density, U interface velocity) → kg/s.

### A6. Dewatering selection — Table 5-49 (p 5-185)

| System | DS achievable | Land | Cost/unit water |
|---|---|---|---|
| Sludge drying beds | – (low cost; clogging; rain impedes) | High | Low |
| Solar drying beds (UV-protected polythene roof) | 80–85 % | Considerably lower than conventional beds | High |
| Sludge lagoons | – (low cost; rain impedes) | Moderate | Low |
| Filter press | 20–30 % (polymer req.) | Low | High |
| Centrifuge | 15–20 % (polymer req.) | Low | High |

- Mechanical dewatering only recommended for: major WTPs with large sludge; plants without adequate land; areas with annual rainfall **> 3000 mm** — §5.14.11 (p 5-194)
- Most mechanical equipment → 15–20 % DS (verify with manufacturer) (p 5-193)
- DAF sludge with algae retards drying beds → consider centrifuge + polymer (p 5-189)

### A7. Lagoons (§5.14.7)
- Table 5-43: depth 3–4 m; 5–10 % solids in 1–3 months with continuous decanting (p 5-169)
- Sludge applied 1 m → ~15 cm when dried to 50 % moisture (p 5-185)
- Rule: lagoon depth 3 m → land **1.2–2.0 ha per 4000 m³/d** plant (p 5-185)
- Applied depth 1 m → berms **1–1.5 m** above max sludge level ("shall"); berm width **3.0–3.5 m** ("should") (p 5-185/186)
- Coagulant sludge reaches only **7–10 %** solids in dewatering lagoons (p 5-186)
- Lagoon areas 2,000–60,000 m²; depths 2–10 m (p 5-186)
- Volume for **3 months filling + 3 months dewatering** (p 5-186)
- "Provide **four** sludge-drying lagoons"; each "shall" operate apply-and-dry — §5.14.7.2 (p 5-187)
- Siting: seasonal high GWT preferably **> 2.5 m** below bottom; soil percolation **25–150 mm/h**; annual precipitation preferably **< 3000 mm**; access ramps — (p 5-187)
- Area: **As = V / (N × Di)** — As m², V sludge m³/yr, N uses/yr, Di initial dewatering-layer depth m — (p 5-187)
- Fill depth preferred **1.2 m**, max **1.8 m** (lower in wet climate) (p 5-187)
- Solids loading **40–80 kg DS/m²** of surface (lower wet, higher dry) [!] time basis not stated (p 5-187)
- Land = **1.5 × As** for berms/roads (p 5-188)
- Example (p 5-188): bottom 60 × 60 m; side slope 3H:1V; water depth 2.55 m; freeboard 0.6 m; total 3.05 m [!] (2.55+0.6 = 3.15); 0.3 m sand base with pervious tile drains; standpipe decant with multi-level ports; stop-logs at outlet.

### A8. Sand drying beds (§5.14.8)
- Suitable where annual rainfall **< 2200 mm**; for 3000–6000 mm use solar (covered) beds — (p 5-188)
- Filtrate → sludge regulation tank by gravity, not to environment ("should not") (p 5-188)
- Cells **4–20 m × 15–60 m**; walls **1–1.5 m** above sand (p 5-189)
- Sand **0.3–0.46 m** over gravel **0.3–0.46 m**; sand ES **2.0–3.0 mm** [!as printed], UC **3.5–5.0**; gravel **3–25 mm** (p 5-189)
- Sludge application depth **0.3–1.0 m**; alum cake **15–30 %**; drying **5–7 days**; solids loading **100–300 kg DS/m²·yr** (p 5-189)
- Polymer conditioning **1–10 g/kg** sludge solids (p 5-190)
- Final solids: coagulant 15–30 %; lime 50–70 %; lime loading depth 0.3–1.2 m (p 5-190)
- Multiple beds "must" be provided (p 5-189)

### A9. Belt filter press (§5.14.9, p 5-191)
- Coagulant sludge loading typ. **150 kg/m belt·h**; thickened to 4 % → **400–570 kg/m·h**
- Belt widths 1.0, 1.5, 2.0, 3.0 m; cake **15–20 %**; drainage 1–2 min; polymer **0.5–1 % of solids**; filter yield **0.8–4.0 kg/m²·h**; belt speed 0.2–0.5 "rpm" [!units as printed]; capture **90–99 %**; lime 30 % → 60 %.

### A10. Plate & frame filter press (§5.14.10, p 5-192)
- Feed pressure **350–1575 kN/m²**; filling "0–30 min" [!]; cake up to **40 %** solids; cycle **8 h** (Table 5-49 says 20–30 %).

### A11. Centrifuge (§5.14.11, p 5-192/193)
- Bowl 800–2000 rpm; 1500–4000 g; feed solids ≤ ~4 %; best performance at **75–80 %** of rated capacity; attractive only for incoming flow **> 0.3 m³/s (25,920 m³/d)**; solid-bowl scroll preferred.

### A12. Other
- Slow-sand-filter scraping water: wash sand in hydrocyclone; SSF cleaned once per 2–3 months (p 5-195)
- Disposal options: landfill/monofill (trench, area mound/layer, diked), reuse (bricks, topsoil, turf), sewer, surface water (EPL) (p 5-195…5-197)

### A13. Formulas (sludge)
- **Method 01 (Davis & Cornwell 2008)** (p 5-174/175): `Ms = 86.4 · Q · (0.44·A + SS + M)` — Ms kg/d dry sludge; Q plant flow **m³/s**; A alum dose mg/L; SS raw-water suspended solids mg/L; M misc. additions (clay, polymer, carbon) mg/L.
- **Method 02 (mass balance)** (p 5-175…5-177), each term kg/d = (mg/L)·Q(m³/d)/1000:
  - raw solids = NTU × 1.0 (mg TSS/L/NTU)
  - iron = (106.9/55.9) × Fe
  - Mn = (87.9/54.9) × Mn
  - alum = 0.26 × alum dose
  - polymer = 1 × dose
  - lime = 0.2 × (100/74) × Ca(OH)2 dose (20 % of Ca(OH)2 precipitates as CaCO3)
  - KMnO4 = (87.9/158) × KMnO4 dose
  - PAC = 1 × dose
  - Total × (1.2…1.6; use 1.4) × 0.90 removed in sed tank
- **Wet-sludge SG**: Mws/Sg,ws = Ms/Sg,s + Mw/Sg,w; 2 % solids, Sg,s 2.4 → Sg,ws = 1.012 (p 5-177)
- **Wet volume**: V = Ms / (Ps × ρ) = M/(0.02 × 1012) m³/d (p 5-177)
- Thickener: A = Ms/SLR; D = √(4A/π); HLR = V/A; hopper = 0.2 × D/2; SWD 5.5 m (+0.6 FB); V = π/4·D²·SWD + π/12·D²·h_hopper; thickening period = V_thk / V_sludge.

### A14. Worked example §5.14.3.6 (Q = 5000 m³/d) — regression values (p 5-175…5-184)
Inputs: 17 NTU, Fe 0.7, Mn 0.4, alum 25, cationic polymer 0.05, lime 15, KMnO4 4, PAC 5 (mg/L).
raw 85; Fe 6.69; Mn 3.2; alum 32.5; polymer 0.25; lime 20; KMnO4 11.2 [text writes "0.4 mg KMnO4" but 11.2 kg/d corresponds to 4 mg/L]; PAC 25 → total 183.84 kg/d; ×1.4 = 257.0; ×0.9 = **231.3 kg/d**; SG 1.012; V = **11.43 m³/d**; 46.26 kg/1000 m³. Thickener @80 kg/m²·d → A ≈ 3 m² ("too small"); D printed **1.1 m** [! error: printed (4×3.0)^0.5/3.14; correct √(4·3/π) = 1.95 m]; HLR 3.81 m³/m²·d ("nearly satisfies" min 4); SWD 5.5 m; FB 0.6; hopper 0.11 m; total 5.6 m.

---
## B. CHEMICAL FEEDING (§6.1)

### B1. Coagulant & solution preparation
- Alum (lump) dose range **20–100 mg/L** (jar-test determined) — §6.1.2 (p 6-3)
- Bulk density alum **980 kg/m³**, lime **670 kg/m³** — (p 6-3)
- Day-tank stock solution **10 %** satisfactory (100 g chem + 900 g water = 100,000 mg/L) — (p 6-3)
- Each tank to supply **24 h**; one batch prepared per day — (p 6-3, 6-12)
- Dilution water: lowest possible pH; take from filter outlet before lime — (p 6-3)
- Strength at application (diffuser) **≈1 %, as low as 0.5 %** (10 % → 1 %: 100 mL stock + 900 mL water) — §6.1.3 (p 6-4)
- System: stock **2–10 %**, dilute to **≤ 1 %** at diffuser — (p 6-4)
- Gravity feed via constant-head basin + float valve recommended; "easy to set constant dosing rate only in small WTP < 10,000 m³/d" — (p 6-4)
- Two batching tanks normally (continuous feed) — §6.1.4 (p 6-4). Batch tank "shall": smooth walls; overflow at HH level to bund sump; fill line with flow meter entering top; level sensor (H stops dilution water, L alarms, LL inhibits dosing pump); mixer; transfer pump (PLC, identical to dosing pumps) if preferred (lime).
- Cross-ref (outside range) Table 5-11 (p 5-44): typical dosing concentrations — alum 3–7 % (manual & mechanical); lime 3–10 % manual / 2–10 % mechanical; PACl 2–10 %; KMnO4 2 %. §5.4.8: solution tanks hold 12–24 h; duplicate feeders; storage ≥ 1 month. §9 (p 9-1): at least one month chemical storage.
- Alum hydrate: Al2(SO4)3·18H2O MW 666; 51.4 % Al2(SO4)3; 5 % solution = 5 kg Al2(SO4)3 + 95 kg water, i.e. **9.73 kg** of 18-hydrate — §6.1.5 (p 6-5)
- **Dose check by calibration cylinder** (p 6-5): `Dose (mg/L) = C(%) × 10000 / (T(s) × Q_raw(L/s))` — T = seconds to pump 1 L of solution.
- Example (p 6-4): Q 10 m³/min, dose 10 mg/L → 10 g/min = 1 L/min of 10 % stock → 10 L/min at 1 %.
- Pumps: piston/diaphragm (alum); metering pumps more reliable for alum; ejector best for lime; gravity feed with steady gradient preferred over proportional pumps — (p 6-5, 6-14)
- Solution preparation, dosing and flocculation "as close as possible" (p 6-14)

### B2. Alum vs PACl (§6.1.7)
- PACl effective pH **5.0–8.0**; residual Al **0.01–0.05 mg/L** achievable; lower dose; less sludge; less alkalinity; cost **2–3× alum**; alum better for DOC/enhanced coagulation — (p 6-11)
- Compare costs on Al basis; PACl dosing usually on product basis (p 6-11)

### B3. Lime (§6.1.6)
- Ca(OH)2 solubility 1.85 g/L at 0 °C, 1.65 g/L at 20 °C (p 6-6); lime water ≈ 220 °F TAC at 20 °C ≈ 220 × 7.4 = **1.6 g/L** Ca(OH)2 (p 6-8)
- Apparent density quicklime 0.7–1.2, slaked 0.3–0.6 (p 6-6)
- Slaking heat 275 kcal/kg CaO at 25 °C (p 6-6)
- Quicklime spec: CaO > 90 %, MgO < 1.5 %, SiO2 < 1.5 %; reactivity < 25 min to 60 °C (150 g lime/600 g water, 20 °C start); particle size "0–90 mm" [!] (p 6-6)
- Paste slaking 3–4 parts water : 1 part lime; suspension slaking 50–200 g/L (p 6-6)
- Slurry concentration usually **50–100 g/L**; > 100 g/L deposits/blockage; < 50 g/L carbonation (p 6-6)
- Silo preferred min **50 m³** (max lorry payload); bags 25 kg (p 6-7)
- Static saturator **1.3–1.6 kg Ca(OH)2/h·m²**; slurry reloaded every 24 h (p 6-8); turbine saturator **3.2–4 kg/h·m²** (p 6-8)
- 10 % lime suspension = 10 kg hydrated lime + 90 L water; "about 150 g dissolves in one litre" [! conflicts with 1.65 g/L] (p 6-10)
- Covered mixing tank + agitator, dust extractor, sand cyclone before pumps (p 6-10)
- Table 6-1 (p 6-16/17) jumbo-bag + screw feeder vs manual batching: jumbo bag ~**650 kg**; ejector lime < **2.5 %**; bags 25/50 kg; ceiling 6–8 m (jumbo unloader) vs 4–8 m; selection: jumbo/screw ideal **1–2 bag changes/d = 650–1300 kg/d**; manual batching ideal 1 slurry batch/d (smallest plants); large plants → silo + screw feeder; manual batching needs 2 large tanks full standby.

### B4. Dry feeders (§6.1.9)
- Hopper bottom ≤ **30° from vertical**, with vibrators (p 6-12)
- Loss-in-weight capacity ≤ ~**400–500 kg/h**; belt type **225 Mg/h** and up (p 6-13)
- Standby feed capacity "must" be provided; **≥ one-month chemical storage** adjacent to feeders ("should") (p 6-13)

### B5. Powdered activated carbon (§6.1.10)
- T&O complaints at ≥ **10 ng/L** MIB/geosmin (p 6-14)
- Min contact **≈15 min** (longer for MIB/geosmin); add at head of plant; not concurrently with Cl2/KMnO4; before coagulant (p 6-14)
- Dose **1–20 mg/L** typical (p 6-15)
- Bags 20–25 kg; jumbo 400–500 kg; dry feed if infrequent and max rate < a few hundred kg/h (p 6-15)
- Slurry line min velocity **1.5 m/s**; long-radius elbows; rubber/plastic/SS pipe; O2-depletion hazard (p 6-16)

---
## C. DISINFECTION (§6.2)

### C1. Turbidity & objectives
- Treated turbidity ≤ **1.0 NTU** "must be strived for"; WHO median < 0.1 NTU; USEPA < 0.2 NTU (high-Crypto catchments, measured before lime); NWSDB target **< 0.1 NTU** for full-treatment WTPs — §6.2.4 (p 6-22)
- Objectives: 3-log Giardia, 4-log virus (SWTR) — (p 6-22)
- Log inactivation = log10(N0/Nr) (p 6-22)

### C2. CT method
- CT = C (mg/L) × T (min), T = **T10** at **peak hourly flow**; residual maintained prior to first customer — §6.2.5 (p 6-22)
- T10 = (t10/τ) × τ, τ = HRT = V/Q — (p 6-23)
- Σ (CTcal / CTtab) ≥ **1.0** over all units up to first customer — §6.2.5.4 (p 6-25)
- WHO generic: free Cl2 ≥ **0.5 mg/L after 30 min**, pH < 8, turbidity < 1 NTU → CT **15 mg·min/L** — §6.2.6 (p 6-27)
- Service reservoirs generally unsuitable for contact credit unless dedicated main with no consumer connections (p 6-25)
- New contact tanks: CFD commonly used (p 6-24)

Table 6-2 Baffling factors (USEPA LT1ESWTR 2003) (p 6-23):

| Condition | t10/τ | Description |
|---|---|---|
| Unbaffled | 0.1 | none, agitated basin, very low L/W, high inlet/outlet velocities |
| Poor | 0.3 | single/multiple unbaffled inlets & outlets, no intra-basin baffles |
| Average | 0.5 | baffled inlet or outlet with some intra-basin baffles |
| Superior | 0.7 | perforated inlet baffle, serpentine/perforated intra-basin baffles, outlet weir or perforated launders |
| Perfect | 1.0 | very high L/W (pipeline flow) |

Table 6-3 WHO CTtab for 2-log (99 %) inactivation, free chlorine (p 6-25):

| Organism | T °C | pH | CT mg·min/L |
|---|---|---|---|
| Bacteria | < 2 | 7 | 0.08 |
| Bacteria | < 2 | 8.5 | 3.3 |
| Viruses (Coxsackie A2) | < 5 | 7–7.5 | 12 |
| Viruses | 10 | 7–7.5 | 8 |
| Giardia | 0.5 | 7–7.5 | 230 |
| Giardia | 10 | 7–7.5 | 100 |
| Giardia | 25 | 7–7.5 | 41 |

Table 6-4 CTtab Giardia, free chlorine (mg·min/L) — columns 0.5/1/2-log (p 6-26, verified from page image):

| pH | T °C | 1 mg/L: 0.5 | 1 | 2 | 2 mg/L: 0.5 | 1 | 2 | 3 mg/L: 0.5 | 1 | 2 |
|---|---|---|---|---|---|---|---|---|---|---|
| ≤6 | 5 | 18 | 35 | 70 | 19 | 39 | 77 | 21 | 42 | 84 |
| ≤6 | 10 | 13 | 26 | 53 | 15 | 29 | 58 | 16 | 32 | 63 |
| ≤6 | 20 | 7 | 13 | 26 | 7 | 15 | 29 | 8 | 16 | 31 |
| ≤6 | 25 | 4 | 9 | 17 | 5 | 10 | 19 | 5 | 11 | 21 |
| 7 | 5 | 25 | 50 | 99 | 28 | 55 | 110 | 30 | 61 | 121 |
| 7 | 10 | 19 | 37 | 75 | 21 | 41 | 83 | 23 | 46 | 91 |
| 7 | 20 | 9 | 19 | 27 [!USEPA 37] | 10 | 21 | 41 | 11 | 23 | 45 |
| 7 | 25 | 6 | 12 | 25 | 7 | 14 | 27 | 8 | 15 | 31 |
| 8 | 5 | 36 | 72 | 144 | 41 | 81 | 162 | 45 | 89 | 179 |
| 8 | 10 | 27 | 54 | 108 | 30 | 61 | 121 | 34 | 67 | 134 |
| 8 | 20 | 14 | 27 | 54 | 15 | 30 | 61 | 17 | 34 | 67 |
| 8 | 25 | 9 | 18 | 36 | 10 | 20 | 41 | 11 | 22 | 45 |
| 9 | 5 | 52 | 104 | 208 | 59 | 118 | 235 | 65 | 130 | 259 |
| 9 | 10 | 39 | 78 | 156 | 44 | 88 | 177 | 49 | 97 | 195 |
| 9 | 20 | 20 | 39 | 78 | 22 | 44 | 88 | 24 | 49 | 97 |
| 9 | 25 | 13 | 26 | 52 | 15 | 29 | 59 | 16 | 32 | 65 |

(3-log = 2 × 1.5-log is not tabulated in D3; 3-log ≈ 3 × 1-log column per USEPA convention — not stated in D3.)

Table 6-5 CTtab viruses, free chlorine (p 6-26) — printed headers "2-log, 4-log, 4-log" [! almost certainly 2/3/4-log; and temperature rows 5/10/20/25 match USEPA's 0.5/5/10/25 °C rows — treat with caution]:

| T °C (as printed) | pH 6–9: 2-log | "4-log"(3?) | 4-log | pH 10: 2-log | "4-log"(3?) | 4-log |
|---|---|---|---|---|---|---|
| 5 | 6 | 9 | 12 | 45 | 66 | 90 |
| 10 | 4 | 6 | 8 | 30 | 44 | 60 |
| 20 | 3 | 4 | 6 | 22 | 33 | 45 |
| 25 | 1 | 1 | 2 | 7 | 11 | 15 |

Table 6-6 CTtab ClO2 / O3 / chloramines / UV (p 6-26) — printed headers 0.5/1/2-log for both Giardia and viruses [! virus columns match USEPA 2/3/4-log values]:

| Disinfectant | T °C | Giardia 0.5 | 1 | 2 | Virus "0.5" | "1" | "2" |
|---|---|---|---|---|---|---|---|
| ClO2 | 5 | 4.3 | 8.7 | 17 | 5.6 | 17.1 | 33.4 |
| ClO2 | 10 | 4.0 | 7.7 | 15 | 4.2 | 12.8 | 25.1 |
| ClO2 | 20 | 2.5 | 5 | 10 | 2.3 | 6.4 | 8.4 |
| ClO2 | 25 | 2 | 3.7 | 7.3 | 1.4 | 4.3 | 8.4 |
| Ozone | 5 | 0.32 | 0.63 | 1.3 | 0.6 | 0.9 | 1.2 |
| Ozone | 10 | 0.23 | 0.48 | 0.95 | 0.5 | 0.8 | 1.0 |
| Ozone | 20 | 0.12 | 0.24 | 0.48 | 0.25 | 0.4 | 0.5 |
| Ozone | 25 | 0.00 [!] | 0.16 | 0.32 | 0.15 | 0.25 | 0.3 |
| Chloramines | 5 | 365 | 735 | 1470 | 857 | 1423 | 1988 |
| Chloramines | 10 | 310 | 615 | 1230 | 643 | 1067 | 1491 |
| Chloramines | 20 | 185 | 370 | 735 | 321 | 534 | 746 |
| Chloramines | 25 | 125 | 250 | 500 | 214 | 356 | 497 |
| UV (mJ/cm²) | – | – | – | – | 21 | 36 | – |

Table 6-7 Disinfection credits (SWTR) (p 6-27):

| Process train | Expected removal Giardia | Viruses | Required primary disinfection Giardia | Viruses |
|---|---|---|---|---|
| Conventional filtration | 2.5 | 2 | 0.5 | 2 |
| Direct filtration | 2 | 1 | 1 | 3 |
| Slow sand filtration | 2 | 2 | 1 | 2 |
| Diatomaceous earth | 2 | 1 | 1 | 3 |
| No filtration | – | – | 3 | 4 |

- NWSDB: Giardia/Cryptosporidium "not detected in Sri Lanka yet" (p 6-27)

Table 6-14 ClO2 CT for 2-log (USEPA LT2 2010) (p 6-49): Crypto 1 °C 1220, 5 °C 858, 10 °C 553, 15 °C 357, 20 °C 232; Giardia 5/10/15 °C 17/15/13; viruses 5/10/15 °C 5.6/4.2/2.8.

Table 6-15 CT at 10 °C, pH 6–9 (p 6-50):

| Target | ClO2 | Cl2 (pH 7) | O3 |
|---|---|---|---|
| Crypto 0.5-log | 138 | N/A | 4.9 |
| Crypto 3-log | 830 | N/A | 30 |
| Giardia 0.5-log | 4 | 17 | 0.23 |
| Giardia 3-log | 23 | 104 | 1.43 |
| Virus 2-log | 4.2 | 3 | 0.5 |
| Virus 4-log | 25.1 | 6 | 1.0 |

Table 6-16 UV dose (mJ/cm²), post-filter (p 6-53):

| Log | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | 3.5 | 4.0 |
|---|---|---|---|---|---|---|---|---|
| Cryptosporidium | 1.6 | 2.5 | 3.9 | 5.8 | 8.5 | 12 | 15 | 22 |
| Giardia | 1.5 | 2.1 | 3.0 | 5.2 | 7.7 | 11 | 15 | 22 |
| Virus | 39 | 58 | 79 | 100 | 121 | 143 | 163 | 186 |

### C3. Residuals, dose, contact
- Consumer collection point residual **0.2–0.5 mg/L** (normal domestic use) — §6.3.5 (p 6-31)
- Minimum free residuals: clear water / contact basin **0.5–0.8 mg/L**; stand posts / consumer taps **0.2 mg/L**; distribution dead ends **0.1 mg/L** — (p 6-31)
- Booster aim ≥ **0.1 mg/L** free at network extremities; CT not required at secondary/booster stations — §6.2.7 (p 6-28)
- Primary residual **> 1.0 mg/L at WTP** creates corrosive environment, "could be avoided"; very high WTP dose to ensure 0.2 mg/L at extreme point "should not be promoted" (p 6-28)
- Design chlorine dose **2 mg/L** for clear water (turbidity < 2 NTU, little organics, Fe & Mn < 0.3 mg/L); determine by chlorine-demand test — §6.3.6 (p 6-32)
- Minimum contact **20 min** before nearest consumer (pump sump / reservoir / pipeline) ("should") — (p 6-32); chlorine contact basin ≥ **20 min** ("must"), baffled; dose via diffuser at inlet — §6.4.2.1 (p 6-35)
- Pre-chlorination: total dose usually **2–5 mg/L** to leave **0.2–0.5 mg/L** free in final delivered water — §6.4.5 (p 6-36)
- pH: lower is better; pH correction (lime) should follow disinfection; if pH > 8 & high alkalinity → longer contact; HOCl = OCl⁻ at pH 7.5 — §6.3.1/6.3.3 (p 6-29/30)
- Fe/Mn removal filters: backwash water shall be chlorine-free → separate backwash storage for all new plants (p 6-35)
- Measuring points: just after dosing; nearest consumer; furthest network points (p 6-30/31)
- Monitoring: continuous analysers + recording + alarms for primary disinfection ("must"); else daily grab samples; analyser QC **±0.05 mg/L** (≤ 1.0 mg/L) or **±5 %** (> 1.0 mg/L); sample ahead of post-disinfection chemicals — §6.2.8 (p 6-28)
- Breakpoint: Cl2 : NH4⁺-N weight ratio **7.6 : 1**; with excess NH3 free Cl < 1 % of total — (p 6-33)

Table 6-8 Chlorine for non-disinfection uses (AWWA) (p 6-31/32):

| Treatment | Cl2 dosage | Contact | pH | Residual type / mg/L | Alkalinity consumed (as Ca²⁺) |
|---|---|---|---|---|---|
| NH3 removal – monochloramine | 5 × NH3 | > 20 min | 8.5 | Free 0.1 | 1.22 per mg/L Cl2 |
| NH3 removal – dichloramine | 10 × NH3 | > 20 min | 4.4–5.0 | Free 0.1 | 1.22 per mg/L Cl2 |
| Taste & odour | 10 × NH3 + 1–5 mg/L | > 20 min | – | Free 1.0 | 1.22 per mg/L Cl2 |
| Phenol destruction | 6–20 × phenol | 1.5–5 h stepwise | 7.0 | Free, variable | – |
| H2S → S | 2.2 × H2S | instant | 5–9 (9 opt) | Free/combined 0.1 | 2.6 per mg/L H2S |
| H2S → SO4 | 8.3 × H2S | instant | 6.5–9 (9 opt) | Free/combined | 10 per mg/L H2S |
| Mn removal | 1.3 × Mn | up to 3 h | 7–10 (10 opt) | Free 0.5 | 3.4 per mg Mn oxidised |
| Algae control | 1–10 mg/L | variable | – | Free > 0.5 | – |
| Lime control | 1–10 mg/L | maintain throughout distribution | – | Free > 0.5 | – |
| Iron & sulphur criteria control | 1–10 mg/L | do | – | Free > 1.0 | – |
| Coagulant aid – chlorinated copperas | 1 : 7.8 of FeSO4 | do | – | – | – |

### C4. Bleaching powder / hypochlorite (§6.4)
- Bleaching powder available Cl **35–60 %**; **use lower figure (35 %) for design**; verify each batch — (p 6-33, 6-34)
- Not stored **> 3 months** (hygroscopic) — (p 6-34)
- Concentrated solution prepared in one or two basins sized for **24 h** requirement; glazed tile/stoneware/PE, covered; perforated slab; slow stirrer; use supernatant only — §6.4.1 (p 6-34)
- Solutions up to **5 %**, **1 % recommended** — (p 6-34)
- Practical limit of hypochlorination ≈ **42 L/h of 1 % solution**; above → gas chlorination — (p 6-35) [implies ≈ 0.42 kg/h ≈ 10 kg/d available Cl2 — derived]
- Feed: drip from constant-head bottle (small); orifice gravity basin with float valve + micrometer orifice valve, or positive-displacement pump (larger) — (p 6-34/35)
- Valves, stirrer, basins renovation ~every 6 months (p 6-36)
- HTH not available in Sri Lanka (p 6-34)
- Table 6-10 bleaching powder at 50 mg/L available Cl (p 6-38): pipes kg/1000 m — 50 mm 0.5; 65 mm 0.8; 80 mm 1.2; 100 mm 1.9; 150 mm 4.3; 200 mm 7.4; storage basins 2.4 kg/10 m³ [implied ≈ 20–21 % available Cl — derived, not stated]
- AWWA C651 mains: tablet & continuous-feed **25 mg/L, ≥ 24 h** (continuous-feed requires **10 mg/L** residual after 24 h; tablet detectable); slug **100 mg/L, 3 h** (p 6-37)
- AWWA C652 storage: (1) full tank ≥ **10 mg/L** free after retention; (2) spray/paint **200 mg/L**; (3) full tank **2 mg/L** after 24 h; cleaning once a year; flushing ≤ 10 bar (p 6-38)

Table 6-9 Physiological effects of Cl2 in air (p 6-36): 3.5 detectable by odour; 30 coughing; 40–60 dangerous for 30 min; 1000 rapidly fatal (units printed "mg/L by volume" [! likely ppm]).

### C5. Gas chlorination (§6.5)
- Containers: cylinders **68 kg**; drums **900 kg** ("tonners"); supplied as liquid at **330–1000 kN/m²** — (p 6-38/39). [! Table 6-12 uses 98 kg & 900 kg; Table 6-13 uses 67 kg & 98 kg]
- Max gas withdrawal "10 kg/h for ton container" (p 6-39) [! vs 180 kg/d (p 6-41)]
- Ton container gas withdrawal max **180 kg/d**; 180–680 kg/d → manifold containers + room > **18 °C**; > **680 kg/d** → liquid withdrawal + evaporators (180–4500 kg/d each) — (p 6-41)
- Cylinder turnover max **3 months** — (p 6-39)
- Automatic switchover "should" be included (p 6-42)
- External PRV: supply pressure **2–2.75 kg/cm²** ahead of chlorinator (p 6-43)
- Injector water: keep solution **< 3500 mg/L** Cl2; min feed ≈ **0.25 kg/d** (rotameters to 0.05 kg/d); chlorinators ≤ 4.5 kg/d need injector water at **0.8–1.33 kg/cm²** above point-of-application pressure, **9–22.5 L/min** min; booster pump when injecting into pressure main — (p 6-43)
- Cl2 solubility: 0 °C 14,600; 20 °C 7,000; 33 °C 5,000 mg/L — (p 6-41)
- Mixing G ≈ **400 s⁻¹**; full-width/diameter diffuser, maximum submergence; not upstream of a weir (stripping) — §6.5.6 (p 6-44/45)
- Wall-mounted chlorinators; **two units (duty + standby)** ("should") — §6.5.8 (p 6-46)
- Room: separate, no interconnecting doors; floor at/below other floors; outlets near floor, inlets near ceiling; else mechanical ventilation **1 air change per minute**; switches outside; doors open outward; only connected cylinders inside, separate store; protect from sun/rain; restrain cylinders; plastic pipework; gas masks at door; neutralising chemical stored; leaking-cylinder pool adjacent — (p 6-46)
- Safety list "shall": breathing apparatus, emergency kit, leak detectors + siren (+ auto scrubber where preferable), neutralisation basin, local-language boards, comms, tagging, first aid, **annual** pressure-vessel testing, drills, safety shower & eye fountain, PPE, hoods for ton containers, extinguishers, wind cock, **two entrance doors** both-side swing — §6.5.3 (p 6-39/40)
- Storage "should include": unloading platform, continuous leak detector + alarm, ton-container repair kit, weighing device, neutralisation system, PPE (p 6-39)
- Scrubber: **20 % NaOH**; 1 kg Cl2 + 1.13 kg NaOH → 1.05 kg NaOCl; essential near/below residential areas — (p 6-39/40)
- Alarms: storage/line pressure hi/lo, injector vacuum hi/lo, evaporator bath temp hi/lo, residual hi/lo (p 6-46)
- Control: manual at small plants; flow-paced + residual compound loop at large (p 6-45)

Table 6-11 Chlorinators (p 6-42):

| Item | Pressure: dry feed | Gravity feed | Injector solution | Vacuum: differential regulator | Sonic flow |
|---|---|---|---|---|---|
| Max feed | 230 kg/d | 230 kg/d | 230 kg/d | 4800 kg/d | 240 kg/d |
| Water per kg Cl2 (min) | nil | 1500 L | 300–1500 L | 300 L | 300 L |
| Accuracy | Low | Low | Low | High | High |
| Meter | Manometer | Manometer | Manometer | Rotameter | Rotameter |
| Pressure at application | 0.7 kg/cm² max | 0.7 max | > 0.7 | > 0.7 | > 0.7 |
| Maintenance | Extensive | Extensive | Extensive | Moderate | Less |
| < 10 °C | Not suitable | Suitable* | Suitable* | Suitable | Suitable* |

Table 6-12 Cylinder inventory (min supply **30 days** at **2 mg/L**, 8–20 h/d dosing; (*) = 8 h/d) (p 6-48):

| Cl2 kg/d | m³/d | 98 kg: in use | reserve | 900 kg: in use | reserve |
|---|---|---|---|---|---|
| 0.5 | 250 | 1 | 1 | 1 | 1 |
| 1.0 | 500 | 1 | 1 | 1 | 1 |
| 2.0 | 1000 | 1 | 1 | 1 | 1 |
| 4.0 | 2000 | 1 (2*) | 3 (2*) | 1 | 1 |
| 6.0 | 3000 | 1 (2*) | 5 (4*) | 1 | 2 |
| 8.0 | 4000 | 1 (3*) | 7 (5*) | 1 (2*) | 3 (2*) |
| 10.0 | 5000 | 1 (3*) | 9 (7*) | 1 (2*) | 4 (3*) |

Table 6-13 Neutralising chemical per cylinder (p 6-48): 67 kg cyl → 85 kg NaOH(100 %) + 225 L water | 205 kg soda ash + 565 L | 85 kg hydrated lime + 720 L; 98 kg cyl → 125 kg NaOH + 375 L | 300 kg soda ash + 930 L | 125 kg lime + 1060 L.

### C6. Chloramines, ClO2, ozone, UV
- Chloramines not used in Sri Lanka; secondary only; monochloramine forms at pH 7–8 with Cl2:N ≤ **5:1** by weight; dilute 1–50 mg/L; never mix concentrated Cl2 and NH3 (NCl3) — §6.6 (p 6-48/49)
- Monochloramine ≈ 2000× (E. coli) and 100,000× (rotavirus) less effective than free Cl2 (p 6-57)
- ClO2: effective pH 5–10; chlorite WHO GV **0.7 mg/L** (ferrous salts to reduce); T&O threshold 0.4 mg/L; bacteria: 0.1 mg/L × 5 min effective — (p 6-19, 6-49, 6-50, 6-57)
- Ozone: generator 10,000–20,000 V; single-stage contact **4–6 min**; two-stage ≈ 4 min each with residual ≈ **0.4 g/m³**, applied **0.4–0.6 g/m³**; contact pressure ≈ 0.7 bar, feed air 5–10 bar; Giardia CT ≈ 1/10 of free Cl2; needs secondary disinfectant — (p 6-50…6-52)
- UV: doses Table 6-16; needs secondary disinfectant; LP/MP lamps, sensors, wipers (p 6-53)

### C7. DBPs (§6.10)
- THM guidelines internationally **0.025–0.25 mg/L** (p 6-54)
- Operational limits after storage: TTHM **< 80 µg/L**, HAA **< 60 µg/L**; in distribution: TTHM ≤ **100 µg/L**, HAA5 ≤ **80 µg/L** — (p 6-56)
- THM formation becomes disinfectant-limited when free Cl2 ≈ **0.3 mg/L** (p 6-54)
- Avoid pre-chlorination to minimise THM (p 6-54)
- **SUVA (L/mg·m) = UVA254 (cm⁻¹) × 100 / DOC (mg/L)**; < 2 low, 2–4 medium, > 4 high THM potential (p 6-56)
- Table 6-17 TTHM investigation sites (p 6-57): < 3,000 pop → 2; 3,000–10,000 → 4; 10,000–50,000 → 8; 50,000–100,000 → 10; 100,000–200,000 → 14.

---
## D. ANNEX G – Bleaching powder dosage guide (CEA) (A-86…A-90)
- Target: **0.3–1.0 ppm residual after ≥ 30 min** contact; ≥ **0.3 ppm at end of distribution**; if no test kit, slight detectable smell after 30 min.
- Basis: **25 % available chlorine**; fresh powder 25–37 %; use within a week of opening drum; initial demand may be up to **10×** normal dose.
- Start dose ≈ **2 ppm**; drip-feed solution 1–2 % available Cl (some NWSDB schemes up to 5 %); settle ~1 h, decant.
- Unit: per **1000 Imp gal** at 2 ppm → **0.08 lb ≈ 36–40 g** BP (≈ 2 heaped tablespoons) dissolved in **0.2 gal (0.9 L)** → 1 % solution.
- Conversions: 1 heaped tablespoon ≈ 25 g; 1 heaped Sri Lankan teacup ≈ 160 g; 1 lb = 453.6 g; 1 Imp gal = 4.546 L = 10 lb; 1000 Imp gal = 4.546 m³.
- Formula (implicit; reproduces table): BP (lb) = Q(gal) × 10 lb/gal × dose(ppm)×10⁻⁶ / 0.25; solution water (gal) = (BP × 0.25)/(0.01 × 10). Metric: BP (g) = Q(m³) × dose(g/m³) / 0.25 = 4.546 × 2/0.25 = 36.4 g; water (L) = Cl2 g / 10 g/L = 0.91 L.

Table A16 (A-88) – 2 ppm, 1 % solution:

| Supply (gal) | BP lb | BP g | Water gal |
|---|---|---|---|
| 1000 | 0.08 | 40 | 0.2 |
| 1500 | 0.12 | 60 | 0.3 |
| 2000 | 0.16 | 80 | 0.4 |
| 2500 | 0.20 | 100 | 0.5 |
| 3000 | 0.24 | 120 | 0.6 |
| 3500 | 0.28 | 140 | 0.7 |
| 4000 | 0.32 | 160 | 0.8 |
| 5000 | 0.40 | 200 | 1.0 |
| 6000 | 0.48 | 240 | 1.2 |
| 7000 | 0.56 | 280 | 1.4 |
| 8000 | 0.64 | 320 | 1.6 |
| 9000 | 0.72 | 360 | 1.8 |
| 10000 | 0.80 | 400 | 2.0 |

- Equipment: floating-bowl chlorinator (3 mm & 6 mm OD tubes; rate set by head H), bucket + pinchcock/drip-control.

---
## E. ANNEX H – Sludge thickener design calculation (A-91…A-94) — regression test

Inputs: max daily demand 15,000 m³/d; +7.5 % plant losses → **Q = 16,125 m³/d**; turbidity 17 NTU (1.0 mg TSS/L/NTU); Fe 0.7; Mn 0.4; alum 25; cationic polymer 0.05; hydrated lime 15; KMnO4 4 (calc uses 0.4 [!]); PAC 5 (mg/L).

| Step | Expression | Result kg/d |
|---|---|---|
| raw solids | 17 × 1.0 × 16,125/1000 | 274.12 |
| Fe(OH)3 | 106.9/55.9 × 0.7 × 16.125 | 21.58 |
| MnOOH (Mn) | 87.9/54.9 × 0.4 × 16.125 | 10.33 |
| alum | 0.26 × 25 × 16.125 | 104.81 |
| polymer | 0.05 × 16.125 | 0.81 |
| lime (20 % → CaCO3) | 0.2 × 100/74 × 15 × 16.125 | 65.37 |
| KMnO4 → MnOOH | 87.9/158 × **0.4** × 16.125 | 3.59 [! with stated 4 mg/L would be 35.88] |
| PAC | 5 × 16.125 | 80.62 |
| **Total** | Σ | **561.23** |
| +40 % uncertainty | × 1.4 | 786.0 |
| removed in sed (90 %) | × 0.9 | **707.4** |

- Sg,ws (2 % solids, Sg,s 2.4) = **1.012**
- V = 707.4 / (0.02 × 1012) = **34.95 m³/d**; 707.4/16,125 × 1000 = **43.87 kg/1000 m³** (lit. 8–200)
- Thickener SLR 80 kg/m²·d → A = **8.84 m²**; D = **3.35 m**
- HLR = 34.95/8.84 = **3.95 m³/m²·d** (text: "satisfies min 4" [! marginally below])
- SWD = 1.0 + 1.5 + 3.0 = **5.5 m**; freeboard 0.6 m; hopper = 0.20 × 3.35/2 = **0.33 m**; total water depth **5.83 m** (within 4.5–6.5)
- Inlet: central well; outlet: 90° V-notch weirs at periphery
- Volume = π/4·3.35²·5.5 + π/12·3.35²·0.33 ≈ **49.5 m³**; thickening period = 49.5/34.95 = **1.41 d** (text notes typical 8–24 h — example exceeds)
- Source: Qasim, Water Works Engineering.

---
## F. APP MAPPING (core/criteria.js keys)

| Key | Current app | D3 value (this part) | Recommendation |
|---|---|---|---|
| coag.solConc (% w/v) | 5–10, typ 8, "NWSDB practice" | Day-tank stock 10 % (§6.1.2 p 6-3); stock 2–10 % diluted to ≤ 1 % (0.5 %) at diffuser (§6.1.3 p 6-4); Table 5-11 alum 3–7 %, PACl 2–10 % (p 5-44) | min 2, max 10, typ 10 (alum stock); add check "applied strength ≤ 1 %"; cite D3 §6.1.2–6.1.3 |
| coag.storage (days) | 30–90, typ 30 | ≥ one month adjacent to feeders (§6.1.9 p 6-13; §5.4.8; §9.1); solution tank = 24 h (§6.1.2) | min 30 (D3 "at least one month"), typ 30; add day-tank 24 h (12–24 h per §5.4.8) |
| coag.turndown | 1–10, typ 5 | No numeric turndown in D3; D3 requires standby feed capacity & duplicate feeders | keep; cite generic |
| dis.residual (mg/L) leaving plant | 0.5–1.0, hardMax 1.5 | Contact basin/clear water 0.5–0.8 (§6.3.5 p 6-31); avoid > 1.0 at WTP (§6.2.7 p 6-28); WHO ≥ 0.5 after 30 min | min 0.5, max 0.8 (warn 0.8–1.0), hardMax 1.0 (soft) ; typ 0.5–0.8 |
| new dis.resTap / dis.resEnd | – | taps/stand posts 0.2; dead ends 0.1; consumer range 0.2–0.5; Annex G ≥ 0.3 at end of system | add |
| dis.contact (min) | min 30, hardMin 10 | ≥ 20 min ("must" for contact basin §6.4.2.1; "should" before nearest consumer §6.3.6); WHO 30 min (§6.2.6); Annex G 30 min | min 30 (WHO/Annex G), hardMin 20 (D3) |
| dis.ctRatio | ≥ 1.0 | Σ CTcal/CTtab ≥ 1.0, T = T10 at peak hourly flow (§6.2.5.4) | keep; CT tables 6-3…6-6; credits Table 6-7 (conventional: 0.5-log Giardia, 2-log virus by disinfection) |
| dis.pH | 6.0–8.0 | WHO CT basis pH < 8; pH > 8 → longer contact; correct pH after disinfection (§6.3.3) | max 8.0 OK |
| dis.LW | ≥ 20 | No numeric L/W in D3; baffling factors Table 6-2 (0.1/0.3/0.5/0.7/1.0); "very high L/W = pipeline flow (1.0)" | keep; map baffle class → t10/τ from Table 6-2 |
| dis.dose (new) | – | design 2 mg/L clear water (§6.3.6); pre-chlor 2–5 mg/L (§6.4.5) | add typ 2 |
| sl.thickLoad (kg/m²·d) | 10–25, hardMax 40 | **20–80** conditioned sludge; examples use 80 (§5.14.5.2; Annex H) | D3 min 20 max 80; HLR 4–10 m³/m²·d; SWD 4.5–6.5 m; detention 8–24 h |
| sl.recycle (% of Q) | 0–10, typ 5 | backwash 2–3 % of capacity (1–5 %, avg 2); recover 2–5 %; only if Q > 4,500 m³/d; not if polymer used or algae/Crypto/Giardia | max 5, typ 2–3; add guard conditions |
| sl.bedLoad | kg DS/m² per cycle 5–25 | **100–300 kg DS/m²·yr** (§5.14.8.1); depth 0.3–1.0 m; drying 5–7 d | convert: per-cycle = annual ÷ cycles/yr; or add sl.bedLoadYr 100–300 |

New parameters to add:
- dis.chlorinatorStandby: 2 units (1 duty + 1 standby) (§6.5.8)
- dis.cl2StoreDays: ≥ 30 days supply at 2 mg/L (Table 6-12); cylinder turnover ≤ 3 months (§6.5.1); bleaching powder storage ≤ 3 months (§6.4)
- dis.cl2RoomACH: 1 air change per minute (mechanical) (§6.5.8)
- dis.scrubberNaOH: 20 % NaOH; 1.13 kg NaOH per kg Cl2 (§6.5.3–6.5.4)
- dis.gasWithdrawal: ≤ 180 kg/d per ton container gas; > 680 kg/d evaporators; cylinders 68 kg, drums 900 kg (§6.5.1, 6.5.5.1)
- dis.injectorSolConc: ≤ 3500 mg/L; injector water 0.8–1.33 kg/cm² above line, 9–22.5 L/min (≤ 4.5 kg/d) (§6.5.5.8)
- dis.mixG: ≈ 400 s⁻¹ (§6.5.6)
- dis.hypoMax: hypochlorination limit ≈ 42 L/h of 1 % solution; BP avail. Cl 35 % design (25 % Annex G); solution 1 % (≤ 5 %); 24 h tanks (§6.4)
- dis.turbidity: ≤ 1.0 NTU must; target < 0.1 NTU (NWSDB) (§6.2.4)
- dbp.TTHM ≤ 100 µg/L dist (< 80 after storage); HAA5 ≤ 80 (< 60) (§6.10.1.5)
- pac.dose 1–20 mg/L; pac.contact ≥ 15 min; pac.slurryV ≥ 1.5 m/s (§6.1.10)
- lime.slurry 50–100 g/L (suspension slaking 50–200); lime silo ≥ 50 m³; saturator 1.3–1.6 (static) / 3.2–4 (turbine) kg/h·m²; ejector lime < 2.5 % (§6.1.6, Table 6-1)
- feeder.hopperAngle ≤ 30° from vertical; standby feeder required (§6.1.9)
- coag.alumDose 20–100 mg/L; alum bulk density 980, lime 670 kg/m³ (§6.1.2)
- sl.yieldAlum 0.26 kg/kg (Table 5-44) or 0.44 (Method 01); sl.yieldPACl 0.8; sl.safety +20–60 % (40 %); sl.sedCapture 90 %; sl.underflow 2 % (0.5–2); sl.SGsolids 2.4
- sl.lagoon: fill 1.2 m (max 1.8); 40–80 kg DS/m²; land ×1.5; 4 lagoons; 3 mo fill + 3 mo dry; berm 3.0–3.5 m wide, 1–1.5 m above sludge; GWT > 2.5 m; percolation 25–150 mm/h
- sl.mechDewater trigger: rainfall > 3000 mm, no land, or large plants; centrifuge only > 0.3 m³/s; BFP 150 kg/m·h; drying beds only where rainfall < 2200 mm
- effluent: TSS ≤ 50 mg/L, pH 6.0–8.5, total residual Cl2 ≤ 1.0 mg/L, Fe ≤ 3.0 (CEA Table 5-42)
# D3 Manual (NWSDB Rev 01, Nov 2020) — Part 5 extraction: Ch 7, 8, 9, 10, 3 (brief), Annex I
Citations: D3 §clause [Table/Eq] (p printed-label). "shall" = mandatory wording in D3; "should" = recommended; otherwise typical/informative. [chk] = value verified by back-calculation; [!] = ambiguity/typo in D3.

## 1. Ch 7 — Specialised treatment

### 7.1 Iron & manganese
- Occurrence: Fe >10 mg/L or Mn >2 mg/L seldom found; well Fe <1 to >40 mg/L (most <5); Mn usually <1, up to 5 mg/L — §7.1.1 (p 7-1)
- Standards (secondary/aesthetic MCL): Fe 0.3 mg/L, Mn 0.05 mg/L; water above these "should be treated" — §7.1.4 (p 7-3)
- Ch3 interpretation: Fe <0.3 mg/L unnoticeable; colour/turbidity in piped systems at Fe 0.05–0.1 mg/L; Mn noticeable >0.05 mg/L — §3.4.2.11–12 (p 3-16). Mn >0.03 mg/L can stimulate Cu corrosion in hot-water systems — §8.4 (p 8-3)
- Aeration route: detention before filtration should be ≥20 min (often provided as head on filters) — §7.1.5.1 (p 7-3)
- pH: Fe (non-complexed) oxidised fully by aeration at pH 7.0–8.0; Mn by aeration alone needs pH ≥9.5; aeration most successful at pH >8.5 with stacked-tray aerators + coke beds (Fig 5-18) — §7.1.5.1 (p 7-3/7-4). O2 cannot break organic Fe/Mn complexes.
- KMnO4 oxidises Fe/Mn faster than DO, relatively pH-independent; sedimentation alone insufficient → effective filtration required — §7.1.5.2 (p 7-4)
- Mn-greensand, regenerative batch: exchange capacity 0.18 kg Fe or Mn per ft³ media (≈6.4 kg/m³, derived); flow 0.4 m³/min/m³ (3.0 gpm/ft³); regeneration ≈0.36 kg KMnO4 per ft³ (≈12.7 kg/m³, derived); risk of Mn leakage, not economical for high-metal water — §7.1.5.4 (p 7-5)
- Mn-greensand, continuous: feed 1–4 % KMnO4 solution ahead of filter; anthracite 150–225 mm over greensand 300–450 mm over gravel; KMnO4 demand test should be performed; recommended for groundwater where Mn predominates — §7.1.5.4 (p 7-5)
- Roughing filters as Fe/Mn pretreatment: 1.5–3 m/h (Hatva 1988); HRF 1.8 m/h removes Fe, Mn, turbidity, colour — §7.1.5.5 (p 7-6)
- Biological filtration: two separate filters (Fe, Mn); coarse sand; rate 25–40 m/d (Fe), 10–40 m/d (Mn); feed pH & DO critical — §7.1.5.6 (p 7-6). Seeding: Fe 1 day–~1 week; Mn 3 weeks–3 months (longer in cold water); iron bacteria active at pH 6–8, 5–50 °C; inhibited by H2S, Cl2, NH4+, heavy metals; O&M cost cut 50–80 % — (p 7-7/7-8). Vertical-flow roughing (Pacini 2005) at natural pH/Eh deemed applicable in Sri Lanka.

**Table 7-1 Oxidant demand & solids (as printed; header says "per mg Fe2+", Mn rows are per mg Mn2+)** — (p 7-2) [image-verified]
| Reaction (as printed) | Oxidant mg/mg | Solids kg/kg |
|---|---|---|
| 4Fe2+ + O2 + 10H2O → 4Fe(OH)3 + 8H+ | 0.14 | 1.9 |
| 4Fe2+ + Cl2 + 6H2O → 2Fe(OH)3 + 2Cl− + 6H+ | 0.64 | 1.9 |
| 4Fe2+ + ClO2 + 13H2O → 5Fe(OH)3 + Cl− + 11H+ | 0.24 | 1.9 |
| 4Fe2+ + KMnO4 + 7H2O → 3Fe(OH)3 + MnO2 + 5H+ + K+ | 0.94 | 2.4 |
| 4Fe2+ + O3 + 5H2O → 2Fe(OH)3 + O2 + 4H+ | 0.43 | 1.9 |
| Mn2+ + O2 + 2H2O → 2MnO2(s) + 4H+ | 0.29 | 1.58 |
| Mn2+ + Cl2 + 2H2O → MnO2(s) + 2Cl− + 2H+ | 1.29 | 1.58 |
| Mn2+ + 2ClO2 + 2H2O → MnO2(s) + 2ClO2− + 4H+ | 2.46 | 1.58 |
| Mn2+ + 2KMnO4 + 2H2O → 5MnO2(s) + 4H+ + 2K+ | 1.92 | 2.64 |
| Mn2+ + O3 + H2O → MnO2(s) + O2 + 2H+ | 0.87 | 1.58 |
[!] Several equations have coefficient typos as printed; the numeric ratios are stoichiometrically consistent [chk: O2/Fe 32/(4×55.85)=0.14; Cl2/Fe 70.9/(2×55.85)=0.64; KMnO4/Fe 158/(3×55.85)=0.94; KMnO4/Mn 2×158/(3×54.94)=1.92; ClO2/Fe 0.24 assumes ClO2→Cl⁻ (5 e⁻), would be 1.21 for ClO2→ClO2⁻] → use numeric columns.
App: oxidant dose (mg/L) = ratio_Fe×Fe2+ + ratio_Mn×Mn2+ (+ other demand); sludge = solids_ratio × metal.

**Table 7-2 Optimum parameters for biological removal** (p 7-8)
| Parameter | Manganese | Iron |
|---|---|---|
| DO | >5 mg/L | 0.2–0.5 mg/L |
| pH | >7.0 | >6 |
| Redox potential | 400–600 mV | 0–200 mV |
| H2S | <0.01 | <0.01 |
| Heavy metals, NH3, Cl2 | Nil | Nil |

- Distribution-side mitigation: prior removal; lined/non-corrosive mains; avoid dead ends; avoid flow disturbance; periodic flushing — §7.1.6 (p 7-8)

### 7.2 Fluoride
- Optimum ~1–1.5 mg/L; USEPA primary 4.0, secondary 2.0 mg/L; WHO optimum 1.0–1.5 mg/L; SLS 614:2013 = 1.0 mg/L — §7.2 (p 7-9). Mottling at >3–5 mg/L. Ch3: 3–6 mg/L dental fluorosis, >10 mg/L skeletal fluorosis (p 3-14).
- Fluoridation chemicals: NaF, sodium silicofluoride, hydrofluosilicic acid, dosed to finished water.
- Activated alumina: grain 0.3–0.5 mm; regenerate with weak NaOH then neutralise; "probably best for large scale" (p 7-9)

**Table 7-3 Recommended F vs mean max air temperature** (p 7-9)
| Mean max temp °C | 10.0–12.1 | 12.2–14.6 | 14.7–17.7 | 17.8–21.4 | 21.5–26.2 | 26.3–32.5 |
|---|---|---|---|---|---|---|
| F mg/L | 1.2 | 1.1 | 1.0 | 0.9 | 0.8 | 0.7 |

**Table 7-4 Fluoride removal methods** (p 7-10) [image-verified] — cols: HH=household, Com=community, Eff=removal %, WHO=WHO level feasible, Loss=water loss, Dose/capacity, pH, Interf., Skill, Cost
| Technique | HH | Com | Eff | WHO | Loss | Dose/capacity | pH | Interf. | Skill | Cost |
|---|---|---|---|---|---|---|---|---|---|---|
| Alum | x | x | >90% | yes | 1-2% | 150 mg/mg F | non-specific | – | low | med-high |
| Lime | x | x | >90% | yes | 1-2% | 30 mg/mg F | non-specific | – | low | med-high |
| Alum+Lime (Nalgonda) | x | x | 70-90% | possible | 1-2% | 150 mg alum + 7 mg lime /mg F | non-spec., opt 6.5 | – | low | med-high |
| Gypsum+fluorite | x | x | – | no | 1-2% | 5 mg gypsum + <2 mg fluorite /mg F | non-specific | – | medium | low-med |
| Calcium chloride | x | x | >90% | possible | 1-2% | 3 mg CaCl2/mg F | 6.5-8 | – | – | – |
| Activated carbon | x | x | >90% | yes | 1-2% | variable | <3 | many | medium | high |
| Plant carbon | x | x | >90% | – | 1-2% | 300 mg F/kg | – | 7- [!] | medium | low-med |
| Zeolites | x | x | >90% | yes | 1-2% | 100 mg F/kg | non-specific | – | medium | high |
| Defluoron 2 | x | x | >90% | – | 1-2% | 360 g F/m³ | non-specific | alkalinity | medium | medium |
| Clay pots | x | – | 60-70% | possible | 1-2% | 80 mg F/kg | non-specific | – | low | low |
| Activated alumina | x | x | 85-95% | yes | 1-2% | 100 mg alumina/mg F (1200 g F/m³) | 5.5 | alkalinity | low | medium |
| Bone | x | x | Low? | possible | 1-2% | 900 g F/m³ | >7 | arsenic | low | low |
| Bone char | x | x | – | possible | 1-2% | 1000 g F/m³ | >7 | arsenic | low | low |
| Electrodialysis | – | x | 85-95% | yes | 20-30% | high | non-specific | turbidity | medium | very high |
| Reverse osmosis | – | x | 85-95 | yes | 40-60% | high | non-specific | turbidity | medium | very high |

### 7.3 Colour, taste & odour
- Colour removal: oxidation (KMnO4, Cl2, O3) best followed by coagulation; coagulation/enhanced coag.; filtration; PAC/GAC; IX (costly). Jar & pilot tests recommended — §7.3 (p 7-11). Ch3: <3 TCU unnoticed, >15 TCU noticed (p 3-11).
- Odour measured as TON — (p 7-12)
- Aeration: not effective for organic/biological/chlorination T&O; effective for free CO2 and H2S — §7.3.1 (p 7-12)
- PAC: contact time should be min 15 min to 1 h; normal dose 5–20 mg/L, max efficiency applied to clarified water; better at lower pH; SSF: initial 40–50 mg/L then ~2 mg/L; dosing intermittent/seasonal; application at plant inlet and/or after clarification; allow contact before coagulant — §7.3.2 (p 7-12)
- GAC: mainly for free-chlorine removal; loading similar to RSF (units similar size); periodic regeneration — (p 7-12)
- PAC safety: corrosive when wet, combustible → store separately from other chemicals; sealed dust-confining dry handling — (p 7-13)
- Oxidants: Cl2 common (excess must be removed; may form new T&O); ClO2 only for severe T&O or phenols; O3 most effective but costly — §7.3.3 (p 7-13)

### 7.4 Hardness
**Table 7-5 Classification (mg/L as CaCO3)** (p 7-13): 0–40 soft; 40–100 moderately hard; 100–300 hard; 300–500 very hard; >500 extremely hard. [!] Ch3 §3.4.2.2 (p 3-13) uses <60 soft, 60–120 mod. hard, 120–180 hard, >180 very hard; >200 scaling, <100 corrosive tendency; >500 aesthetically unacceptable.
- IX softening preferred over precipitation; treat a portion and blend to final hardness 20–50 mg/L — §7.4 (p 7-14)
- Limits for Na-cycle IX: product Na ≤900 mg/L [as printed]; raw Fe+Mn ≤1.5 mg/L and turbidity ≤5 units unless pretreated — (p 7-14)
- IX bed design criteria (p 7-14): rate 120–480 m³/m²·d; resin depth ≥0.75 m; graded gravel ≥0.3 m; backwash 350–600 m³/m²·d; underdrain area 0.18 % of bed area; freeboard 50 % of bed depth; run length per raw hardness.

### 7.5 Algae & cyanotoxins (p 7-14/7-15)
- Remove intact cells before filtration (avoid toxin release). Steps: full source WQ survey → treatment goal (seasonality, DO, colour, T&O, Fe/Mn) → technology; bench/pilot tests should precede full scale.
- Sri Lankan practice (Polonnaruwa, Thuruwila, Konduwatuwana): microstrainer, sonicator, limited-dose prechlorination (THM control), DAF with PAC, GAC filters. Details in algal annex (outside this part).

### 7.6 Low-pressure membranes (MF/UF)
**Table 7-6 MF/UF vs RO** (p 7-16): source TDS <1000 mg/L (MF/UF) vs brackish 1000–20,000 mg/L / coloured GW TOC >10 mg/L (RO); removal ≥99.9999 % vs 50–90 %; flow dead-end vs cross-flow; backwash yes/no; TMP 0.2–1 bar (keep <1 bar for less fouling) vs 5–85 bar; flux 30–170 vs 1–50 L/m²h; recovery >95 % vs ~50 % (seawater) to 90 % (coloured GW); config hollow fibre vs spiral wound; regulatory: challenge/integrity testing vs concentrate disposal.
**Table 7-8 Membrane vs RSF** (p 7-25)
| Criterion | Membrane (MF/UF) | Rapid sand |
|---|---|---|
| Filtration rate | 0.03–0.17 m/h | 5–15 m/h |
| Operating pressure | 0.2–1 bar | 0.18–0.3 bar |
| Filtration cycle | 30–90 min | 1–4 d |
| Backwash duration | 1–3 min | 10–15 min |
| Ripening | none | 15–120 min |
| Recovery | >95 % | >95 % |
- Backwash 1–3 min every 15–60 min; all modules in a rack backwashed together; air / water / air+water — §7.6.4 (p 7-20). CEB periodic (NaOH, NaOCl, HCl, acids, detergents). CIP when TMP reaches preset max or preset time; frequency days–months; membrane replacement 5–10 yr.
- Pressure-vessel modules: TMP ≈0.4–1.0 bar; Ø100–300 mm; L 0.9–5.0 m; 40–80 m² per module; 2–100 modules per rack — §7.6.7.1 (p 7-22). Submerged: suction-driven, multiple basins so each can be cleaned separately — §7.6.7.2.
- Dead-end typical for WTP feed turbidity generally <100 NTU — §7.6.6.2 (p 7-21)
- Retention: MF 0.1–1 µm; UF 0.01–0.04 µm or MWCO (95 % rejection); removal shall be established by challenge test — §7.6.9.1 (p 7-24). Protozoa LRV >7; bacteria 0.1–100 µm (complete by UF); viruses ≥25 nm, MF <1 to >4 LRV.
- Integrity (p 7-24/7-25): direct integrity test (pressure/bubble point) detects 3 µm breach, at least once a day, validated vs target LRV; continuous indirect monitoring (turbidity or particle count) at least every 15 min, each unit independently; sonic test finds 1 fibre in 20,000.
- Pretreatment options: coag/floc, sedimentation, granular filtration, adsorption, oxidation, softening; pilot-test chemical compatibility — §7.6.11 (p 7-25)
- Design tasks: capacity/retention/recovery; pretreatment & disinfection; alternatives incl. pilot; criteria & specs; ancillaries; concentrate disposal — §7.6.13 (p 7-26)
Formulas (MF/UF, p 7-17/7-18): Q = ΔP·A·K (7.1); J = Q/A = ΔP·K (7.2); K_t = K_20 / 1.03^(20−t) (≈5 % accurate 1–28 °C, worse >28 °C); J = ΔP/[μ(Rm+Rb+Rc)] (7.4); cake: Rc = I·V/A, I = c·rk (7.7–7.8); rk = 180(1−ε)/(ρ d² ε³) (7.9); ΔP = μRmJ + μIJ²t (7.12); Rejection = 1 − Cp/Cf (7.13); LRV = log(Cf/Cp) (7.14). Worked examples p 7-26/7-27 (fibre area πdl: out-in/in-out = 186 %; LRV 5.89); Rm = ΔP/(μJ) example result not printed (≈3.8×10^14 m⁻¹).

### 7.7 RO / NF
- NF cut-off ~1 nm; removes 80–95 % divalent ions — §7.7.1/7.7.3 (p 7-27/7-28). Seawater TDS 34,000–38,000 mg/L; brackish GW 1000–5000 mg/L; "WHO limit 1000 mg/L" TDS (as printed).
Formulas (p 7-29…7-31): Qw = (ΔP−Δπ)·Kw·A (7.15); Kw = Kw25·1.03^(t−25) (7.16); Jw = (ΔP−Δπ)Kw (7.17); Qs = ΔC·Ks·A (7.18); SP = Cp/Cf ×100 % (7.19); r = (1−Cp/Cf)×100 = 100 − SP (7.20); R = Qp/Qf ×100 (7.21); Qf = Qp+Qc; Cf = R·Cp + (1−R)Cc (7.22–7.23); CF = Cc/Cf = 1/(1−R) for r=1 (R 75 % → CF 4) (7.24); Cp = Cfc·Ks/Jw, Cfc = (Cf+Cc)/2 (7.25); NDP = Pf − ΔP/2 − Δπavg − Pp (7.26), Jw = NDP·Kw (7.27); ne = A/Ae, A = Qp/Jw (7.28–7.29). Conc. polarisation β = Cm/Cb; (Cm−Cp)/(Cb−Cp) = exp(Jw/k), k = D/δ (7.31–7.32).
- SDI (ASTM D4189): 0.45 µm, 210 kPa, 500 mL, T = 15 min; SDI_T = (1 − t1/tT)·100/T = %P/T (7.37); if %P30 >75 % use T = 10/5/2 min; SDI should be <3 for RO/NF feed — §7.7.9.1 (p 7-35/7-36)
- MFI0.45 = ηI/(2PA²) from min slope of t/V vs V (7.38–7.39); ref 20 °C, 207 kPa (dPo printed 2.04×10^5 Pa [!]), A0 = 13.8×10⁻⁴ m² (p 7-36/7-37); MFI-UF (13 kDa) at constant flux (7.47). No numeric MFI limits given.
- Pretreatment by SDI (Permasep/DuPont) — §7.7.11 (p 7-39): SDI <6 → media (RSF or dual media); 6–50 → in-line coagulation + direct filtration; >50 → coag + sedimentation/flotation + RSF. Cartridge filters 5–20 µm should immediately precede HP pump; MF/UF optional polishing; intermittent Cl2 + SMBS for biofouling (check membrane compatibility); pilot highly recommended. Post-treatment: degassing, alkalinity & pH correction.
- Energy: theoretical min (seawater) 0.78 kWh/m³; concentrate pressure 80–90 % of feed; ERDs recover >90 % of concentrate energy — §7.7.12 (p 7-39/7-40)
- Open seawater intake: avoid municipal/wastewater discharges within 1 km; avoid shipping routes; consider erosion, currents, waves, tides, habitats — §7.7.13 (p 7-40)
- Concentrate: 1.5–2.5× feed; brackish 1,500–25,000 mg/L, seawater 65,000–85,000 mg/L TDS; small plants ≤400 m³/d: open-ended pipe ~300 ft in tidal zone; large plants: diffusers beyond tidal zone after hydrodynamic modelling; Perth ex.: 45:1 dilution at 50 m — §7.7.15 (p 7-40/7-41)

## 2. Ch 8 — Stability & corrosion
- Only regulatory requirement: pH 6.5–8.5 — §8.1 (p 8-1)
- Stabilisation guidelines (§8.1, p 8-1): Alk ≥ ~50 and Ca ≥ ~50 mg/L as CaCO3, 6.5 < pH < 8.5; supersaturated, CCPP ≈ 4 mg/L CaCO3; (Cl⁻+SO4²⁻)/Alk ≤ 0.2 (equivalents) and/or each of Cl⁻, SO4²⁻ ≤ 50 mg/L (corrosion protection); SO4²⁻ < ~350 mg/L (aggression protection); DO > ~4 mg/L. If Cl/SO4 high → use lined metal or plastic pipes.
- Ch3 complements: alkalinity 30–400 mg/L, >150 scale risk; pH 6.5–8.0 for effective chlorination; >8.5 scaling/bitter (p 3-12/3-13). Scale-forming water should be adjusted before filters (sand hardening).
Formulas:
- (8.1) pH = log{2.2×10⁶ × [ALK]/[CO2]} — valid pH 4.5–8.5, 25 °C (units not stated; consistent with ALK mg/L as CaCO3, CO2 mg/L) (p 8-1)
- (8.2) LSI = pH − pHs; (8.3) pHs = 11.5 − log[Ca] − log[ALK] — 25 °C, TDS <500 mg/L; Ca in mg/L as Ca, ALK mg/L as CaCO3 [chk: Rochester pH 7.6, Ca 7.9, Alk 15 → pHs 9.43, LSI −1.83, RSI 11.25] (p 8-3/8-4)
- LSI <0 undersaturated/corrosive; >0 scaling; 0 saturated; potentially aggressive if LSI < −1.5 (p 8-4)
- (8.4) RSI = 2pHs − pH; stable/non-corrosive if RSI < 10 (p 8-4)
- (8.5) ACIDITY = [ALK](1 + 4.245×10⁶ × 10^−pH) (as CaCO3; 25 °C, TDS ≤200); C2 = ALK − Ca; read Ca_sat on Caldwell–Lawrence diagram (Fig 8-1, 25 °C, 40 mg/L TDS); (8.6) CCPP = Ca − Ca_sat (p 8-4)
- Aggressiveness Index: acceptable > 10 (Table 8-3); formula NOT printed in D3.
**Table 8-2 CCPP (mg/L CaCO3)** (p 8-4): >0 scaling (protective); 0 to −5 passive; −5 to −10 mildly corrosive; < −10 corrosive (aggressive).
**Table 8-3** (p 8-5) printed as "example value  vs  limit": LSI −1.8 > −1.5; RSI 11.2 < 10; CCPP −4.7 > −5; AI 10.3 > 10 → acceptance: LSI > −1.5, RSI < 10, CCPP > −5, AI > 10.
**Table 8-4 LSI factors; pHs = (9.0 + A + B) − (C + D); LSI = pH − pHs** (p 8-6) [image-verified]
- A (TDS mg/L): 50–300 → 0.1; 400–1000 → 0.2
- B (Temp °C): 0–1 2.6; 2–6 2.5; 7–9 2.4; 10–13 2.3; 14–17 2.2; 18–21 2.1; 22–27 2.0; 28–31 1.9; 32–37 1.8; 38–43 1.7; 44–50 1.6; 51–56 1.5; 57–63 1.4; 64–71 1.3; 72–81 1.2
- C (Ca hardness mg/L CaCO3): 10–11 0.6; 12–13 0.7; 14–17 0.8; 18–22 0.9; 23–27 1.0; 28–34 1.1; 35–43 1.2; 44–55 1.3; 56–69 1.4; 70–87 1.5; 88–110 1.6; 111–138 1.7; 139–174 1.8; 175–220 1.9; 230–270 2.0; 280–340 2.1; 350–430 2.2; 440–550 2.3; 560–690 2.4; 700–870 2.5; 880–1000 2.6
- D (M-alkalinity mg/L CaCO3): 10–11 1.0; 12–13 1.1; 14–17 1.2; 18–22 1.3; 23–27 1.4; 28–35 1.5; 36–44 1.6; 45–55 1.7; 56–69 1.8; 70–88 1.9; 89–110 2.0; 111–139 2.1; 140–176 2.2; 177–220 2.3; 230–270 2.4; 280–350 2.5; 360–440 2.6; 450–550 2.7; 560–690 2.8; 700–880 2.9; 890–1000 3.0
- [!] Gaps between ranges (e.g. TDS 300–400, Ca 220–230) as printed → app should interpolate/nearest.
- Soil resistivity (pipelines) §8.5 (p 8-5): <2000 Ω·cm usually corrosive; <1000 sure corrosive; <500 severe; >12,000 almost never; 2000–12,000 assess vs adjacent sections.
- Corrosion control §8.6–8.7 (p 8-6…8-8): coatings (cement mortar, epoxy, PE sleeving, galvanising, bitumen/coal tar, tapes), cathodic protection (sacrificial Mg/Zn/Al anodes or impressed current), corrosion inhibitor e.g. sodium silicate; GW with negative LSI common in Sri Lanka → aeration (CO2 removal) + CaCO3 contact bed (pilot for special cases; usually not cost-effective for minor schemes). In-plant: no rebar–iron pipe contact in wall penetrations; insulating flanges for dissimilar metals and wall exits; avoid debris/deposits (concentration cells); control Cl2 leaks and coagulant powder dust.

## 3. Ch 9 — Plant design & layout
### 9.1 Fundamental principles (p 9-1)
- Staged construction in 5–10-yr stages; raw water pump capacity 5–10 % > treated output; ≥1 month chemical storage; ≥2 h clear-water sump storage; parallel units + standby incl. emergency generators; max gravity/hydraulic mixing; maintain operation of existing works during construction.
**Table 9-1 Typical design criteria — 48,000 m³/d works** (p 9-2/9-3) [!] printed values on p 9-3 are shifted one row up; corrected alignment below [chk by arithmetic]
| Unit | Criteria |
|---|---|
| Intake / design flow | 555 L/s (48,000 m³/d) raw; 530 L/s (46,000 m³/d) treated (4.7 % loss allowance) |
| Grit channels | 2 × 3.5 m W × 22.0 m L; v_h 0.16 m/s; settling v 7.2 mm/s; t 2.3 min |
| Travelling screens | 2 × 2.0 m; velocity 0.45 m/s |
| Wet well | 1; 69.5 m³; t 2.09 min |
| Raw water pumps | 3 (incl. standby); split-case; 278 L/s @ 20 m TDH; 1460 rpm; 93 kW |
| Raw water meter | 1 Venturi, 500 mm, 220–800 L/s |
| Rapid mix | 1; 20 s; 11.2 m³; 15 kW; G 1000 s⁻¹ |
| Flocculation | 2 × 3.962 m W × 81.65 m L; 333.6 m³ each; 23 min |
| Settling basins | 2; 13.9 m W × 45.0 m L × 2.438 m SWD; upflow (SOR) 1.6 m/h; t 1.5 h; weir 2.89 L/s/m; weir length 96 m/basin |
| Filters | 8 gravity sand down-flow; 69.3 L/s each; 7.3 m/h; 34.4 m² (4.3 × 8.0 m); head loss 1.8–2.5 m; backwash 35–50 m/h; surface wash 5–10 m/h |
| Treated water reservoir | 1; 4600 m³; 25 × 40 m × 4.6 m SWD; 2.41 h |
| Treated water pumps | 3 (1 standby) vertical turbine; 265 L/s @ 146 m TDH; 1460 rpm; 634 kW |
| Chlorine | 900 kg cylinders; pre 1–5 mg/L, post 1–2 mg/L; max 225 kg/d pre, 90 kg/d post; chlorinators 1 duty + 1 standby (1–225 kg/d pre, 1–90 kg/d — printed "pre" [!]); storage 90 d avg use |
| Alum | granular, bags; 10–60 mg/L; 2 day tanks × 12.96 m³ (4.32 m² × 3 m SWD); 1 vertical paddle mixer/tank |
| Lime | feed pumps PD, 2 (1 standby) pre-lime & 2 (1 standby) post-lime; 1135 L/h each (5 % soln); storage 90 d |
### 9.2 Site selection (p 9-4…9-8)
- Factors (shall be considered): size/complexity; EIA/IEE; public consultation; topography; cost incl. staging; regulatory; political; designer experience (else senior-engineer guidance). Criteria to elaborate: site area, expansion, noise, hazardous chemicals, hydraulics/energy, access, utilities, cut/fill, rock, drainage/flooding, seismic/landslide, permits, security, environment, archaeology, source proximity, ecology.
- Minimum area (Kawamura 2000) §9.2.1 (p 9-5): A ≥ Q^0.7 (A acres, Q ultimate capacity mgd) — rough, campus layout, conventional plants only; excludes source/clear-water storage, pipelines, lagoons/drying beds. SI form (derived): A[ha] ≥ 0.4047·(Q[m³/d]/3785.4)^0.7.
- Table 9-2 (less land → more land): small → large capacity; membrane (no pretreatment) → conventional; package → custom in-ground; plate/tube settlers (less); high-rate/pressure filters → slow sand; backwash to sewer → recycle EQ basin/settling/lagoons; mechanical dewatering → gravity thickening/drying beds/vacuum beds; more land for LSPS, source storage, presedimentation, finished storage, HSPS; compact → campus/linear; common-wall → separate structures; flat → steep site; no buffer/screening → buffer/screening required.
- Design life ~50 yr; site used far longer (>100 yr); reserve land beyond planning horizon (20–50 yr projections) — §9.2.2 / §9.6.1 (p 9-6, 9-17)
- Noise shall be below CEA limits — §9.2.3. Chlorine/chemical storage space shall suit plant capacity — §9.2.4.
- Prefer site near source: low-lift raw pumps, high-lift to service area; gravity where possible — §9.2.5
- Access roads shall suit heavy chemical trucks; all-weather, no low-level/flood-prone crossings — §9.2.6
- Three-phase power + standby generators; avoid HT lines/towers — §9.2.7
- Topography: ideal uniform slope 2–8 %; >10 % → extensive cut & fill — §9.2.8 (p 9-7)
- Soil investigation before detailed design (essential) — §9.2.9; site well above 100-yr flood; intake pumps/motors above HFL — §9.2.10 (p 9-8); avoid active faults; minimum seismic precautions — §9.2.11
- Permits: IEE/EIA (CEA) for larger plants; water rights (WRB, Irrigation, Mahaweli); EPL for waste discharge; COC within city limits (shall) — §9.2.12
- Security: walls/fences/gates, guard room/towers, intrusion detection, CCTV (shall), elephant fences, bird nets — §9.2.13
### 9.3–9.6 Layout & technical (p 9-9…9-18)
- Layout types: linear (simple, expandable; scattered chemical points), campus (seismic/settlement tolerant, accessible, more land/piping/cost), compact (clustered, common walls, less land; harder expansion) — Table 9.2 pros/cons (p 9-10/9-11).
- Redundancy: standby units for equipment (pumps); multiple treatment units sized so remaining units carry total flow with one out of service; space for isolation valves/gates — §9.4.1 (p 9-12)
- Flexibility: cross-connections between trains after each process; bypass of failed unit — §9.4.2
- Conveyance floc→settling: velocity 15–90 cm/s (>90 breaks floc; <15 floc settles); prefer common-wall baffle transfer or open channels — §9.5.2 (p 9-16). >70 % of plants have unequal flow split → hydraulic balancing without control devices; bypasses.
- Hydraulic profile: keep as flat as possible even on steep sites (each m drop = m of pumping); units ~½ below ground balance cut/fill; emergency overflows + inter-unit overflows (lower dividing walls); allow for future units — §9.5.1 (p 9-15)
- Chemical application: single application point (single pipe/channel carrying all flow) before pretreatment and before filters — §9.5.3
- No single common wall between filtered and unfiltered water (settled-water channels, filter box above media bottom, backwash channels) — §9.5.4
- Finished-water storage at plant: 5–10 % of capacity or 2 h — §9.5.5 (p 9-16); backwash tank close to filters.
- Source storage/equalisation; blend two sources in raw-water EQ tank — §9.5.6
- Lagoons/drying beds at lowest, least visible point; check flood loading — §9.5.7 (p 9-17)
- Hazardous chemicals near feed equipment, away from admin; spill containment; separate incompatible chemicals; screen tanks from street — §9.5.8
- Expansion provisions: blind flanges, knock-out walls, rebar extensions, stop-plank grooves, remove rock initially, utility corridors — §9.6 (p 9-17/9-18)
### 9.7 Support facilities (p 9-18…9-21)
- Workshop with monorail/bridge crane to loading dock — §9.7.1
- Laboratory: central; away from vibration (large pumps); independent HVAC; fume-hood discharge; sample lines piped to lab plus accessible sample points; large plants may have process lab + full lab — §9.7.2
- **Table 9-3 Minimum lab equipment (single list, not size-dependent)**: UV/VIS spectrophotometer (DR5000) 1; pH meter 1; conductivity meter 1; analytical balance (4 dp) 1; culture incubator 2; UV lamp 1; refrigerator w/ deep freezer 2; autoclave 1; drying oven 1; steam bath 4-hole 1; jar tester 1; RCl test kit 2; digital titrator 1; reference weight set 1; Bunsen burner 1; LP gas cylinder 1; ultra-clean sounder 1; BOD incubator 1; LED digital sounder 1; COD apparatus 1; portable digital RCl meter 1; trinocular microscope w/ image analyser 1; UPS 2; computer 1; printer 1; A/C 1; centrifuge 1; distillation plant 1; depth sampler 1; Sedgewick-Rafter cell 1; LDO meter 1; Secchi disc 1; GPS 1; microplate reader 1; plankton net 1; laminar-flow fume hood 1; ice box 50 L 2; chlorophyll meter 1; single- & multi-channel pipettes 1+1; stop watch 2; 1- & 5-channel counters 1+1; filtration unit 1; thermometers 0–110 °C ×3, 0–400 °C ×3; turbidity meter 1; hot plate/stirrer 1; desiccator 1; + glassware/consumables items 48–105 (pipettes 1–25 mL ×10/size, cylinders 10–1000 mL ×10, vol. flasks 50–1000 mL ×10, beakers 100–1000 mL ×20, burettes 50 mL ×3, Petri dishes 50, test tubes ×50/size, bottles ×10–25, Büchner 90/110 mm ×3, DR5000 cells 20); Standard Methods book 1 (p 9-19…9-21)
### 9.8 Instrumentation & control (p 9-21/9-22)
- P&ID shall include full legend (ID/tag numbers, symbols); control philosophy = joint civil + M&E output.
- Measure: flow rate & totalised flow; filter head loss; chemical & Cl2 dose; levels (towers, sumps); pressure; electrical parameters; safety; WQ of raw, each unit and treated water; air-scour/DAF flow & pressure.
- Pump control: suction/discharge levels, suction/discharge pressures, flow. Automation: VFD pumps, MOVs, auto filter backwash, interlocks, dosing rate, dechlorination, semi-auto WQ loops; every auto control at least Auto/Manual/Stop (refer D5).
- Chlorine leak detection shall be installed in chlorine room & storage; neutralisation pit/scrubber; eyewash, shower, SCBA outside building (refer P9, D5).

## 4. Ch 10 — O&M documentation (p 10-1…10-9)
- Prepared jointly (design team, O&M staff, contractor); must reach plant staff ≥1–2 months before start-up; draft after detailed design, final after commissioning — §10.2
- Required headings §10.3: 1 Intro & process overview · 2 WQ criteria & regulations (SLS/WHO/NWSDB, sampling, WSP) · 3 Operations per process (design intent, SOPs, start-up/shutdown/troubleshooting, safety, control philosophy, P&ID, ERP) · 4 Maintenance (OEM data, asset mgmt, frequencies, lubrication, CMMS, warranties, MMP) · 5 Staff & training · 6 Laboratory (monitoring, QA/QC, chain of custody, MSDS, inventories) · 7 Environmental/aesthetic · 8 Safety (PPE, confined space, MSDS, security) · 9 Utilities · 10 Records & reports · 11 References/as-builts.
- §10.4: MMP (preventive + corrective); asset management (5 steps, GIS); WSP (9 sections); SOPs (8 steps, by design/process engineer); ERP updated ≥ annually. Forms: Table 10-1 Equipment Data Form, Table 10-2 Operations Checklist.

## 5. Ch 3 — Sampling (designer-relevant numerics)
- Source water: basic physico-chemical shall be assessed monthly for one year; trace metals, organics monthly; biology monthly + seasonal — §3.1.1–3.1.4 (p 3-3)
- Filter media core (300 mm) check at least twice per year — §3.1.7 (p 3-4); ≥2 L sample for full analysis — §3.2.5; hand-pump wells pump to waste ~5 min; surface sample 100 mm below surface; bacteriological bottle air space ≥2.5 cm.
- Table 3-2 max holding times (p 3-7/3-8): coliforms/F.strep 6–24 h (4 °C, 0.008 % Na2S2O3); pH, temperature, sulphide immediately; total residual Cl2 5 min; odour 6 h; DO (Winkler, fixed) 8 h; acidity, alkalinity, NH3, ferrous Fe, residue/TDS/TSS, turbidity, Cr VI, BOD 24 h; colour, nitrite, surfactants 48 h; sulphate, TOC/UV254, COD 7 d; THM 14 d; phenolics 21 d; chloride, conductivity, total Fe, F, Kjeldahl N, Mg, nitrate, total P, silica, oil & grease, chlorophyll, Hg 28 d; Ca, hardness, metals (HNO3 pH<2) 6 months; pesticides 7 d to extraction/40 d after; algal toxins 1 month frozen.
- Interpretation (p 3-11…3-17): turbidity <0.5 NTU for effective disinfection, >4 NTU noticeable; chloride taste ~250 mg/L, unpalatable 500–1000, unsafe >4000; sulphate ≤250 mg/L; Na taste >200 mg/L; NO3-N 10, NO2-N 3 mg/L; WHO THM GVs: chloroform 0.3, bromoform 0.1, DBCM 0.1, BDCM 0.06 mg/L; Table 3-4 metal GVs (mg/L): Se 0.04, Pb 0.01, Cd 0.03 [as printed], Cr 0.05, Zn 3, Cu 2, Ni 0.07, Hg 0.006, As 0.01.
- Analysis QA (p 3-19/3-20): ion balance acceptance by Σanions meq/L 0–3 ±0.2 %, 3–10 ±2 %, 10–800 ±5 %; measured/calculated TDS 1.0–1.2; measured/calculated EC 0.9–1.1; 100×ion sum (meq/L) = 0.9–1.1×EC; TDS/EC 0.55–0.7. TDS_calc = 0.6·Alk + Na + K + Ca + Mg + Cl + SO4 + SiO3 + NO3 + F. Table 3-5 EC factors µS/cm per mg/L (per meq/L): HCO3 0.715 (43.6); Ca 2.60 (52.0); CO3 2.82 (84.6); Cl 2.14 (75.9); Mg 3.82 (46.6); NO3 1.15 (71.0); K 1.84 (72.0); Na 2.13 (48.9); SO4 1.54 (73.9).

## 6. Annex I — Water properties (p A-95) [image-verified; source Crittenden et al. 3rd ed. Table C-2]
| T °C | γ kN/m³ | ρ kg/m³ | μ ×10⁻³ kg/m·s | ν ×10⁻⁶ m²/s | σ N/m | E ×10⁹ N/m² | Pv kN/m² |
|---|---|---|---|---|---|---|---|
| 0 | 9.805 | 999.8 | 1.781 | 1.785 | 0.0765 | 1.98 | 0.61 |
| 5 | 9.807 | 1000 | 1.518 | 1.519 | 0.0749 | 2.05 | 0.87 |
| 10 | 9.804 | 999.7 | 1.307 | 1.306 | 0.0742 | 2.1 | 1.23 |
| 15 | 9.798 | 999.1 | 1.139 | 1.139 | 0.0735 | 2.15 | 1.7 |
| 20 | 9.789 | 998.2 | 1.002 | 1.003 | 0.0728 | 2.17 | 2.34 |
| 25 | 9.777 | 997 | 0.89 | 0.893 | 0.072 | 2.22 | 3.17 |
| 30 | 9.764 | 995.7 | 0.798 | 0.8 | 0.0712 | 2.25 | 4.24 |
| 40 | 9.73 | 992.2 | 0.653 | 0.658 | 0.0696 | 2.28 | 7.38 |
| 50 | 9.689 | 988 | 0.547 | 0.553 | 0.0679 | 2.29 | 12.33 |
| 60 | 9.642 | 983.2 | 0.466 | 0.474 | 0.0662 | 2.28 | 19.92 |
| 70 | 9.589 | 977.8 | 0.404 | 0.413 | 0.0644 | 2.25 | 31.16 |
| 80 | 9.53 | 971.8 | 0.354 | 0.364 | 0.0626 | 2.2 | 47.34 |
| 90 | 9.466 | 965.3 | 0.315 | 0.326 | 0.0608 | 2.14 | 70.1 |
| 100 | 9.399 | 958.4 | 0.282 | 0.294 | 0.0589 | 2.07 | 101.33 |
Notes: E at atmospheric pressure; σ in contact with air. Linear interpolation between rows (Sri Lanka 20–35 °C uses 20/25/30/40 rows).

## 7. Design-review checklists (app)
Layout/site: slope 2–8 % (>10 % flag) §9.2.8 · above 100-yr flood; intake M&E above HFL §9.2.10 · area ≥ Q^0.7 acres (conventional) §9.2.1 · expansion land + utility corridors §9.6 · noise < CEA §9.2.3 · permits IEE/EIA, water rights, EPL, COC §9.2.12 · soil investigation §9.2.9 · all-weather heavy-vehicle access §9.2.6 · 3-phase power + generator §9.2.7.
Redundancy: N-1 treatment units carry full flow §9.4.1 · duty+standby pumps/chlorinators/feed pumps (Table 9-1) · raw pumps 5–10 % > output §9.1 · cross-connections/bypasses §9.4.2.
Hydraulics: flat profile §9.5.1 · inter-unit + emergency overflows · floc conveyance 0.15–0.9 m/s §9.5.2 · equal flow split · single chemical application points §9.5.3 · no single wall filtered/unfiltered §9.5.4.
Storage: chemicals ≥1 month (Table 9-1 example 90 d) §9.1 · clear water ≥2 h / 5–10 % §9.1, §9.5.5.
Safety: Cl2 leak detection (shall), scrubber/neutralisation, eyewash/shower/SCBA §9.8.2 · hazardous chemicals away from admin, spill containment, segregation §9.5.8 · PAC separate storage §7.3.2 · security fence/CCTV (shall) §9.2.13, §9.4.9.
Lab: central, vibration-free, separate HVAC, Table 9-3 kit §9.7.2. I&C: P&ID with legend (shall), instrument list §9.8.1, Auto/Manual/Stop §9.8.2.
Membrane: DIT daily, CIIM ≤15 min per unit, challenge test, SDI <3 for RO, cartridge 5–20 µm §7.6.10, §7.7.9.1, §7.7.11.
O&M: manual ≥1–2 months before start-up; ERP annual update §10.2, §10.4.5.

## 8. App mapping
- **stab.pH / stab.LSI**: Eq 8.1 (pH from Alk/CO2), Eq 8.2–8.4 (LSI, RSI) + Table 8-4 factor method (temperature-aware); CCPP via Eq 8.5–8.6 (needs C-L diagram or iterative carbonate model; Table 8-2 bands); targets: pH 6.5–8.5, Alk & Ca ≥50 mg/L CaCO3, CCPP ≈ +4 mg/L, (Cl+SO4)/Alk ≤0.2, SO4 <350, DO >4; flags LSI < −1.5, RSI ≥10, CCPP < −5.
- **Fe/Mn & special processes (process selection)**: Table 7-1 oxidant/solids ratios → dose & sludge; rules: aeration if Fe only & pH 7–8; Mn needs pH ≥9.5 or strong oxidant (KMnO4/Cl2/ClO2/O3); ≥20 min detention; greensand continuous for Mn-dominant GW; bio-filtration via Table 7-2 window; fluoride: Table 7-3 target, Table 7-4 method matrix; T&O: PAC 5–20 mg/L, 15–60 min; hardness: Table 7-5 class, IX criteria & blend 20–50 mg/L; membrane: Tables 7-6/7-8 ranges, K_t correction, RO R/CF/NDP/n_elements, SDI-based pretreatment selector.
- **Layout**: site area A ≥ Q^0.7 (acres, mgd) + Table 9-2 multipliers (qualitative); expansion staging 5–10 yr, 50-yr design; layout type selector (linear/campus/compact pros-cons); redundancy N-1; clear-water storage "5–10 % of capacity or 2 h" (2 h ≈ 8.3 % Qd), §9.1 says ≥2 h; Table 9-1 as worked reference plant.
- **Laboratory**: Table 9-3 list as default equipment schedule; Table 3-2 holding times; Ch3 QA checks.
- **Instrumentation**: §9.8.1 list → per-unit instrument checklist; §9.8.2 control loops & interlocks; Cl2 leak detection mandatory.
- **Water properties**: Annex I table → interpolate ρ(T), μ(T), ν(T) (also γ, σ, E, Pv) for G-value, Stokes/settling, Reynolds, backwash, membrane flux normalisation (alternatively K_t = K20/1.03^(20−t)).
