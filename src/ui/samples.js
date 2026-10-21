// Sample projects (fictitious schemes for training and demonstration)
import { newProject } from '../engine/index.js';

export const SAMPLES = [
  {
    id: 'wet', title: 'Wet-zone river intake – 42 MLD', sub: 'Gampaha · river source with monsoon turbidity peaks', build: () => newProject(),
  },
  {
    id: 'dry', title: 'Dry-zone reservoir scheme – 12.5 MLD', sub: 'Anuradhapura · irrigation-tank source, algae & hardness', build: () => {
      const p = newProject();
      const i = p.inputs;
      Object.assign(i.setup, { name: 'Sample Reservoir WTP – Dry Zone', code: 'WTP-SMP-DRY', district: 'Anuradhapura', source: 'Irrigation tank (reservoir)', sourceType: 'reservoir', siteGL: 92, siteElevation: 90, rsc: 'RSC – North Central' });
      Object.assign(i.demand, { method: 'rate', basePop: 35000, growthRate: 1.5, areaType: 'uc', lpcd: 120, nonDomPct: 20, bulk: 500, floatPop: 1500, coverageNow: 60, coverageDesign: 95, roundStep: 500 });
      const v = i.quality.values;
      Object.assign(v, { turb: [8, 35], colour: [25, 40], pH: [7.6, 7.4], alk: [95, 85], hard: [140, 160], ca: [32, 30], tds: [210, 260], fe: [0.3, 0.45], mn: [0.08, 0.15], algae: [3500, 8000], f: [0.6, 0.8], cl: [35, 45], toc: [5, 7], tc: [900, 3000], ec_: [80, 300] });
      Object.assign(i.intake, { type: 'tower', bedLevel: 80, LWL: 84, NWL: 87, HFL: 89.5, mainLength: 2200 });
      Object.assign(i.source, { basin: 90, catchment: 250, liveStorage: 30, waterArea: 4, evapStation: 'Colombo', otherUse: 10000, releases: 0.05, L: 26000, H: 95 });
      Object.assign(i.sed, { depth: 3.0 });
      i.floc.stages = [{ G: 40, t: 10 }, { G: 30, t: 10 }, { G: 25, t: 10 }];
      Object.assign(i.storage, { srTWL: 128, mainLength: 6500, gwlDepth: 4 });
      return p;
    },
  },
  {
    id: 'rural', title: 'Rural slow-sand scheme – 2.3 MLD', sub: 'Badulla · upland stream, low turbidity, CBO-style operation', build: () => {
      const p = newProject();
      const i = p.inputs;
      Object.assign(i.setup, { name: 'Sample Rural Water Supply – Slow Sand Filter', code: 'WTP-SMP-SSF', district: 'Badulla', source: 'Upland stream', sourceType: 'river', siteGL: 690, siteElevation: 690, rsc: 'RSC – Uva' });
      Object.assign(i.demand, { method: 'rate', basePop: 13500, growthRate: 0.8, areaType: 'rural', lpcd: 90, nonDomPct: 10, bulk: 50, floatPop: 300, coverageNow: 55, coverageDesign: 90, roundStep: 100, nTrains: 2 });
      const v = i.quality.values;
      Object.assign(v, { turb: [5, 18], colour: [12, 25], pH: [7.0, 6.8], alk: [40, 35], fe: [0.12, 0.25], mn: [0.02, 0.05], cod: [5, 9], toc: [2, 3], tc: [500, 2400], ec_: [50, 240], algae: [60, 150] });
      Object.assign(i.intake, { type: 'weir', bedLevel: 674.5, LWL: 677, NWL: 677.6, HFL: 680.5, mainLength: 450, nDuty: 1, nStandby: 1 });
      Object.assign(i.source, { basin: 60, catchment: 28, dwf: 0.12, releases: 0.02, L: 9000, H: 420, evapStation: 'Peradeniya' });
      Object.assign(i.storage, { srTWL: 735, mainLength: 1800, nDuty: 1, nStandby: 1 });
      return p;
    },
  },
  {
    id: 'cap25', title: 'Specified capacity – 25,000 m³/d plant', sub: 'Kurunegala · design for a pre-determined capacity (no demand forecast)', build: () => {
      const p = newProject();
      const i = p.inputs;
      Object.assign(i.setup, { name: 'Sample 25,000 m³/d Water Treatment Plant (specified capacity)', code: 'WTP-SMP-25K', district: 'Kurunegala', source: 'Deduru Oya', sourceType: 'river', rsc: 'RSC – North Western' });
      Object.assign(i.demand, { basis: 'capacity', capacity: 25000, capacityType: 'throughput', nTrains: 2 });
      return p;
    },
  },
];
