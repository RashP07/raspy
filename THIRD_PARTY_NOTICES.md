# Third-party notices

Raspy includes `libheif-js` 1.19.8 for its lazy HEIC/HEIF import
fallback. `libheif-js` is licensed under LGPL-3.0 and is distributed in
unmodified bundled form.

- Project: https://github.com/catdad-experiments/libheif-js
- License: https://www.gnu.org/licenses/lgpl-3.0.html
- Package version: 1.19.8

The fallback is loaded only when the browser's native image decoder cannot
open an imported HEIC/HEIF file.
