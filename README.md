# London Field Atlas

[Open the interactive map](https://yjyj41.github.io/london-field-atlas/)

Explore London architecture in an isometric, metre-scale 3D map. No account or installation is required to use the website.

## Explore

- 289 architectural destinations, with 275 modelled stops and 272 credited reference photographs.
- Actual OpenStreetMap building footprints, streets and waterways, with continuous central coverage and local patches around more distant destinations.
- Search, building cards, directions, optional names and numbers, and Atlas / Blueprint / Night styles.
- Mark places visited to reveal approximate exterior materials and optional decorative people and planting.
- Download regional or individual mesh models for Rhino 6 or 7; preview your edited models locally in the map.

Visits, style preferences and imported models are stored in your browser on this device. They are not uploaded or synchronised. Records on an older website address do not automatically transfer here.

## Run locally

Install Node.js, clone this repository, then run:

```sh
node serve.cjs
```

Open http://127.0.0.1:4173/ in a modern browser with WebGL enabled. Opening `index.html` directly from disk will not work. There is no package installation or build step: the HTML, CSS and JavaScript here are the application source.

## Hosting and updates

GitHub Pages publishes the root of the `main` branch. `.nojekyll` keeps the runtime assets unchanged. All local asset URLs are relative, so the project works under `/london-field-atlas/` or on a separate domain.

Edit the files, test locally and push to `main` to update the public site. The roughly 223 MiB repository includes downloadable models; visitors load nearby map tiles and selected photographs as needed rather than downloading the entire repository.

## Model data and limitations

One model unit is one metre. Terrain is flat. This is an architectural massing atlas, not a measured survey, navigation system or BIM model. Height values combine recorded heights, storey estimates and fallback assumptions. Some landmark forms are individually refined; others remain approximate or location-only. See the building cards and [catalogue notes](catalog-notes.md).

The complete editable footprint and height dataset is in [`assets/city-data.zip`](assets/city-data.zip). The runtime uses `assets/city.json`, a compressed landmark payload and packed context meshes. See the [Rhino editing guide](rhino-guide.md) for origins, units and mesh import limits.

## Credits and reuse

Map data © OpenStreetMap contributors, under ODbL 1.0. Photographs retain their individual licences and author credits, shown on each building card and recorded in `assets/city.json`. Third-party libraries retain their supplied licences. See [ATTRIBUTION.md](ATTRIBUTION.md).

Public availability of this repository does not replace the separate licences on its data, photographs and dependencies. No blanket licence is granted here over third-party material.
