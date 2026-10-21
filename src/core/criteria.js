// Design-criteria library. Each entry gives the acceptable range used by the design checks.
// Sources:  D2 = NWSDB Design Manual D2 "Urban Water Supply and Distribution" (March 1989) – governs demand,
//           hydrology, intakes, pumping, mains, service reservoirs and costing (cited by clause);
//           LN = University lecture notes (Dr B. Gunawardana, 2020) supplied with this project
//           AWWA = AWWA/ASCE "Water Treatment Plant Design" (5th ed.);  KAW = Kawamura, "Integrated Design and
//           Operation of Water Treatment Facilities";  GLUMRB = "Ten States Standards";  WHO = WHO GDWQ 4th ed.;
//           SLS = SLS 614:2013;  IRC = IRC/WHO small community water supplies;  NWSDB = typical NWSDB practice —
//           every value is editable in the Design Criteria page and saved with the project.

export const CRITERIA = {
  // ---------------- Demand (NWSDB Design Manual D2, 1989) ----------------
  'dem.lpcd': { group: 'Demand', label: 'Domestic per-capita consumption', unit: 'L/c/d', min: 90, max: 200, typ: 140, src: 'NWSDB D2 §3.2.1 – 140/185 L/c/d house connections, 45 standposts; P1 – 100–200 by density' },
  'dem.lpcdD2': { group: 'Demand', label: 'Per-capita vs D2 community table', unit: 'L/c/d', min: 0, max: 1e9, typ: 140, src: 'NWSDB D2 §3.2.1' },
  'dem.horizon': { group: 'Demand', label: 'Planning horizon', unit: 'years', min: 20, max: 30, hardMin: 10, typ: 20, src: 'NWSDB D2 §2.4 – urban 20 yr in two 10-yr stages; rural 10 yr' },
  'dem.nrw': { group: 'Demand', label: 'Unaccounted-for (non-revenue) water', unit: '%', min: 10, max: 25, hardMax: 50, typ: 20, src: 'NWSDB D2 §3.2.4 – new 10–15 %, rehabilitated 20–25 %' },
  'dem.mdf': { group: 'Demand', label: 'Maximum-day factor', unit: '–', min: 1.1, max: 1.25, hardMax: 1.5, typ: 1.25, src: 'NWSDB D2 §3.2.5 – 1.1 (< 20,000) to 1.25 (> 20,000)' },
  'dem.phf': { group: 'Demand', label: 'Peak-hour factor', unit: '–', min: 2.0, max: 2.5, hardMin: 1.5, hardMax: 3.0, typ: 2.0, src: 'NWSDB D2 §3.2.5 – 2.5 (smaller urban) to 2.0 (> 20,000)' },
  'dem.own': { group: 'Demand', label: 'Raw-water & treatment losses (× max day)', unit: '%', min: 5, max: 10, hardMin: 2, hardMax: 15, typ: 5, src: 'NWSDB D2 §3.2.5 – 1.05 to 1.10 × maximum day' },

  // ---------------- Source & hydrology (D2 §4) ----------------
  'src.abstraction': { group: 'Source', label: 'Abstraction / dependable dry-weather flow', unit: '%', min: 0, max: 80, hardMax: 100, typ: 50, src: 'NWSDB D2 §4.11–4.12 – leave prior rights & releases' },
  'src.meanAbs': { group: 'Source', label: 'Abstraction / mean annual flow', unit: '%', min: 0, max: 30, hardMax: 60, typ: 10, src: 'NWSDB D2 §4.11 (screening)' },
  'src.rippl': { group: 'Source', label: 'Live storage available / required (Rippl)', unit: '–', min: 1.0, max: 1e9, hardMin: 0.8, typ: 1.2, src: 'NWSDB D2 §4.11 – mass diagram' },

  // ---------------- Intake & screens (D2 §5, §6) ----------------
  'int.portV': { group: 'Intake', label: 'Entrance velocity at intake ports / bell-mouth', unit: 'm/s', min: 0.05, max: 0.15, hardMax: 0.3, typ: 0.15, src: 'NWSDB D2 §5.3.1 – < 0.15 m/s to minimise silt' },
  'int.bellmouth': { group: 'Intake', label: 'Intake opening above river bed', unit: 'm', min: 1.0, max: 1e9, hardMin: 0.5, typ: 1.0, src: 'NWSDB D2 §5.3.1 – at least 1 m above bed' },
  'int.submergence': { group: 'Intake', label: 'Submergence / intake-pipe diameter', unit: '× D', min: 1.5, max: 1e9, hardMin: 1.0, typ: 2, src: 'NWSDB D2 §5.3.1 – at least 1½ to 2 × D' },
  'int.wellArea': { group: 'Intake', label: 'Suction-well plan area / intake-pipe area', unit: '×', min: 3, max: 1e9, hardMin: 2, typ: 4, src: 'NWSDB D2 §5.3.1 – 3 to 5 ×' },
  'scr.coarseOpen': { group: 'Intake', label: 'Coarse screen clear opening', unit: 'mm', min: 75, max: 100, hardMin: 25, typ: 75, src: 'NWSDB D2 §5.4 – 75–100 mm (LN ≈ 75 mm)' },
  'scr.coarseV': { group: 'Intake', label: 'Velocity through coarse screen', unit: 'm/s', min: 0.1, max: 1.0, hardMax: 1.2, typ: 0.5, src: 'NWSDB D2 §5.4 – ≤ about 1 m/s (LN < 0.5 preferred)' },
  'scr.fineOpen': { group: 'Intake', label: 'Fine screen clear opening', unit: 'mm', min: 5, max: 10, hardMax: 20, typ: 6, src: 'NWSDB D2 §5.4 – about 6 mm (LN 5–20 mm)' },
  'scr.fineV': { group: 'Intake', label: 'Velocity through fine screen', unit: 'm/s', min: 0.2, max: 1.0, hardMax: 1.2, typ: 0.6, src: 'NWSDB D2 §5.4 – ≤ about 1 m/s' },
  'scr.headloss': { group: 'Intake', label: 'Head loss through a clogged screen', unit: 'm', min: 0, max: 0.15, hardMax: 0.3, typ: 0.1, src: 'NWSDB D2 §5.4 – about 150 mm maximum' },
  'pipe.rawV': { group: 'Intake', label: 'Velocity in raw-water rising main', unit: 'm/s', min: 0.6, max: 1.6, hardMin: 0.3, hardMax: 2.5, typ: 1.2, src: 'NWSDB D2 §7.3.2 – ≥ 0.6 (silt), ≤ 1.6–2.5 (surge)' },
  'pipe.gravV': { group: 'Intake', label: 'Velocity in intake pipe / conduit', unit: 'm/s', min: 0.6, max: 0.9, hardMax: 1.5, typ: 0.75, src: 'NWSDB D2 §5.3.1 – 0.6 to 0.9 m/s' },
  'well.hrt': { group: 'Intake', label: 'Wet-well (sump) effective storage', unit: 'min', min: 3, max: 15, typ: 5, src: 'Hydraulic Institute; D2 §6.2.6 – limit motor starts' },
  'pump.npshMargin': { group: 'Intake', label: 'NPSH available (storm) − required', unit: 'm', min: 1.0, max: 1e9, hardMin: 0.7, typ: 1.5, src: 'NWSDB D2 §6.2.2 – margin ≥ 0.7–1.0 m; storm −15 % atmospheric' },
  'pump.suctionV': { group: 'Intake', label: 'Pump suction-pipe velocity', unit: 'm/s', min: 0, max: 1.5, hardMax: 2.0, typ: 1.2, src: 'NWSDB D2 §6.2.2 – ≤ 1.5 m/s' },

  // ---------------- Aeration ----------------
  'aer.stepH': { group: 'Aeration', label: 'Cascade step height', unit: 'm', min: 0.2, max: 0.4, hardMax: 0.7, typ: 0.3, src: 'LN – 0.2–0.4 m common (≤ 0.7 m)' },
  'aer.cascadeArea': { group: 'Aeration', label: 'Cascade area loading', unit: 'm² per m³/h', min: 0.015, max: 0.045, typ: 0.03, src: 'IRC/WHO' },
  'aer.trayArea': { group: 'Aeration', label: 'Tray aerator area loading', unit: 'm² per m³/h', min: 0.05, max: 0.15, typ: 0.08, src: 'IRC/WHO' },
  'aer.traySpacing': { group: 'Aeration', label: 'Tray spacing', unit: 'm', min: 0.3, max: 0.75, typ: 0.5, src: 'IRC/WHO' },

  // ---------------- Coagulation ----------------
  'coag.pH': { group: 'Coagulation', label: 'Coagulation pH (alum)', unit: '–', min: 5.8, max: 7.2, hardMin: 5.3, hardMax: 7.8, typ: 6.5, src: 'LN – min. Al solubility 5.34–6.96' },
  'coag.resAlk': { group: 'Coagulation', label: 'Residual alkalinity after coagulation', unit: 'mg/L CaCO₃', min: 20, max: 200, hardMin: 10, typ: 30, src: 'AWWA' },
  'coag.solConc': { group: 'Coagulation', label: 'Coagulant solution strength', unit: '% w/v', min: 5, max: 10, typ: 8, src: 'NWSDB practice' },
  'coag.storage': { group: 'Coagulation', label: 'Chemical storage period', unit: 'days', min: 30, max: 90, typ: 30, src: 'GLUMRB – ≥ 30 days' },
  'coag.turndown': { group: 'Coagulation', label: 'Dosing-pump turndown required', unit: ': 1', min: 1, max: 10, typ: 5, src: 'Typical diaphragm pump 10:1' },

  // ---------------- Rapid mix ----------------
  'rm.G': { group: 'Rapid mixing', label: 'Velocity gradient G (rapid mix)', unit: 's⁻¹', min: 700, max: 1000, hardMin: 300, hardMax: 1500, typ: 800, src: 'LN – 700 to 1000 s⁻¹' },
  'rm.t': { group: 'Rapid mixing', label: 'Rapid-mix detention time', unit: 's', min: 10, max: 60, typ: 30, src: 'LN – 30–60 s; AWWA 10–60 s' },
  'rm.Fr': { group: 'Rapid mixing', label: 'Upstream Froude number (hydraulic jump)', unit: '–', min: 4.5, max: 9.0, hardMin: 2.5, typ: 6, src: 'Chow – steady jump' },
  'rm.Re': { group: 'Rapid mixing', label: 'Impeller Reynolds number', unit: '–', min: 10000, max: 1e9, typ: 1e5, src: 'Turbulent regime' },

  // ---------------- Flocculation ----------------
  'fl.G': { group: 'Flocculation', label: 'Velocity gradient G (flocculation)', unit: 's⁻¹', min: 20, max: 80, hardMin: 10, hardMax: 100, typ: 40, src: 'LN – 20 to 80 s⁻¹' },
  'fl.t': { group: 'Flocculation', label: 'Flocculation time', unit: 'min', min: 20, max: 60, hardMin: 15, typ: 30, src: 'LN – 20 to 60 min (≈30 typical)' },
  'fl.Gt': { group: 'Flocculation', label: 'Gt (dimensionless)', unit: '–', disp: '2×10⁴ – 10⁵', min: 2e4, max: 1e5, hardMin: 1e4, hardMax: 2e5, typ: 6e4, src: 'LN – 2×10⁴ to 10⁵' },
  'fl.v': { group: 'Flocculation', label: 'Velocity in baffled channels', unit: 'm/s', min: 0.1, max: 0.4, typ: 0.2, src: 'KAW / Schulz & Okun' },
  'fl.spacing': { group: 'Flocculation', label: 'Clear baffle spacing', unit: 'm', min: 0.45, max: 3, hardMin: 0.3, typ: 0.6, src: 'Schulz & Okun – ≥ 0.45 m for cleaning' },
  'fl.tip': { group: 'Flocculation', label: 'Paddle tip speed', unit: 'm/s', min: 0.15, max: 0.75, hardMax: 0.9, typ: 0.5, src: 'AWWA' },
  'fl.paddleRatio': { group: 'Flocculation', label: 'Paddle area / tank cross-section', unit: '%', min: 5, max: 20, hardMax: 25, typ: 15, src: 'Fair, Geyer & Okun' },
  'fl.hl': { group: 'Flocculation', label: 'Total flocculator head loss', unit: 'm', min: 0.05, max: 0.9, typ: 0.4, src: 'Hydraulic flocculators' },

  // ---------------- Sedimentation ----------------
  'sed.sor': { group: 'Sedimentation', label: 'Surface overflow rate (conventional)', unit: 'm³/m²·d', min: 20, max: 40, hardMax: 60, typ: 30, src: 'AWWA/KAW; LN alum floc 2–4.5 m/h' },
  'sed.hrt': { group: 'Sedimentation', label: 'Detention time', unit: 'h', min: 2, max: 4, hardMin: 1.5, hardMax: 6, typ: 3, src: 'LN – 2 to 5 h' },
  'sed.depth': { group: 'Sedimentation', label: 'Side water depth', unit: 'm', min: 3, max: 5, typ: 3.5, src: 'AWWA' },
  'sed.LW': { group: 'Sedimentation', label: 'Length : width ratio', unit: '–', min: 4, max: 6, hardMin: 3, typ: 5, src: 'AWWA / KAW' },
  'sed.LD': { group: 'Sedimentation', label: 'Length : depth ratio', unit: '–', min: 10, max: 30, typ: 20, src: 'KAW (≥ 15 preferred for large basins)' },
  'sed.vh': { group: 'Sedimentation', label: 'Mean horizontal velocity', unit: 'm/min', min: 0.05, max: 1.1, typ: 0.5, src: 'KAW 0.3–1.1 m/min' },
  'sed.weir': { group: 'Sedimentation', label: 'Weir loading rate', unit: 'm³/m·d', min: 0, max: 250, hardMax: 300, typ: 200, src: 'GLUMRB ≤ 248 m³/m·d' },
  'sed.Re': { group: 'Sedimentation', label: 'Reynolds number', unit: '–', min: 0, max: 20000, typ: 10000, src: 'KAW < 20 000' },
  'sed.Fr': { group: 'Sedimentation', label: 'Froude number (flow stability, advisory)', unit: '–', advisory: true, min: 1e-5, max: 1e9, typ: 1e-4, src: 'KAW > 10⁻⁵ (flow stability)' },
  'sed.portV': { group: 'Sedimentation', label: 'Inlet diffuser-wall port velocity', unit: 'm/s', min: 0.15, max: 0.3, typ: 0.2, src: 'KAW' },
  'sed.circD': { group: 'Sedimentation', label: 'Circular clarifier diameter', unit: 'm', min: 6, max: 45, hardMax: 60, typ: 25, src: 'AWWA' },
  'tube.loading': { group: 'Sedimentation', label: 'Tube-settler surface loading (covered area)', unit: 'm/h', min: 2.5, max: 6, hardMax: 7.5, typ: 4, src: 'AWWA / manufacturers' },
  'tube.Re': { group: 'Sedimentation', label: 'Reynolds number in tubes', unit: '–', min: 0, max: 200, hardMax: 500, typ: 100, src: 'Laminar flow (Yao)' },

  // ---------------- Filtration ----------------
  'f.rate': { group: 'Filtration', label: 'Filtration rate – rapid sand', unit: 'm/h', min: 5, max: 7.5, hardMax: 10, typ: 6, src: 'LN – 5 to 10 m/h' },
  'f.rateDual': { group: 'Filtration', label: 'Filtration rate – dual media', unit: 'm/h', min: 7.5, max: 12, hardMax: 15, typ: 10, src: 'AWWA' },
  'f.rateSSF': { group: 'Filtration', label: 'Filtration rate – slow sand', unit: 'm/h', min: 0.1, max: 0.3, hardMax: 0.4, typ: 0.15, src: 'LN – 0.1 to 0.3 m/h' },
  'f.rateMax': { group: 'Filtration', label: 'Rate with one filter out of service', unit: 'm/h', min: 0, max: 10, hardMax: 12.5, typ: 7.5, src: 'AWWA' },
  'f.area': { group: 'Filtration', label: 'Area of one filter', unit: 'm²', min: 10, max: 100, hardMax: 150, typ: 50, src: 'KAW' },
  'f.ES': { group: 'Filtration', label: 'Sand effective size (d₁₀)', unit: 'mm', min: 0.45, max: 0.55, hardMin: 0.35, hardMax: 0.8, typ: 0.5, src: 'LN – 0.45–0.55 mm' },
  'f.UC': { group: 'Filtration', label: 'Sand uniformity coefficient', unit: '–', min: 1.2, max: 1.7, hardMax: 2.0, typ: 1.5, src: 'LN – 1.2–1.7' },
  'f.depth': { group: 'Filtration', label: 'Sand bed depth', unit: 'm', min: 0.6, max: 0.75, hardMin: 0.5, typ: 0.7, src: 'LN – 0.6–0.7 m' },
  'f.water': { group: 'Filtration', label: 'Water depth over media', unit: 'm', min: 1.0, max: 2.0, typ: 1.5, src: 'LN – 1 to 1.5 m supernatant' },
  'f.expansion': { group: 'Filtration', label: 'Bed expansion during backwash', unit: '%', min: 20, max: 50, hardMin: 10, hardMax: 60, typ: 30, src: 'AWWA' },
  'f.bwPct': { group: 'Filtration', label: 'Backwash water as % of production', unit: '%', min: 0, max: 4, hardMax: 6, typ: 2.5, src: 'KAW' },
  'f.run': { group: 'Filtration', label: 'Filter run length', unit: 'h', min: 24, max: 96, hardMin: 12, typ: 48, src: 'AWWA' },
  'f.UFRV': { group: 'Filtration', label: 'Unit filter run volume', unit: 'm³/m²', min: 200, max: 1e9, hardMin: 100, typ: 300, src: 'AWWA – ≥ 200 m³/m²' },
  'f.troughSp': { group: 'Filtration', label: 'Wash-trough centre spacing', unit: 'm', min: 1.0, max: 2.1, typ: 1.8, src: 'AWWA 1.5–2.1 m' },
  'f.orificeRatio': { group: 'Filtration', label: 'Orifice area / filter area', unit: '%', min: 0.2, max: 0.5, typ: 0.3, src: 'Fair, Geyer & Okun' },
  'f.latOrif': { group: 'Filtration', label: 'Lateral area / orifice area served', unit: '–', min: 2, max: 4, typ: 3, src: 'Fair, Geyer & Okun' },
  'f.manLat': { group: 'Filtration', label: 'Manifold area / total lateral area', unit: '–', min: 1.5, max: 3, typ: 2, src: 'Fair, Geyer & Okun' },
  'f.latLD': { group: 'Filtration', label: 'Lateral length / diameter', unit: '–', min: 0, max: 60, typ: 40, src: 'Fair, Geyer & Okun' },
  'f.vInf': { group: 'Filtration', label: 'Velocity – filter influent pipe', unit: 'm/s', min: 0.3, max: 1.2, typ: 0.6, src: 'KAW' },
  'f.vEff': { group: 'Filtration', label: 'Velocity – filtered water pipe', unit: 'm/s', min: 0.9, max: 1.8, typ: 1.5, src: 'KAW' },
  'f.vWash': { group: 'Filtration', label: 'Velocity – wash water pipe', unit: 'm/s', min: 1.5, max: 3.0, typ: 2.4, src: 'KAW' },
  'f.vWaste': { group: 'Filtration', label: 'Velocity – wash waste pipe', unit: 'm/s', min: 1.0, max: 2.4, typ: 1.5, src: 'KAW' },
  'f.ssfDepth': { group: 'Filtration', label: 'Slow sand bed depth (initial)', unit: 'm', min: 0.9, max: 1.2, typ: 1.0, src: 'LN – approx. 1 m' },
  'f.ssfES': { group: 'Filtration', label: 'Slow sand effective size', unit: 'mm', min: 0.15, max: 0.35, typ: 0.2, src: 'LN – 0.15–0.35 mm' },
  'f.ssfTurb': { group: 'Filtration', label: 'Raw turbidity to slow sand filter', unit: 'NTU', min: 0, max: 20, hardMax: 50, typ: 10, src: 'IRC – < 10–20 NTU' },

  // ---------------- Disinfection ----------------
  'dis.residual': { group: 'Disinfection', label: 'Free chlorine residual leaving plant', unit: 'mg/L', min: 0.5, max: 1.0, hardMin: 0.2, hardMax: 1.5, typ: 1.0, src: 'LN 0.2–1.0; SLS 614 – 1 mg/L' },
  'dis.contact': { group: 'Disinfection', label: 'Chlorine contact time (T₁₀)', unit: 'min', min: 30, max: 1e4, hardMin: 10, typ: 30, src: 'WHO ≥ 30 min; LN ≥ 10 min' },
  'dis.ctRatio': { group: 'Disinfection', label: 'CT provided / CT required', unit: '–', min: 1.0, max: 1e4, hardMin: 1.0, typ: 1.5, src: 'USEPA SWTR' },
  'dis.pH': { group: 'Disinfection', label: 'pH during chlorination', unit: '–', min: 6.0, max: 8.0, typ: 7.2, src: 'LN – pH ≤ 7 favours HOCl; WHO pH < 8' },
  'dis.LW': { group: 'Disinfection', label: 'Contact tank flow-path L : W', unit: '–', min: 20, max: 1e4, hardMin: 10, typ: 40, src: 'USEPA – baffling' },

  // ---------------- Stabilisation ----------------
  'stab.pH': { group: 'Stabilisation', label: 'Final water pH', unit: '–', min: 7.0, max: 8.5, hardMin: 6.5, hardMax: 8.5, typ: 7.5, src: 'SLS 614 6.5–8.5' },
  'stab.LSI': { group: 'Stabilisation', label: 'Langelier saturation index (final)', unit: '–', min: -0.5, max: 0.5, hardMin: -2, hardMax: 1, typ: 0.0, src: 'AWWA' },

  // ---------------- Storage ----------------
  'cwr.hours': { group: 'Storage', label: 'Clear-water reservoir storage', unit: 'h of Q', min: 2, max: 8, typ: 4, src: 'NWSDB practice' },
  'cwr.depth': { group: 'Storage', label: 'Reservoir water depth', unit: 'm', min: 2.5, max: 5.5, hardMax: 7, typ: 4.5, src: 'NWSDB D2 §9.4 – normally 2.5–5.5 m' },
  'pipe.twV': { group: 'Storage', label: 'Velocity in treated-water main', unit: 'm/s', min: 0.6, max: 1.6, hardMin: 0.3, hardMax: 2.5, typ: 1.2, src: 'NWSDB D2 §7.3.2 – ≥ 0.6 (silt), ≤ 1.6–2.5 (surge)' },
  'sr.depth': { group: 'Storage', label: 'Service-reservoir water depth', unit: 'm', min: 2.5, max: 5.5, hardMax: 7, typ: 4, src: 'NWSDB D2 §9.4' },
  'sr.capacity': { group: 'Storage', label: 'Service-reservoir capacity (% of max day)', unit: '%', min: 33, max: 100, hardMin: 20, typ: 40, src: 'NWSDB D2 §9.2 – ≥ 8 h (33 %) larger systems; 25–50 % small schemes' },
  'pump.hours': { group: 'Storage', label: 'Transmission pumping hours', unit: 'h/d', min: 20, max: 24, hardMin: 8, typ: 24, src: 'NWSDB D2 §6.2.6, §7.3.2 – design on 24-h pumping at max day' },
  'main.surge': { group: 'Storage', label: 'Max. pressure (sustained + surge) / pipe rating', unit: '–', min: 0, max: 1.0, hardMax: 1.1, typ: 0.8, src: 'NWSDB D2 Table 7.2 note 3 – ≤ 1.1 × working pressure (DI, steel); uPVC surge within rating' },
  'struct.flotation': { group: 'Storage', label: 'Flotation safety factor (empty, high groundwater)', unit: '–', min: 1.5, max: 1e9, hardMin: 1.1, typ: 1.6, src: 'NWSDB D2 §6.3 – FoS 1.5' },

  // ---------------- Sludge ----------------
  'sl.thickLoad': { group: 'Sludge', label: 'Thickener solids loading (alum sludge)', unit: 'kg/m²·d', min: 10, max: 25, hardMax: 40, typ: 15, src: 'AWWA residuals' },
  'sl.recycle': { group: 'Sludge', label: 'Recovered wash-water recycle rate', unit: '% of Q', min: 0, max: 10, typ: 5, src: 'USEPA Filter Backwash Recycling Rule' },
  'sl.bedLoad': { group: 'Sludge', label: 'Drying-bed solids loading per cycle', unit: 'kg DS/m²', min: 5, max: 25, typ: 12, src: 'AWWA residuals' },

  // ---------------- General hydraulics ----------------
  'hyd.freeboard': { group: 'Hydraulics', label: 'Freeboard of open tanks', unit: 'm', min: 0.3, max: 0.75, typ: 0.5, src: 'Standard practice' },
  'hyd.channelV': { group: 'Hydraulics', label: 'Velocity in open channels (flocculated water)', unit: 'm/s', min: 0.15, max: 0.6, typ: 0.3, src: 'KAW – avoid floc break-up' },
};

