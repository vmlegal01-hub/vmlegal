"""Une cada carpeta data/<colección>/*.json en data/<colección>.json → {"items": [...]}.

El panel guarda un archivo por elemento (miembro, novedad, operación, reseña…),
así crear uno nuevo nunca pisa a otro. El sitio estático no puede listar una
carpeta, por eso este paso (lo corre GitHub Actions al publicar) arma un índice.
Uso local:  python3 scripts/unir_datos.py
"""
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

for folder in sorted(d for d in glob.glob(os.path.join(DATA, '*')) if os.path.isdir(d)):
    items = []
    for f in sorted(glob.glob(os.path.join(folder, '*.json'))):
        # Un archivo dañado no debe frenar la publicación de todo lo demás.
        try:
            with open(f, encoding='utf-8') as fh:
                item = json.load(fh)
        except (ValueError, OSError) as e:
            print('::warning file=%s::Se omite: %s' % (os.path.relpath(f, ROOT), e))
            continue
        if isinstance(item, dict):
            items.append(item)
    name = os.path.basename(folder)
    with open(os.path.join(DATA, name + '.json'), 'w', encoding='utf-8') as fh:
        json.dump({'items': items}, fh, ensure_ascii=False, indent=2)
    print('%s: %d' % (name, len(items)))
