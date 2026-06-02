# @mongodb-js/aggregation-stage-icons

Icon set for MongoDB aggregation pipeline stages.

## Usage

### React component

```tsx
import { StageIcon } from '@mongodb-js/aggregation-stage-icons';

<StageIcon stage="$match" />
<StageIcon stage="$group" width={16} height={16} className="my-icon" />
```

### SVG paths

`stageIconPaths` maps each stage name to its SVG path (d):

```ts
import {
  stageIconPaths,
  aggregationStageNames,
} from '@mongodb-js/aggregation-stage-icons';

stageIcons['$match']; // 'M18.5 6.25C18.791 6.25...'
aggregationStageNames; // ['$addFields', '$bucket', ...]
```

## Adding or updating icons

Drop the `.svg` file into [`src/icons/`](./src/icons) named after its stage (e.g. `$match.svg`), then run `npm run extract-icon-paths` to regenerate the typed icon data.