/**
 * Evaluate a check. Returns {status:'ok'|'warn'|'fail', ...}
 */
export function evaluate(crit, value) {
  if (!crit || value === null || value === undefined || Number.isNaN(value)) return 'na';
  const { min = -Infinity, max = Infinity, hardMin, hardMax } = crit;
  if ((hardMin !== undefined && value < hardMin - 1e-12) || (hardMax !== undefined && value > hardMax + 1e-12)) return 'fail';
  if (value < min - 1e-12 || value > max + 1e-12) return crit.advisory ? 'info' : 'warn';
  return 'ok';
}
export function rangeText(c) {
  if (!c) return '';
  const f = (v) => {
    const a = Math.abs(v);
    if (a !== 0 && a < 1e-3) return v.toExponential(0).replace('e-', '×10^-');
    if (a >= 1e4) return v.toLocaleString('en-US');
    return String(+v.toPrecision(4));
  };
  if (c.disp) return c.disp;
  const hasMin = c.min !== undefined && c.min !== -Infinity && c.min > 0;
  const hasMax = c.max !== undefined && c.max !== Infinity && c.max < 1e4 || (c.max === 20000);
  if (hasMin && !hasMax) return `≥ ${f(c.min)}`;
  if (!hasMin && hasMax) return `≤ ${f(c.max)}`;
  if (hasMin && hasMax) return `${f(c.min)} – ${f(c.max)}`;
  return '';
}
