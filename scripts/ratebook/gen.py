import json, sys
# Intermediate extraction files of the 2025 Rate Book PDF (not kept in the repo): set RB_EXTRACT_DIR to their folder
R=__import__('os').environ.get('RB_EXTRACT_DIR', 'rb') + '/'
pv=json.load(open(R+'out_pipes_valves.json'))
cv=json.load(open(R+'out_civil.json'))
ct=json.load(open(R+'out_chem_tariff.json'))
gr=json.load(open(R+'out_graphs.json'))
# DI from text (already read) – parse v1a pages 37-39
pages=open(R+'v1a.txt').read().split('\f')
import re
def rows(page, ncols):
    out=[]
    for ln in pages[page-1].split('\n'):
        t=ln.split()
        if not t or not t[0].isdigit(): continue
        nums=[x.replace(',','') for x in t]
        try:
            dn=int(nums[0])
        except: continue
        vals=[]
        for x in nums[1:]:
            try: vals.append(float(x))
            except: vals.append(x)
        if len(vals)>=ncols and dn>=80: out.append([dn]+vals)
    return out
di1=rows(37,10); di2=rows(38,10); di3=rows(39,8)
assert len(di1)==18 and len(di2)==18 and len(di3)==18, (len(di1),len(di2),len(di3))
D={}
D['di']={'supplyAsian':[[r[0],r[7],r[11]] for r in di1],'supplyNonAsian':[[r[0],r[7],r[11]] for r in di2],
 'cls':{str(r[0]):r[1] for r in di1},
 'laying':[[r[0],r[3],r[5],r[6],r[7],r[8]] for r in di3],
 'ref':{'supplyAsian':'A-DI/1 col 7 (transmission) / col 11 (distribution)','supplyNonAsian':'A-DI/2','laying':'A-DI/3 col 4/6 laying, col 8 excavation (gravel), col 9 EWS (loose), col 10 dewatering','page':'Vol I pp 7-9'}}
h=pv['hdpe']
def hs(t): return [[r['dn'],r['tm_total_supply_cost'],r['ds_total_supply_cost']] for r in h[t]['rows']]
def hl(t): return [[r['dn'],r['tm_total_laying_cost'],r['ds_total_laying_cost'],r['excavation_cost_firm_sand'],r['ews_cost'],r['dewatering']] for r in h[t]['rows']]
D['hdpe']={'pn10':{'supplyAsian':hs('supply_sdr17_pn10_asian'),'supplyNonAsian':hs('supply_sdr17_pn10_non_asian'),'local':[[r['dn'],r['total_supply_cost']] for r in h['supply_sdr17_pn10_local']['rows']],'laying':hl('laying_sdr17_pn10')},
 'pn16':{'supplyAsian':hs('supply_sdr11_pn16_asian'),'supplyNonAsian':hs('supply_sdr11_pn16_non_asian'),'local':[[r['dn'],r['total_supply_cost']] for r in h['supply_sdr11_pn16_local']['rows']],'laying':hl('laying_sdr11_pn16')},
 'ref':'A-PE/1-6 (Vol I pp 12-17), B-PE/1B, 3B (local)'}
p=pv['pvc']
D['pvc']={'pnt7':[[r['dn'],r['supply_pipes_only'],r['supply_distribution_system']] for r in p['supply_pnt7']['rows']],
 'pnt11':[[r['dn'],r['supply_pipes_only'],r['supply_distribution_system']] for r in p['supply_pnt11']['rows']],
 'laying':[[r['dn'],r['basic_laying_cost'],r['total_laying_cost'],r['excavation'],r['earthwork_support'],r['dewatering']] for r in p['laying']['rows']],
 'ref':'A-PVC/1-3 (Vol I pp 3-4)'}
D['pipeNotes']={'di':p.get('notes') and None}
# valves
V=[{k:x.get(k) for k in ('table','item','group','desc','unit','rate','dn')} for x in pv['valves']]
D['valves']=V
D['chambers']=pv['valve_chambers']
D['meters']=pv['flow_meters']
D['location']=[[x['location'],x['factor']] for x in pv['location_factors'] if x.get('type')=='district']
D['locationExtra']=[x for x in pv['location_factors'] if x.get('type')!='district']
# graphs
G={}
for g in gr['graphs']:
    G[g['id']]={'title':g['title'],'file':g.get('file'),'page':g.get('page'),'x':g['x'],'y':g['y'],'notes':g.get('notes',[]),
      'series':[{'name':s['name'],'pts':[[round(a,4),round(b,1)] for a,b in s['points']]} for s in g['series']]}
D['graphs']=G
D['motors']=gr['tables'].get('motors_M01')
# civil
D['civil']=cv['key_rates']
D['misA']=cv['mis_A']
D['filterMedia']=cv['filter_media']
D['lab']={'total_one_each':cv['lab'].get('total_one_each'),'wtp_core_total':cv['lab'].get('wtp_core_total'),'wtp_core_items':cv['lab'].get('wtp_core_items')}
# chem/tariff
D['chemicals']=[{k:x.get(k) for k in ('table','item','name','unit','rate','role','derived_rate_LKR_per_kg','page')} for x in ct['chemicals']]
D['chemNotIn']=ct.get('chemicals_not_in_rate_book')
D['ceb']=ct['ceb_tariff']
D['labour']=ct['labour']
D['materials']=ct['materials']
D['cebConstruction']=ct['ceb_construction']
D['vat']=ct['vat']
D['estimate']=ct['estimate_format']
D['importTariff']=ct['import_tariff']
D['waterTariff']=ct.get('water_tariff_summary')
s=json.dumps(D, ensure_ascii=False, separators=(',',':'))
open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'src', 'core', 'ratebook.data.js'),'w').write('// AUTO-GENERATED from the NWSDB Rate Book 2025 (QS Section, P&D Division), Vols I & II – see scripts/ratebook\n// eslint-disable-next-line\nexport const RB_DATA = '+s+';\n')
print(len(s), {k:(len(v) if hasattr(v,'__len__') else v) for k,v in D.items()})
