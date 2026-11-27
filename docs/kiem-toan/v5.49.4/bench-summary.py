import json,sys
for line in open(sys.argv[1]):
    if line.startswith('{"clients') or line.startswith('{"burst'):
        d=json.loads(line)
        k='clients' if 'clients' in d else 'burst'
        print(k,d[k],'ok',d['ok'],'busy',d['busy'],'unc',d['uncertain'],'err',d['error'],'p50',d['p50'],'p95',d['p95'],'p99',d['p99'],'max',d['max'],'fair',d.get('fairness'),'viol',d['violations'],'peaks',d['peaks'], d['errors'][:2])
