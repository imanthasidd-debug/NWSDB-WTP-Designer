# NWSDB Design Manual D2 – Urban Water Supply & Distribution (March 1989)
Extracted design rules used by NWSDB WTP Designer (OCR + visual check of the 246-page scan).
Companion manuals referenced by D2: D1 Rural Water Supply, D3 Water Quality & Treatment, D4 Groundwater, D5 M&E/Instrumentation, P1 Planning.
D2 does not cover treatment-unit process design (that is D3); it governs demand, hydrology/source, intakes,
pumping, mains, service reservoirs and cost estimating.

## §2 Basic design considerations
- §2.3 Site planning checklist: location/elevation, flood levels, area for future extension, clearing/earthworks,
  site drainage & wastewater disposal, foundation (trial pits/boreholes), security (fencing, guard house, lighting),
  access roads (incl. to intake), power availability vs generator, land availability, staff quarters & stores.
- §2.4 Design period: urban schemes – 20-yr planning horizon in two 10-yr stages; minor urban & rural – 10 yr.
  Component periods (yr): major dams 50; minor dams/weirs 20; raw-water intakes & infiltration galleries 20;
  pumpsets & WTP M&E 10 (replacement); pumphouses 20; water-treatment structures 20 (2 stages if economical);
  transmission mains 20; ground service reservoirs 20; water towers 20; distribution 20 (staged); feeder mains 20 (staged).

## §3 Population & demand
- §3.1 Graphical linear vs exponential (Pn = P(1+r)^n) projection; district growth rate when history unknown.
- §3.2.1 Domestic (when no better data): community | % HC | HC L/c/d | % standpost | SP L/c/d
  Medium rural 1,000–1,500: 10–20 | – | 80–90 | 45;  Large rural 1,500–5,000: 20–40 | 140 | 60–80 | 45;
  Small urban 5,000–10,000: 30–50 | 185 | 50–70 | 45;  Medium urban 10,000–20,000: 30–60 | 185 | 40–70 | 45;
  Large urban > 20,000: assess individually.
- §3.2.2 Water charges should not exceed about 5 % of household income.
- §3.2.3 Non-domestic: small urban & rural ≈ 10 % of domestic; unit demands (L/d): hospitals 220–300 /bed,
  hotels 180–700 /bed, boarding schools 90–140 /resident, restaurants 60–90 /seat, bus/rail stations 15–20 /user,
  day schools 15–30 /pupil, offices 25–40 /person, factories 20–30 /person, cinemas 10–15 /seat.
- §3.2.4 UFW (not included in per-capita rates): new tight system 10–15 %; rehabilitated 20–25 % or more.
- §3.2.5 Max-day factor 1.1 (< 20,000 pop) to 1.25 (> 20,000); peak-hour (24-h supply, storage tanks) 2.5 (smaller)
  to 2.0 (> 20,000). Source works, intakes, transmission mains, supply pumping, treatment works and service
  reservoirs designed for maximum day. Raw-water facilities & treatment plants sized at 1.05–1.10 × max day
  (treatment losses).

## §4 Hydrology & water resources
- Water balance I + P − E − Y − O = ΔS. Climatic zones: wet 2000–5000 mm; intermediate 1300–3500 mm; dry 1000–2000 mm.
- Table 4.1: 103 river basins – area, annual rainfall, runoff, runoff factor, unit runoff.
- §4.6 Flow measurement (BS 3680, g = 9.78 m/s² in Sri Lanka):
  rectangular full-width weir Q = (2/3)√(2g) Cd b he^1.5, Cd = 0.602 + 0.083 h/P, he = h + 0.0012;
  contracted weir Cd = 0.616(1 − 0.1 h/P) (≈ Q = 1.91 b h^1.5 as printed);
  90° V-notch Q = (8/15)√(2g) Cd h^2.5 (≈ 1.4 h^2.5), notch ≥ 2.5 h above floor, approach width ≥ 5 h;
  60° V-notch ≈ 0.84 h^2.5; broad-crested weir / flume Q = 1.705 b H^1.5; head measured 4–5 h upstream;
  float: surface 1.2 × mean velocity, mid-depth 1.1 ×. Venturi/Dall meters often not working – prefer flumes/weirs.
