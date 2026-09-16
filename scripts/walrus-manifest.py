"""Refresh pinned portal resources from site-builder publication/update output."""
import re,json,hashlib,pathlib,sys,datetime
root=pathlib.Path('walrus-home');destination=pathlib.Path('deployments/walrus-home-testnet.json')
log=pathlib.Path(sys.argv[1]).read_text()
previous=json.loads(destination.read_text()) if destination.exists() else {'resources':{}}
patches={p:r['patch'] for p,r in previous['resources'].items()}
for path,patch in re.findall(r'(?:created|updated|replaced) resource (\S+) with quilt patch ID (\S+)',log):patches[path]=patch
resources={}
for file in root.rglob('*'):
 if not file.is_file() or file.name=='ws-resources.json':continue
 path='/'+str(file.relative_to(root));digest=hashlib.sha256(file.read_bytes()).hexdigest()
 if path not in patches:raise SystemExit('No Walrus pointer for '+path)
 # If the CLI did not report a new pointer, bytes must still match the previous publication.
 reported=re.search(r'(?:created|updated|replaced) resource '+re.escape(path)+r' with quilt patch ID',log)
 if not reported and previous['resources'].get(path,{}).get('sha256')!=digest:raise SystemExit('Unconfirmed changed resource '+path)
 resources[path]={'patch':patches[path],'sha256':digest}
site=json.loads((root/'ws-resources.json').read_text())
destination.write_text(json.dumps({'network':'testnet','siteObject':site['object_id'],'storageEpochs':30,'publishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'resources':resources},indent=2)+'\n')
