"""Optional offline asset acquisition. Install gradio_client and httpx[socks] separately.

Uses the official public demo, never a paid endpoint. Respect its quotas and login
requirements; a failed request is recorded, not automatically retried.
"""
import hashlib
import json
from pathlib import Path
import shutil
import struct
import sys
from datetime import datetime, timezone
from gradio_client import Client, handle_file

source, output = [Path(p).resolve() for p in sys.argv[1:3]]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 17092026
receipt_path = output.with_suffix('.receipt.json')
output.parent.mkdir(parents=True, exist_ok=True)
if output.exists() or receipt_path.exists():
    raise RuntimeError('Output/receipt already exists; inspect the previous attempt before submitting again')
receipt = {
    'source': str(source), 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'provider': 'Microsoft TRELLIS.2 official public Hugging Face demo',
    'endpoint': 'https://microsoft-trellis-2.hf.space',
    'license_reference': 'https://github.com/microsoft/TRELLIS.2/blob/main/LICENSE',
    'use': 'noncommercial project; free demo only', 'seed': seed,
    'resolution': '1024', 'decimation_target': 100000, 'texture_size': 2048,
    'started_utc': datetime.now(timezone.utc).isoformat(), 'status': 'connecting',
    'visual_qa': 'pending', 'historical_qa': 'pending',
}
def checkpoint(status):
    receipt['status'] = status
    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
    print(status, flush=True)

try:
    checkpoint('connecting')
    client = Client(receipt['endpoint'], httpx_kwargs={'timeout': 60})
    client.predict(api_name='/start_session')
    checkpoint('preprocessing')
    prepared = client.predict(handle_file(str(source)), api_name='/preprocess_image')
    checkpoint('generating')
    client.predict(handle_file(prepared), seed, '1024', 7.5, 0.7, 12, 5.0,
                   7.5, 0.5, 12, 3.0, 1.0, 0.0, 12, 3.0, api_name='/image_to_3d')
    checkpoint('extracting')
    paths = client.predict(100000, 2048, api_name='/extract_glb')
    downloaded = Path(paths[0])
    data = downloaded.read_bytes()
    magic, version, size = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or size != len(data):
        raise RuntimeError('Invalid GLB container')
    length = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20+length])
    if any('uri' in item for item in gltf.get('images', []) + gltf.get('buffers', [])):
        raise RuntimeError('Expected self-contained GLB')
    receipt['triangles'] = sum(gltf['accessors'][p['indices']]['count'] // 3
        for mesh in gltf['meshes'] for p in mesh['primitives'])
    receipt['vertices'] = sum(gltf['accessors'][p['attributes']['POSITION']]['count']
        for mesh in gltf['meshes'] for p in mesh['primitives'])
    receipt['materials'] = gltf.get('materials', [])
    receipt['extensions_required'] = gltf.get('extensionsRequired', [])
    receipt['output_sha256'] = hashlib.sha256(data).hexdigest()
    receipt['output_bytes'] = len(data)
    receipt['output'] = str(output)
    shutil.copyfile(downloaded, output)
    checkpoint('downloaded_not_visually_accepted')
except Exception as error:
    receipt['error'] = str(error)
    checkpoint('failed_no_automatic_retry')
    raise