- §4.7 Drought frequency P = m/(N+1); §4.8 rational formula Q = CIA/360 (≤ 50 km²); C by catchment slope
  < 2 % 0.3, 2–4 % 0.4, > 4 % 0.5 (Table 4.3 for other surfaces); tc = 0.0195 k^0.77 min, k = √(L³/H);
  or tc = L/(60V) + T (V 0.5/0.6/0.9/1.2/1.5 m/s for slopes < 1/1–2/2–4/4–6/> 6 %, T 2–20 min).
  1:10,000-yr specific flood up to 10 m³/s/km² (≈ 4 at 4000 km²).
- §4.9 Sediment: allow 50 years' accumulation; upper Mahaweli ≈ 300 m³/km²/yr.
- §4.10 Evaporation Colombo 2090 mm/yr, Peradeniya 1409 mm/yr (monthly table).
- §4.11 Gross yield = demand + downstream releases + overflows + losses; Rippl mass diagram.

## §5 Intakes
- Variation of river level < 3.5–4.0 m → suction pump on bank possible.
- Submergence of intake pipe / pump suction ≥ 1½–2 × pipe diameter; suction-well plan area 3–5 × intake-pipe area.
- Submerged intake: screened bell-mouth ≥ 1 m above bed; entrance velocity < 0.15 m/s; pipe velocity 0.6–0.9 m/s;
  constant grade. All weirs incorporate a flow-measuring device. Reservoir intakes multi-level, deepest point.
- §5.4 Screens: coarse 75–100 mm openings (bars ≈ 25 mm); removable fine screens ≈ 6 mm, two provided;
  screen velocity ≤ about 1 m/s; clogged-screen head loss ≈ 150 mm max; h = 0.0729 (V² − v²).
- §5.5 Small dams: freeboard ≥ 0.9 m; seepage 0.5 %/month of stored volume when untested.

## §6 Pumping stations
- NPSHa = Habs + Hs − Hf − Hvap; margin ≥ 0.7–1.0 m; storms lower atmospheric pressure by up to 15 %;
  bell-mouth loss 0.1 V²/2g; suction velocity ≤ 1.5 m/s; strainer area ≥ 3 × suction pipe; low-level cut-out.
- Table 6.2 efficiencies: horizontal centrifugal 80–82 % (85 % large); vertical spindle ≈ 3 % lower;
  submersible 73–81 % (≈ 70 % small); motors horizontal 93–95 %, vertical 90–94 %, submersible 85–89 %;
  VSD 3–5 % lower; overall ≈ 75 %; diesel 0.21 kg/kWh good (0.28 usual), lube oil + 5 %.
- 1000 m³/d raised 8.81 m = 1 kW (100 % efficiency). Speeds 1450/2900 rpm. Value of efficiency – capitalise.
- §6.2.6 Design on 24-h pumping at design/stage year; ≤ 6 motor starts per hour.
- §6.3 Concrete 20 MPa (structural), 25 MPa (water-retaining); fy 250/410 MPa; flotation FoS 1.5; 0.6 m clearance
  around equipment.
- §6.4.1 Standby ≥ 30 %: duty 1/2/3/4/5 → standby 1/1/1/2/2; alternative power (engine generator) for all essential
  pumping; investigate surge for all pumping systems.

## §7 Pipelines & valves
- Hazen–Williams Q = 0.279 C D^2.63 S^0.54; Fig 7.6 design C: spun-bitumen-lined (and AC) 130 (< 600 mm),
  140 (≥ 600 mm); coated spun iron 100 (< 300), 110 (300–450), 120 (≥ 450); C at 1 m/s – for 2 m/s reduce 5 %
  (C < 100), 3 % (< 130), 1 % (< 140); increase for 0.5 m/s.
