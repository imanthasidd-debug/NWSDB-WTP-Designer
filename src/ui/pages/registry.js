// Page registry (navigation order)
import { setup, demand, quality, source, process } from './basis.js';
import { intake, aeration, coag, rapidmix, floc, sed, filt, dis, stab } from './units.js';
import { storage, sludge, hyd, layout, energy, cost } from './plant.js';
import { dashboard, compliance, checks } from './outputs.js';
import { report, criteria, d2manual, toolbox, help, settings } from './library.js';

export const PAGES = [
  dashboard, setup,
  demand, quality, source, process,
  intake, aeration, coag, rapidmix, floc, sed, filt, dis, stab,
  storage, sludge, hyd, layout, energy, cost,
  compliance, checks, report,
  criteria, d2manual, toolbox, help, settings,
];
export const GROUPS = ['Project', 'Design basis', 'Treatment units', 'Plant-wide', 'Outputs', 'Library'];
