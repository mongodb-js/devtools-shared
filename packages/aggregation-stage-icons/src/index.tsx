import React from 'react';
import { stageIconPaths } from './stage-icon-data';

export type AggregationStageName = keyof typeof stageIconPaths;

export const aggregationStageNames = Object.keys(
  stageIconPaths,
) as AggregationStageName[];

const VIEW_BOX = '0 0 24 24';

export const stageIcons = Object.fromEntries(
  Object.entries(stageIconPaths).map(([name, path]) => [
    name,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" fill="currentColor"><path d="${path}"/></svg>`,
  ]),
) as Record<AggregationStageName, string>;

export type StageIconProps = Omit<
  React.SVGProps<SVGSVGElement>,
  'children' | 'dangerouslySetInnerHTML' | 'width' | 'height' | 'fill' | 'color'
> & {
  stage: AggregationStageName;
  /** Width and height of the icon, in pixels. Defaults to 16. */
  size?: number | string;
  /** Fill color of the icon. Defaults to `currentColor`. */
  color?: string;
};

export const StageIcon = ({
  stage,
  size = 16,
  color = 'currentColor',
  ...props
}: StageIconProps): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={VIEW_BOX}
    {...props}
    width={size}
    height={size}
    fill={color}
  >
    <path d={stageIconPaths[stage]} />
  </svg>
);

export { stageIconPaths };
