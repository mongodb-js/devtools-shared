import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect } from 'chai';
import { StageIcon, stageIcons, aggregationStageNames } from './';

describe('aggregation-stage-icons', function () {
  it('exposes a well-formed svg string for every stage', function () {
    expect(aggregationStageNames).to.include('$match');
    for (const name of aggregationStageNames) {
      expect(stageIcons[name]).to.match(/^<svg[\s\S]+<\/svg>$/);
      expect(stageIcons[name]).to.include('fill="currentColor"');
    }
  });

  it('excludes export artifacts and normalizes names', function () {
    expect(aggregationStageNames).to.include('$searchMeta');
    expect(aggregationStageNames).to.not.include('$sort-1');
    expect(aggregationStageNames).to.not.include('$searchMeta 3');
  });

  it('renders a StageIcon defaulting to size 16 and currentColor', function () {
    const html = renderToStaticMarkup(<StageIcon stage="$match" />);
    expect(html).to.include('<svg');
    expect(html).to.include('<path');
    expect(html).to.include('width="16"');
    expect(html).to.include('height="16"');
    expect(html).to.include('fill="currentColor"');
  });

  it('applies the size and color props', function () {
    const html = renderToStaticMarkup(
      <StageIcon stage="$group" size={24} color="red" />,
    );
    expect(html).to.include('width="24"');
    expect(html).to.include('height="24"');
    expect(html).to.include('fill="red"');
  });

  it('forwards other props to the underlying svg element', function () {
    const html = renderToStaticMarkup(
      <StageIcon stage="$group" className="my-icon" aria-label="group stage" />,
    );
    expect(html).to.include('class="my-icon"');
    expect(html).to.include('aria-label="group stage"');
  });
});
