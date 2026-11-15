"""Build a deterministic, dependency-free globe poster from Natural Earth land.

Reuses the checked-in land point cloud; pass --refresh to rebuild it from
Natural Earth. Markers and arcs come from packages/demo-data/src/regions.json,
the same list the web app uses.
"""
import json, math, sys, urllib.request
from pathlib import Path
root = Path(__file__).resolve().parents[1]
land_file = root/'apps/web/components/land.json'
url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
def build_land():
    data = json.load(urllib.request.urlopen(url))
    polygons=[]
    for f in data['features']:
        g=f['geometry']
        polygons.extend(g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']])
    def inside(x,y,ring):
        result=False
        for a,b in zip(ring,ring[1:]):
            if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]: result=not result
        return result
    bounds=[(min(p[0] for p in rings[0]),max(p[0] for p in rings[0]),min(p[1] for p in rings[0]),max(p[1] for p in rings[0]),rings) for rings in polygons]
    points=[]
    for lat in range(-58,84,2):
        for lon in range(-180,180,2):
            if any(a<=lon<=b and c<=lat<=d and inside(lon,lat,rings[0]) and not any(inside(lon,lat,h) for h in rings[1:]) for a,b,c,d,rings in bounds): points.append([lon,lat])
    land_file.write_text(json.dumps(points,separators=(',',':')))
    return points
points = build_land() if '--refresh' in sys.argv or not land_file.exists() else json.loads(land_file.read_text())

def project(lat,lon,r=244):
    la,lo=map(math.radians,(lat,lon-15)); tilt=math.radians(23)
    x=math.cos(la)*math.sin(lo);y=math.sin(la);z=math.cos(la)*math.cos(lo)
    return 320+r*x,320-r*(y*math.cos(tilt)-z*math.sin(tilt)),y*math.sin(tilt)+z*math.cos(tilt)
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><defs><radialGradient id="sea" cx="30%" cy="24%"><stop stop-color="#164451"/><stop offset=".6" stop-color="#0c2335"/><stop offset="1" stop-color="#050e20"/></radialGradient><radialGradient id="halo"><stop offset=".74" stop-color="#2ef2c7" stop-opacity="0"/><stop offset=".82" stop-color="#2ef2c7" stop-opacity=".13"/><stop offset="1" stop-color="#2ef2c7" stop-opacity="0"/></radialGradient></defs><circle cx="320" cy="320" r="302" fill="url(#halo)"/><circle cx="320" cy="320" r="244" fill="url(#sea)" stroke="#51d8c4" stroke-opacity=".55"/>']
for lon,lat in points:
    x,y,z=project(lat,lon)
    if z>0: svg.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{1.05+z*.35:.2f}" fill="#79cfbf" opacity="{.22+z*.65:.2f}"/>')
regions=json.loads((root/'packages/demo-data/src/regions.json').read_text())
for a,b in [((r['routeFrom']['lat'],r['routeFrom']['lon']),(r['lat'],r['lon'])) for r in regions]:
    x,y,_=project(*a);u,v,_=project(*b)
    svg.append(f'<path d="M{x:.1f},{y:.1f} Q{(x+u)/2:.1f},{min(y,v)-62:.1f} {u:.1f},{v:.1f}" fill="none" stroke="#62f8d8" stroke-width="1.3"/><circle cx="{u:.1f}" cy="{v:.1f}" r="4" fill="#c6fff1"/><circle cx="{u:.1f}" cy="{v:.1f}" r="9" fill="none" stroke="#2ef2c7" stroke-opacity=".4"/>')
svg.append('</svg>')
(root/'apps/web/public/globe-poster.svg').write_text(''.join(svg))
print(f'Generated {len(points)} land points and SVG poster')