- Velocity ≥ 0.6 m/s (silt); max 1.6–2.5 m/s (surge). Transmission main = max day at constant 24-h flow.
- Table 7.1/7.2 working pressures: uPVC SLS 147 T250/400/600/1000 → 2.5/4/6/10 bar; uPVC BS 3505 C/D/E → 9/12/15 bar;
  DI K9 80–300 40 bar, 350–600 25 bar, 700–1200 16 bar; AC class 15/20/25 → 7.5/10/12.5 bar;
  max sustained ≤ rating and sustained + surge ≤ 1.1 × rating; field test 1.5 × operating, 20 mg/L Cl₂ 24 h.
- Grade ≥ 1:500; cover ≥ 0.8 m (≥ 1.0 m roads); gravity mains HGL above ground, operating head ≥ 4 m;
  pumping mains sized for least combined cost of main + pumping (Annex L); thrust anchorage for 150 % test pressure;
  filling velocity < 0.3 m/s (≤ 0.6).
- Air valves: double orifice at peaks; ≤ 500 m apart on long grades (750 m towards end), double orifice ≥ every 1 km;
  sizes main ≤ 450 → 75, 500–600 → 100, 700–800 → 150, 900 → 2 × 100, 1000–1200 → 2 × 150 mm.
  Washouts at low points: ≤ 500 → 75, 600–800 → 100, 900 → 150, 1000–1200 → 200 mm. Valves ≥ 400 mm by-passed;
  manholes 500 mm near valves on mains ≥ 900 mm; isolating valves on transmission mains ≈ 1.5 km.
- Table 7.3 thrust per bar: blank end p·A, bends 2 p A sin(θ/2).

## §8 Distribution (not WTP scope; summarised)
- Residual pressure at peak hour: rural 6 m, small urban 9–12 m, medium 20 m, large 30 m; static max 60–80 m flat,
  80–100 m hilly. Standposts ≈ 100 persons/tap, 150 m walk; hydrants 2–4 per 1000 persons, 15 l/s minimum fire flow.

## §9 Service reservoirs
- Default diurnal pattern (% of daily demand) 05–06 5, 06–07 12, 07–08 10, 08–09 8, 09–10 4, 10–11 4, 11–12 4.5,
  12–13 8, 13–14 7, 14–15 3, 15–16 4, 16–17 8, 17–18 8.5, 18–19 8, 19–20 3, 20–21 2, 21–22 1, 22–05 0.
- Small/rural storage by daily inflow period: 18–24 h → 50 %, 12–18 h → 33 %, 9–12 h → 25 % of max day.
- Larger systems: ≥ 8 h of max-day demand (33 %) up to 24 h where emergency storage is important.
- Equalising example: 24-h constant supply ≈ 28 %; 12-h pumping ≈ 22 % of peak-day demand.
- Water depth 2.5–5.5 m; 2 compartments; treatment schemes need continuous 24-h operation; SSF never intermittent.

## §10 Costs
- Preliminaries ½–1 % of ECC; land, landscaping, 2 years' O&M, CIF, duty.
- Format: line items incl. contractor OH&P 35 %; + 2 yrs O&M; engineering 8 % (6 % design + 2 % supervision);
  physical contingency 10–15 % (feasibility) or 20 % (pre-feasibility); BTT 3 %; escalation 10–15 % p.a.;
  O&M line items + NWSDB/LA overhead 35 %, projected 20 years; PW on base-year costs.
- O&M: operator(s) (extra for > 12 h/day, 1-month relief), casual labour (SSF 4 labourers 2 weeks every 2 months),
  electricity incl. demand charge at p.f. 0.85, chemicals incl. transport (chlorine 2 mg/L if unknown),
  minor repairs ≈ 1 % of installed M&E cost, contingency 10 %; indirect costs 5 % of direct operating expenses.
- PV = C/(1+r)^n; EAC = C r(1+r)^n/((1+r)^n − 1) (recommended); unit cost = (EAC + O&M)/output; discount 8–15 %.
- Facilities checklist: landscaping, security & fencing, laboratory, communications, domestic water/electricity/
  access roads, quarters, transport, start-up chemicals, access/safety, PPE, spare parts, office furniture, storeroom.
